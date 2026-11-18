#!/usr/bin/env node
import os from "os";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CLI arguments and environment variables
const args = process.argv.slice(2);
function getArg(flag, defaultVal) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1] !== undefined) {
    return args[idx + 1];
  }
  return defaultVal;
}

const INTERVAL_MS = parseInt(getArg("--interval", process.env.SAMPLE_INTERVAL_MS || "2000"), 10);
const DURATION_SEC = parseInt(getArg("--duration", process.env.DURATION_SECONDS || "0"), 10);
const LABEL = getArg("--label", process.env.TEST_LABEL || "run").replace(/[^a-zA-Z0-9_-]/g, "_");
const CONTAINER_FILTER = getArg("--containers", process.env.DOCKER_CONTAINERS || "neonbeat-backend,neonbeat-frontend");

const RESULTS_DIR = path.resolve(__dirname, "results");
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

const fileTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
const csvPath = path.join(RESULTS_DIR, `system-metrics-${LABEL}-${fileTimestamp}.csv`);
const jsonPath = path.join(RESULTS_DIR, `system-metrics-${LABEL}-${fileTimestamp}.json`);

function getCpuSnapshot() {
  return os.cpus().map((cpu) => {
    const times = cpu.times;
    const total = times.user + times.nice + times.sys + times.idle + times.irq;
    return { idle: times.idle, total };
  });
}

function computeCpuUsage(prev, curr) {
  const perCore = [];
  let totalIdleDelta = 0;
  let totalTickDelta = 0;

  for (let i = 0; i < curr.length; i++) {
    const p = prev[i] || curr[i];
    const c = curr[i];
    const idleDelta = Math.max(0, c.idle - p.idle);
    const tickDelta = Math.max(1, c.total - p.total);
    const usage = Math.min(100, Math.max(0, ((tickDelta - idleDelta) / tickDelta) * 100));
    perCore.push(Number(usage.toFixed(2)));
    totalIdleDelta += idleDelta;
    totalTickDelta += tickDelta;
  }

  const totalPercent =
    totalTickDelta > 0
      ? Number(
          Math.min(100, Math.max(0, ((totalTickDelta - totalIdleDelta) / totalTickDelta) * 100)).toFixed(2)
        )
      : 0;

  return { totalPercent, perCore };
}

function parseByteString(str) {
  if (!str || typeof str !== "string") return 0;
  const cleaned = str.trim();
  const match = /^([\d.]+)\s*([a-zA-Z]+)?$/.exec(cleaned);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  if (Number.isNaN(val)) return 0;
  const unit = (match[2] || "B").toUpperCase();
  const multipliers = {
    B: 1,
    KB: 1000,
    KIB: 1024,
    MB: 1000 * 1000,
    MIB: 1024 * 1024,
    GB: 1000 * 1000 * 1000,
    GIB: 1024 * 1024 * 1024,
  };
  return Math.round(val * (multipliers[unit] || 1));
}

async function sampleDockerMetrics() {
  try {
    const { stdout } = await execFileAsync(
      "docker",
      ["stats", "--no-stream", "--format", "{{json .}}"],
      { timeout: 3500 }
    );
    const lines = stdout
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const targets = new Set(
      CONTAINER_FILTER.split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );

    const containers = [];
    for (const line of lines) {
      try {
        const raw = JSON.parse(line);
        if (targets.size > 0 && !targets.has(raw.Name)) continue;

        const cpuPct = parseFloat(String(raw.CPUPerc || "0").replace("%", "")) || 0;
        const memParts = String(raw.MemUsage || "0B / 0B").split("/");
        const memUsedBytes = parseByteString(memParts[0]);
        const memLimitBytes = parseByteString(memParts[1]);
        const memPct = parseFloat(String(raw.MemPerc || "0").replace("%", "")) || 0;

        const netParts = String(raw.NetIO || "0B / 0B").split("/");
        const netRxBytes = parseByteString(netParts[0]);
        const netTxBytes = parseByteString(netParts[1]);

        const blockParts = String(raw.BlockIO || "0B / 0B").split("/");
        const blockReadBytes = parseByteString(blockParts[0]);
        const blockWriteBytes = parseByteString(blockParts[1]);

        containers.push({
          name: raw.Name,
          id: raw.ID,
          cpuPercent: cpuPct,
          memUsedBytes,
          memUsedMB: Number((memUsedBytes / (1024 * 1024)).toFixed(2)),
          memLimitBytes,
          memPercent: memPct,
          netRxBytes,
          netTxBytes,
          blockReadBytes,
          blockWriteBytes,
          pids: parseInt(raw.PIDs || "0", 10) || 0,
        });
      } catch {
        // Ignore unparseable line
      }
    }
    return containers;
  } catch {
    return [];
  }
}

let prevLinuxDisk = null;
let prevLinuxNet = null;
let prevLinuxTimeMs = Date.now();

async function sampleOsDiskAndNet() {
  const platform = os.platform();

  if (platform === "win32") {
    try {
      const psScript = `
        $disk = Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk -Filter "Name='_Total'" -ErrorAction SilentlyContinue
        $net = Get-CimInstance Win32_PerfFormattedData_Tcpip_NetworkInterface -ErrorAction SilentlyContinue | Measure-Object -Property BytesReceivedPersec, BytesSentPersec -Sum
        $nodeProcs = Get-Process -Name node -ErrorAction SilentlyContinue | Measure-Object -Property WorkingSet64 -Sum
        $rx = 0; $tx = 0;
        if ($net) {
          foreach ($m in $net) {
            if ($m.Property -eq 'BytesReceivedPersec') { $rx = [int64]$m.Sum }
            if ($m.Property -eq 'BytesSentPersec') { $tx = [int64]$m.Sum }
          }
        }
        [PSCustomObject]@{
          diskReadBytesPerSec = if ($disk) { [int64]$disk.DiskReadBytesPersec } else { 0 }
          diskWriteBytesPerSec = if ($disk) { [int64]$disk.DiskWriteBytesPersec } else { 0 }
          diskReadIops = if ($disk) { [int64]$disk.DiskReadsPersec } else { 0 }
          diskWriteIops = if ($disk) { [int64]$disk.DiskWritesPersec } else { 0 }
          diskTotalIops = if ($disk) { [int64]$disk.DiskTransfersPersec } else { 0 }
          netRxBytesPerSec = $rx
          netTxBytesPerSec = $tx
          nodeRssBytes = if ($nodeProcs -and $nodeProcs.Sum) { [int64]$nodeProcs.Sum } else { 0 }
        } | ConvertTo-Json -Compress
      `;
      const { stdout } = await execFileAsync(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-Command", psScript],
        { timeout: 3500 }
      );
      const parsed = JSON.parse(stdout.trim());
      return {
        diskReadBytesPerSec: parsed.diskReadBytesPerSec || 0,
        diskWriteBytesPerSec: parsed.diskWriteBytesPerSec || 0,
        diskReadIops: parsed.diskReadIops || 0,
        diskWriteIops: parsed.diskWriteIops || 0,
        diskTotalIops: parsed.diskTotalIops || 0,
        netRxBytesPerSec: parsed.netRxBytesPerSec || 0,
        netTxBytesPerSec: parsed.netTxBytesPerSec || 0,
        nodeRssMB: Number(((parsed.nodeRssBytes || 0) / (1024 * 1024)).toFixed(2)),
      };
    } catch {
      return {
        diskReadBytesPerSec: 0,
        diskWriteBytesPerSec: 0,
        diskReadIops: 0,
        diskWriteIops: 0,
        diskTotalIops: 0,
        netRxBytesPerSec: 0,
        netTxBytesPerSec: 0,
        nodeRssMB: Number((process.memoryUsage().rss / (1024 * 1024)).toFixed(2)),
      };
    }
  }

  // Linux / POSIX (/proc/diskstats & /proc/net/dev)
  const nowMs = Date.now();
  const elapsedSec = Math.max(0.1, (nowMs - prevLinuxTimeMs) / 1000);
  prevLinuxTimeMs = nowMs;

  let diskReadBytesPerSec = 0;
  let diskWriteBytesPerSec = 0;
  let diskReadIops = 0;
  let diskWriteIops = 0;

  try {
    if (fs.existsSync("/proc/diskstats")) {
      const content = fs.readFileSync("/proc/diskstats", "utf8");
      let readsCompleted = 0;
      let sectorsRead = 0;
      let writesCompleted = 0;
      let sectorsWritten = 0;

      for (const line of content.split("\n")) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 14) continue;
        const devName = parts[2];
        if (/^(loop|ram|sr|fd)/.test(devName)) continue;
        readsCompleted += parseInt(parts[3], 10) || 0;
        sectorsRead += parseInt(parts[5], 10) || 0;
        writesCompleted += parseInt(parts[7], 10) || 0;
        sectorsWritten += parseInt(parts[9], 10) || 0;
      }

      if (prevLinuxDisk) {
        diskReadIops = Math.max(0, Math.round((readsCompleted - prevLinuxDisk.readsCompleted) / elapsedSec));
        diskWriteIops = Math.max(0, Math.round((writesCompleted - prevLinuxDisk.writesCompleted) / elapsedSec));
        diskReadBytesPerSec = Math.max(0, Math.round(((sectorsRead - prevLinuxDisk.sectorsRead) * 512) / elapsedSec));
        diskWriteBytesPerSec = Math.max(0, Math.round(((sectorsWritten - prevLinuxDisk.sectorsWritten) * 512) / elapsedSec));
      }
      prevLinuxDisk = { readsCompleted, sectorsRead, writesCompleted, sectorsWritten };
    }
  } catch {
    // Ignore
  }

  let netRxBytesPerSec = 0;
  let netTxBytesPerSec = 0;

  try {
    if (fs.existsSync("/proc/net/dev")) {
      const content = fs.readFileSync("/proc/net/dev", "utf8");
      let rxBytes = 0;
      let txBytes = 0;
      for (const line of content.split("\n").slice(2)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("lo:")) continue;
        const parts = trimmed.replace(":", " ").trim().split(/\s+/);
        if (parts.length >= 10) {
          rxBytes += parseInt(parts[1], 10) || 0;
          txBytes += parseInt(parts[9], 10) || 0;
        }
      }
      if (prevLinuxNet) {
        netRxBytesPerSec = Math.max(0, Math.round((rxBytes - prevLinuxNet.rxBytes) / elapsedSec));
        netTxBytesPerSec = Math.max(0, Math.round((txBytes - prevLinuxNet.txBytes) / elapsedSec));
      }
      prevLinuxNet = { rxBytes, txBytes };
    }
  } catch {
    // Ignore
  }

  return {
    diskReadBytesPerSec,
    diskWriteBytesPerSec,
    diskReadIops,
    diskWriteIops,
    diskTotalIops: diskReadIops + diskWriteIops,
    netRxBytesPerSec,
    netTxBytesPerSec,
    nodeRssMB: Number((process.memoryUsage().rss / (1024 * 1024)).toFixed(2)),
  };
}

const samples = [];
let prevCpu = getCpuSnapshot();
const startTimeIso = new Date().toISOString();
const startEpochMs = Date.now();

const csvHeaders = [
  "timestamp",
  "epochMs",
  "cpuTotalPercent",
  "cpuPerCorePercent",
  "hostMemUsedMB",
  "hostMemTotalMB",
  "hostMemPercent",
  "residentMemoryMB",
  "diskReadBytesPerSec",
  "diskWriteBytesPerSec",
  "diskReadIops",
  "diskWriteIops",
  "diskTotalIops",
  "netRxBytesPerSec",
  "netTxBytesPerSec",
  "dockerBackendCpuPercent",
  "dockerBackendMemMB",
  "dockerBackendMemPercent",
  "dockerBackendNetRxBytes",
  "dockerBackendNetTxBytes",
  "dockerBackendBlockReadBytes",
  "dockerBackendBlockWriteBytes",
];

fs.writeFileSync(csvPath, csvHeaders.join(",") + "\n", "utf8");

console.log(`[Measurements] Iniciando recolección de métricas (etiqueta="${LABEL}", intervalo=${INTERVAL_MS}ms)`);
console.log(`[Measurements] Archivo CSV:  ${csvPath}`);
console.log(`[Measurements] Archivo JSON: ${jsonPath}`);

let isShuttingDown = false;

function saveJsonReport() {
  const report = {
    label: LABEL,
    startedAt: startTimeIso,
    endedAt: new Date().toISOString(),
    sampleIntervalMs: INTERVAL_MS,
    totalSamples: samples.length,
    hostInfo: {
      platform: os.platform(),
      arch: os.arch(),
      cpuCores: os.cpus().length,
      cpuModel: os.cpus()[0]?.model || "unknown",
      totalMemoryMB: Number((os.totalmem() / (1024 * 1024)).toFixed(2)),
    },
    samples,
  };
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
}

async function collectSample() {
  if (isShuttingDown) return;

  const now = new Date();
  const timestamp = now.toISOString();
  const epochMs = now.getTime();

  const currCpu = getCpuSnapshot();
  const cpuMetrics = computeCpuUsage(prevCpu, currCpu);
  prevCpu = currCpu;

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const hostMemUsedMB = Number((usedMem / (1024 * 1024)).toFixed(2));
  const hostMemTotalMB = Number((totalMem / (1024 * 1024)).toFixed(2));
  const hostMemPercent = Number(((usedMem / totalMem) * 100).toFixed(2));

  const [osIo, dockerContainers] = await Promise.all([
    sampleOsDiskAndNet(),
    sampleDockerMetrics(),
  ]);

  const backendContainer =
    dockerContainers.find((c) => c.name.includes("backend")) || dockerContainers[0] || null;

  const residentMemoryMB = backendContainer
    ? backendContainer.memUsedMB
    : osIo.nodeRssMB;

  const sample = {
    timestamp,
    epochMs,
    cpuTotalPercent: cpuMetrics.totalPercent,
    cpuPerCorePercent: cpuMetrics.perCore,
    hostMemUsedMB,
    hostMemTotalMB,
    hostMemPercent,
    residentMemoryMB,
    diskReadBytesPerSec: osIo.diskReadBytesPerSec,
    diskWriteBytesPerSec: osIo.diskWriteBytesPerSec,
    diskReadIops: osIo.diskReadIops,
    diskWriteIops: osIo.diskWriteIops,
    diskTotalIops: osIo.diskTotalIops,
    netRxBytesPerSec: osIo.netRxBytesPerSec,
    netTxBytesPerSec: osIo.netTxBytesPerSec,
    dockerContainers,
  };

  samples.push(sample);

  const csvRow = [
    timestamp,
    epochMs,
    cpuMetrics.totalPercent,
    `"${cpuMetrics.perCore.join("|")}"`,
    hostMemUsedMB,
    hostMemTotalMB,
    hostMemPercent,
    residentMemoryMB,
    osIo.diskReadBytesPerSec,
    osIo.diskWriteBytesPerSec,
    osIo.diskReadIops,
    osIo.diskWriteIops,
    osIo.diskTotalIops,
    osIo.netRxBytesPerSec,
    osIo.netTxBytesPerSec,
    backendContainer ? backendContainer.cpuPercent : 0,
    backendContainer ? backendContainer.memUsedMB : 0,
    backendContainer ? backendContainer.memPercent : 0,
    backendContainer ? backendContainer.netRxBytes : 0,
    backendContainer ? backendContainer.netTxBytes : 0,
    backendContainer ? backendContainer.blockReadBytes : 0,
    backendContainer ? backendContainer.blockWriteBytes : 0,
  ].join(",");

  fs.appendFileSync(csvPath, csvRow + "\n", "utf8");
  saveJsonReport();

  if (DURATION_SEC > 0 && (Date.now() - startEpochMs) / 1000 >= DURATION_SEC) {
    finishAndExit();
  }
}

function finishAndExit() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  saveJsonReport();
  console.log(`\n[Measurements] Finalizado (${samples.length} muestras guardadas).`);
  process.exit(0);
}

process.on("SIGINT", finishAndExit);
process.on("SIGTERM", finishAndExit);

async function runLoop() {
  // Initial 200ms window so the very first sample has an accurate CPU tick delta
  await new Promise((r) => setTimeout(r, 200));
  while (!isShuttingDown) {
    const iterStart = Date.now();
    await collectSample();
    if (isShuttingDown) break;
    const elapsed = Date.now() - iterStart;
    const waitMs = Math.max(100, INTERVAL_MS - elapsed);
    await new Promise((r) => setTimeout(r, waitMs));
  }
}

runLoop();

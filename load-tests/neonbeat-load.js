import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("neonbeat_error_rate");
const catalogLatency = new Trend("neonbeat_catalog_latency_ms", true);
const streamRangeLatency = new Trend("neonbeat_stream_range_latency_ms", true);
const playRegisterLatency = new Trend("neonbeat_play_register_latency_ms", true);
const rangeRequestsCounter = new Counter("neonbeat_range_requests_total");

// Configurable environment variables
const BASE_URL = (__ENV.BASE_URL || "http://localhost:3001").replace(/\/+$/, "");
const SCENARIO = (__ENV.SCENARIO || "sustained").toLowerCase();
const DURATION = __ENV.DURATION || "5m";
const VUS = parseInt(__ENV.VUS || "15", 10);
const MAX_VUS = parseInt(__ENV.MAX_VUS || "80", 10);
const RANGE_CHUNK_BYTES = parseInt(__ENV.RANGE_CHUNK_BYTES || "65536", 10); // 64 KB per chunk
const SUMMARY_FILE = __ENV.SUMMARY_FILE || `measurements/results/k6-${SCENARIO}-summary.json`;

function buildScenarios() {
  if (SCENARIO === "baseline") {
    // 1. Línea base con 1 usuario virtual (mínimo 5 minutos por defecto)
    return {
      baseline_single_user: {
        executor: "constant-vus",
        vus: 1,
        duration: DURATION,
      },
    };
  }

  if (SCENARIO === "ramp" || SCENARIO === "saturation") {
    // 3. Aumento gradual hasta saturación (duración total >= 5 minutos)
    return {
      gradual_ramp_saturation: {
        executor: "ramping-vus",
        startVUs: 1,
        stages: [
          { duration: __ENV.STAGE_1_DURATION || "1m", target: Math.max(5, Math.floor(MAX_VUS * 0.2)) },
          { duration: __ENV.STAGE_2_DURATION || "1m30s", target: Math.max(15, Math.floor(MAX_VUS * 0.5)) },
          { duration: __ENV.STAGE_3_DURATION || "1m30s", target: Math.max(30, Math.floor(MAX_VUS * 0.8)) },
          { duration: __ENV.STAGE_4_DURATION || "1m", target: MAX_VUS },
          { duration: __ENV.STAGE_5_DURATION || "30s", target: 0 },
        ],
        gracefulRampDown: "15s",
      },
    };
  }

  // 2. Carga sostenida (por defecto, mínimo 5 minutos)
  return {
    sustained_load: {
      executor: "constant-vus",
      vus: VUS,
      duration: DURATION,
    },
  };
}

export const options = {
  scenarios: buildScenarios(),
  summaryTrendStats: ["avg", "min", "med", "max", "p(50)", "p(90)", "p(95)", "p(99)"],
  thresholds: {
    http_req_failed: ["rate<0.05"],
    neonbeat_error_rate: ["rate<0.05"],
    http_req_duration: ["p(50)<250", "p(95)<800", "p(99)<1500"],
    neonbeat_catalog_latency_ms: ["p(95)<500"],
    neonbeat_stream_range_latency_ms: ["p(95)<600"],
    neonbeat_play_register_latency_ms: ["p(95)<500"],
  },
};

/**
 * Generates a valid PCM WAV binary payload if the database has no tracks yet.
 */
function generateSampleWavBytes(numSamples = 44100): Uint8Array {
  const bytesPerSample = 2;
  const dataSize = numSamples * bytesPerSample;
  const buf = new Uint8Array(44 + dataSize);
  const view = new DataView(buf.buffer);

  // "RIFF"
  buf[0] = 0x52; buf[1] = 0x49; buf[2] = 0x46; buf[3] = 0x46;
  view.setUint32(4, 36 + dataSize, true);
  // "WAVE"
  buf[8] = 0x57; buf[9] = 0x41; buf[10] = 0x56; buf[11] = 0x45;
  // "fmt "
  buf[12] = 0x66; buf[13] = 0x6d; buf[14] = 0x74; buf[15] = 0x20;
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 22050, true);
  view.setUint32(28, 22050 * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  // "data"
  buf[36] = 0x64; buf[37] = 0x61; buf[38] = 0x74; buf[39] = 0x61;
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    const sample = Math.round(Math.sin((2 * Math.PI * 440 * i) / 22050) * 12000);
    view.setInt16(44 + i * 2, sample, true);
  }
  return buf;
}

export function setup() {
  const startTimeIso = new Date().toISOString();
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    "health check is 200": (r) => r.status === 200,
  });

  const tracksRes = http.get(`${BASE_URL}/api/tracks`);
  let tracks = [];
  try {
    tracks = tracksRes.json() || [];
  } catch {
    tracks = [];
  }

  if (!Array.isArray(tracks) || tracks.length === 0) {
    const wavBytes = generateSampleWavBytes(66150); // ~132 KB
    const uploadData = {
      files: http.file(wavBytes.buffer, "01 - NeonBeat LoadTest - Synthwave Pulse.wav", "audio/wav"),
    };
    const uploadRes = http.post(`${BASE_URL}/api/tracks`, uploadData);
    check(uploadRes, {
      "seed track uploaded (201)": (r) => r.status === 201,
    });
  }

  return { startTimeIso };
}

export default function () {
  let tracks = [];

  // 1. Consultar el catálogo
  group("1. Consultar catalogo", () => {
    const res = http.get(`${BASE_URL}/api/tracks`, {
      tags: { endpoint: "list_tracks" },
    });
    catalogLatency.add(res.timings.duration);

    const ok = check(res, {
      "GET /api/tracks status 200": (r) => r.status === 200,
      "GET /api/tracks returns non-empty array": (r) => {
        try {
          const body = r.json();
          tracks = Array.isArray(body) ? body : body.tracks || [];
          return tracks.length > 0;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!ok);
  });

  if (!tracks || tracks.length === 0) {
    sleep(1);
    return;
  }

  // 2. Seleccionar una pista aleatoria del catálogo
  const selectedTrack = tracks[Math.floor(Math.random() * tracks.length)];
  const trackId = selectedTrack.id;
  const totalBytes = selectedTrack.sizeBytes || selectedTrack.size || 65536;

  // Pausa breve simulando selección del usuario en la interfaz
  sleep(0.5 + Math.random() * 0.8);

  // 3. Registrar inicio de reproducción
  group("2. Registrar reproduccion", () => {
    const playPayload = JSON.stringify({ positionSeconds: 0 });
    const playRes = http.post(`${BASE_URL}/api/tracks/${trackId}/play`, playPayload, {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "register_play" },
    });
    playRegisterLatency.add(playRes.timings.duration);

    const ok = check(playRes, {
      "POST /api/tracks/:id/play status 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  // 4. Solicitar fragmentos de audio mediante HTTP Range (evitando descargar siempre el archivo completo)
  group("3. Streaming parcial con HTTP Range", () => {
    const chunksToFetch = 2 + Math.floor(Math.random() * 2); // 2 or 3 buffered chunks
    const maxChunkSize = Math.min(RANGE_CHUNK_BYTES, Math.max(1024, Math.floor(totalBytes / 2)));

    for (let c = 0; c < chunksToFetch; c++) {
      const startOffset = Math.min(
        Math.max(0, totalBytes - 512),
        c * maxChunkSize
      );
      const endOffset = Math.min(totalBytes - 1, startOffset + maxChunkSize - 1);

      const streamRes = http.get(`${BASE_URL}/api/tracks/${trackId}/stream`, {
        headers: {
          Range: `bytes=${startOffset}-${endOffset}`,
        },
        tags: { endpoint: "stream_range" },
      });

      streamRangeLatency.add(streamRes.timings.duration);
      rangeRequestsCounter.add(1);

      const ok = check(streamRes, {
        "GET /stream Range status 206": (r) => r.status === 206,
        "GET /stream includes Accept-Ranges: bytes": (r) =>
          (r.headers["Accept-Ranges"] || r.headers["accept-ranges"]) === "bytes",
        "GET /stream includes Content-Range": (r) =>
          Boolean(r.headers["Content-Range"] || r.headers["content-range"]),
      });
      errorRate.add(!ok);

      // Pausa realista de escucha mientras el buffer reproduce el fragmento
      sleep(1.0 + Math.random() * 1.5);
    }
  });

  // 5. Registrar evento de reproducción (seek o pause) y pausa realista entre canciones
  group("4. Evento de reproduccion (seek/pause)", () => {
    const eventPayload = JSON.stringify({
      trackId,
      eventType: Math.random() > 0.5 ? "seek" : "pause",
      positionSeconds: Math.round((Math.random() * 30 + 2) * 10) / 10,
    });

    const evtRes = http.post(`${BASE_URL}/api/playback-events`, eventPayload, {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "playback_event" },
    });

    const ok = check(evtRes, {
      "POST /api/playback-events status 201": (r) => r.status === 201,
    });
    errorRate.add(!ok);
  });

  // Pausa realista antes de la siguiente interacción del usuario
  sleep(1.0 + Math.random() * 2.0);
}

export function handleSummary(data) {
  const endTimeIso = new Date().toISOString();
  const durationSec = (data.state?.testRunDurationMs || 0) / 1000;

  const reqsMetric = data.metrics?.http_reqs?.values || {};
  const failedMetric = data.metrics?.http_req_failed?.values || {};
  const durationMetric = data.metrics?.http_req_duration?.values || {};
  const dataRecvMetric = data.metrics?.data_received?.values || {};
  const dataSentMetric = data.metrics?.data_sent?.values || {};

  const summaryReport = {
    scenario: SCENARIO,
    baseUrl: BASE_URL,
    completedAt: endTimeIso,
    testRunDurationSeconds: durationSec,
    metrics: {
      requestsTotal: reqsMetric.count || 0,
      requestsPerSecond: reqsMetric.rate || 0,
      errorRate: failedMetric.rate || 0,
      latencyMs: {
        avg: durationMetric.avg || 0,
        min: durationMetric.min || 0,
        p50: durationMetric["p(50)"] ?? durationMetric.med ?? 0,
        p90: durationMetric["p(90)"] ?? 0,
        p95: durationMetric["p(95)"] ?? 0,
        p99: durationMetric["p(99)"] ?? 0,
        max: durationMetric.max || 0,
      },
      bytesReceivedTotal: dataRecvMetric.count || 0,
      throughputBytesPerSecond: dataRecvMetric.rate || 0,
      bytesSentTotal: dataSentMetric.count || 0,
    },
  };

  const outputs = {
    stdout: JSON.stringify(summaryReport, null, 2) + "\n",
  };

  if (SUMMARY_FILE) {
    outputs[SUMMARY_FILE] = JSON.stringify(summaryReport, null, 2);
  }

  return outputs;
}

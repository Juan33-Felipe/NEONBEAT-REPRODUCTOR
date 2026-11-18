import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getPrismaClient, disconnectPrisma } from "./prisma";
import { getConfig } from "./config";

function generatePlayableWav(
  durationSeconds: number,
  freqHz: number,
  sampleRate = 22050
): Buffer {
  const numSamples = Math.floor(durationSeconds * sampleRate);
  const bytesPerSample = 2;
  const dataSize = numSamples * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * bytesPerSample, 28);
  buffer.writeUInt16LE(bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, t * 4) * Math.max(0.15, 1 - t / (durationSeconds * 1.1));
    const wave =
      Math.sin(2 * Math.PI * freqHz * t) * 0.6 +
      Math.sin(2 * Math.PI * (freqHz * 1.5) * t) * 0.25 +
      Math.sin(2 * Math.PI * (freqHz * 0.5) * t) * 0.15;
    const sample = Math.round(wave * envelope * 18000);
    buffer.writeInt16LE(sample, 44 + i * 2);
  }

  return buffer;
}

const SAMPLE_TRACKS = [
  {
    title: "Cyber Neon Horizon",
    artist: "NeonBeat Synth",
    fileName: "01 - NeonBeat Synth - Cyber Neon Horizon.wav",
    freq: 220,
    duration: 6,
    favorite: true,
  },
  {
    title: "Midnight Shadow Drive",
    artist: "Lunar Echo",
    fileName: "02 - Lunar Echo - Midnight Shadow Drive.wav",
    freq: 261.63,
    duration: 6,
    favorite: false,
  },
  {
    title: "Ocean Wave Chill",
    artist: "Aqua Pulse",
    fileName: "03 - Aqua Pulse - Ocean Wave Chill.wav",
    freq: 329.63,
    duration: 6,
    favorite: true,
  },
  {
    title: "Solar Fire Overdrive",
    artist: "Ignis Core",
    fileName: "04 - Ignis Core - Solar Fire Overdrive.wav",
    freq: 392.0,
    duration: 6,
    favorite: false,
  },
];

async function main() {
  const config = getConfig();
  const prisma = getPrismaClient();

  if (!fs.existsSync(config.storageDir)) {
    fs.mkdirSync(config.storageDir, { recursive: true });
  }

  const existingCount = await prisma.track.count();
  if (existingCount > 0) {
    console.log(`[Seed] El catálogo ya contiene ${existingCount} pistas. Omitiendo seed.`);
    await disconnectPrisma();
    return;
  }

  for (const item of SAMPLE_TRACKS) {
    const wavBuffer = generatePlayableWav(item.duration, item.freq);
    const storageFileName = `${crypto.randomUUID()}.wav`;
    const fullPath = path.join(config.storageDir, storageFileName);
    await fs.promises.writeFile(fullPath, wavBuffer);

    await prisma.track.create({
      data: {
        title: item.title,
        artist: item.artist,
        fileName: item.fileName,
        mimeType: "audio/wav",
        format: "WAV",
        sizeBytes: wavBuffer.length,
        storagePath: storageFileName,
        favorite: item.favorite,
        playCount: 0,
      },
    });
  }

  console.log(`[Seed] Se crearon ${SAMPLE_TRACKS.length} pistas de prueba en ${config.storageDir}`);
  await disconnectPrisma();
}

main().catch(async (err) => {
  console.error("[Seed] Error:", err);
  await disconnectPrisma();
  process.exit(1);
});

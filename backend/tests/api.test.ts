import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { createApp } from "../src/app";
import { disconnectPrisma, getPrismaClient } from "../src/prisma";

const TEST_DIR = path.resolve(__dirname, ".tmp-test-data");
const TEST_STORAGE_DIR = path.join(TEST_DIR, "audio");
const TEST_DB_PATH = path.join(TEST_DIR, "test.db");

/**
 * Generates a valid 16-bit PCM WAV buffer with a 440Hz sine wave.
 */
function createValidWavBuffer(durationSeconds = 0.25, sampleRate = 8000): Buffer {
  const numSamples = Math.floor(durationSeconds * sampleRate);
  const bytesPerSample = 2;
  const dataSize = numSamples * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // AudioFormat = 1 (PCM)
  buffer.writeUInt16LE(1, 22); // NumChannels = 1
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * bytesPerSample, 28);
  buffer.writeUInt16LE(bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample = 16
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.round(Math.sin(2 * Math.PI * 440 * t) * 16000);
    buffer.writeInt16LE(sample, 44 + i * 2);
  }

  return buffer;
}

describe("NeonBeat Backend API Automated Tests", () => {
  let app = createApp();
  let createdTrackId = "";
  let secondTrackId = "";
  const sampleWav = createValidWavBuffer(0.5, 8000); // ~8044 bytes

  beforeAll(async () => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_STORAGE_DIR, { recursive: true });

    process.env.DATABASE_URL = `file:${TEST_DB_PATH}`;
    process.env.STORAGE_DIR = TEST_STORAGE_DIR;
    process.env.MAX_FILE_SIZE_BYTES = String(5 * 1024 * 1024);

    // Push Prisma schema to the isolated test SQLite database
    execSync("npx prisma db push --skip-generate", {
      cwd: path.resolve(__dirname, ".."),
      env: {
        ...process.env,
        DATABASE_URL: `file:${TEST_DB_PATH}`,
      },
      stdio: "pipe",
    });

    await disconnectPrisma();
    app = createApp();
  });

  afterAll(async () => {
    await disconnectPrisma();
    if (fs.existsSync(TEST_DIR)) {
      try {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
      } catch {
        // Ignore cleanup lock on Windows
      }
    }
  });

  it("1. Health check: GET /api/health returns 200 and connected status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.database).toBe("connected");
    expect(res.body.storage).toBe("ready");
  });

  it("2. Crear y listar pistas: POST /api/tracks uploads audio files and GET /api/tracks lists them", async () => {
    const uploadRes = await request(app)
      .post("/api/tracks")
      .attach("files", sampleWav, {
        filename: "01 - Daft Punk - Nightvision Cyber.wav",
        contentType: "audio/wav",
      })
      .attach("files", sampleWav, {
        filename: "02 - Kavinsky - Nightcall.mp3",
        contentType: "audio/mpeg",
      });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.count).toBe(2);
    expect(Array.isArray(uploadRes.body.tracks)).toBe(true);

    const first = uploadRes.body.tracks[0];
    const second = uploadRes.body.tracks[1];
    createdTrackId = first.id;
    secondTrackId = second.id;

    expect(first.title).toBe("Nightvision Cyber");
    expect(first.artist).toBe("Daft Punk");
    expect(first.format).toBe("WAV");
    expect(first.sizeBytes).toBe(sampleWav.length);
    expect(first.favorite).toBe(false);
    expect(first.playCount).toBe(0);

    // Verify list endpoint
    const listRes = await request(app).get("/api/tracks");
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.length).toBe(2);

    // Verify GET by ID
    const detailRes = await request(app).get(`/api/tracks/${createdTrackId}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.id).toBe(createdTrackId);
    expect(detailRes.body.title).toBe("Nightvision Cyber");
  });

  it("3. Editar favoritos y metadatos: PATCH /api/tracks/:id updates favorite, title, and artist", async () => {
    const patchRes = await request(app)
      .patch(`/api/tracks/${createdTrackId}`)
      .send({
        favorite: true,
        title: "Nightvision Cyber (Remastered)",
        artist: "Daft Punk Official",
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.favorite).toBe(true);
    expect(patchRes.body.title).toBe("Nightvision Cyber (Remastered)");
    expect(patchRes.body.artist).toBe("Daft Punk Official");

    // Verify filtering by favorite
    const favList = await request(app).get("/api/tracks?favorite=true");
    expect(favList.status).toBe(200);
    expect(favList.body.length).toBe(1);
    expect(favList.body[0].id).toBe(createdTrackId);
  });

  it("4. Rechazar archivos no permitidos: POST /api/tracks rejects non-audio extensions and MIME types", async () => {
    const invalidTxt = Buffer.from("malicious script content", "utf-8");

    const resTxt = await request(app)
      .post("/api/tracks")
      .attach("files", invalidTxt, {
        filename: "malware.exe",
        contentType: "application/x-msdownload",
      });

    expect(resTxt.status).toBe(400);
    expect(resTxt.body.error).toBe("INVALID_FILE_TYPE");

    // Also reject spoofed extension with disallowed MIME type
    const resSpoofedMime = await request(app)
      .post("/api/tracks")
      .attach("files", invalidTxt, {
        filename: "fake.mp3",
        contentType: "text/html",
      });

    expect(resSpoofedMime.status).toBe(400);
    expect(resSpoofedMime.body.error).toBe("INVALID_FILE_TYPE");

    // Ensure catalog still only has the 2 valid tracks
    const listRes = await request(app).get("/api/tracks");
    expect(listRes.body.length).toBe(2);
  });

  it("5. Streaming completo: GET /api/tracks/:id/stream returns 200 OK with full audio stream", async () => {
    const res = await request(app)
      .get(`/api/tracks/${createdTrackId}/stream`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers["accept-ranges"]).toBe("bytes");
    expect(res.headers["content-type"]).toContain("audio/wav");
    expect(Number(res.headers["content-length"])).toBe(sampleWav.length);
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.length).toBe(sampleWav.length);
    expect(res.body.equals(sampleWav)).toBe(true);
  });

  it("6. Streaming con Range: GET /api/tracks/:id/stream returns 206 Partial Content and 416 on invalid ranges", async () => {
    const start = 100;
    const end = 1099;
    const expectedLength = end - start + 1;

    const rangeRes = await request(app)
      .get(`/api/tracks/${createdTrackId}/stream`)
      .set("Range", `bytes=${start}-${end}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      });

    expect(rangeRes.status).toBe(206);
    expect(rangeRes.headers["accept-ranges"]).toBe("bytes");
    expect(rangeRes.headers["content-range"]).toBe(
      `bytes ${start}-${end}/${sampleWav.length}`
    );
    expect(Number(rangeRes.headers["content-length"])).toBe(expectedLength);
    expect(rangeRes.body.length).toBe(expectedLength);
    expect(rangeRes.body.equals(sampleWav.subarray(start, end + 1))).toBe(true);

    // Invalid range (start >= totalSize) -> 416 Range Not Satisfiable
    const invalidRangeRes = await request(app)
      .get(`/api/tracks/${createdTrackId}/stream`)
      .set("Range", `bytes=${sampleWav.length + 500}-${sampleWav.length + 1000}`);

    expect(invalidRangeRes.status).toBe(416);
    expect(invalidRangeRes.headers["content-range"]).toBe(`bytes */${sampleWav.length}`);

    // Malformed range (start > end) -> 416 Range Not Satisfiable
    const reversedRangeRes = await request(app)
      .get(`/api/tracks/${createdTrackId}/stream`)
      .set("Range", "bytes=500-100");

    expect(reversedRangeRes.status).toBe(416);
  });

  it("7. Incremento del contador de reproducciones y eventos: POST /api/tracks/:id/play and POST /api/playback-events", async () => {
    const play1 = await request(app)
      .post(`/api/tracks/${createdTrackId}/play`)
      .send({ positionSeconds: 0 });
    expect(play1.status).toBe(200);
    expect(play1.body.playCount).toBe(1);

    const play2 = await request(app)
      .post(`/api/tracks/${createdTrackId}/play`)
      .send({ positionSeconds: 0 });
    expect(play2.status).toBe(200);
    expect(play2.body.playCount).toBe(2);

    const eventRes = await request(app)
      .post("/api/playback-events")
      .send({
        trackId: createdTrackId,
        eventType: "seek",
        positionSeconds: 12.5,
      });
    expect(eventRes.status).toBe(201);
    expect(eventRes.body.eventType).toBe("seek");
    expect(eventRes.body.positionSeconds).toBe(12.5);

    const statsRes = await request(app).get("/api/stats");
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.totalTracks).toBe(2);
    expect(statsRes.body.totalPlays).toBe(2);
    expect(statsRes.body.totalSizeBytes).toBe(sampleWav.length * 2);
  });

  it("8. Eliminar pistas: DELETE /api/tracks/:id removes database record and audio file from disk", async () => {
    const detailBefore = await request(app).get(`/api/tracks/${secondTrackId}`);
    expect(detailBefore.status).toBe(200);
    const storageFile = path.join(TEST_STORAGE_DIR, detailBefore.body.storagePath);
    expect(fs.existsSync(storageFile)).toBe(true);

    const delRes = await request(app).delete(`/api/tracks/${secondTrackId}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.deleted).toBe(true);

    // Physical file must be deleted
    expect(fs.existsSync(storageFile)).toBe(false);

    // Record must return 404
    const detailAfter = await request(app).get(`/api/tracks/${secondTrackId}`);
    expect(detailAfter.status).toBe(404);
  });

  it("9. Persistencia después de reiniciar el backend: catalog, favorites, and playCount survive restart", async () => {
    // Simulate full backend restart by disconnecting Prisma and creating a fresh app instance
    await disconnectPrisma();
    const restartedApp = createApp();
    const freshPrisma = getPrismaClient();
    expect(freshPrisma).toBeDefined();

    const listAfterRestart = await request(restartedApp).get("/api/tracks");
    expect(listAfterRestart.status).toBe(200);
    expect(listAfterRestart.body.length).toBe(1);

    const persistedTrack = listAfterRestart.body[0];
    expect(persistedTrack.id).toBe(createdTrackId);
    expect(persistedTrack.title).toBe("Nightvision Cyber (Remastered)");
    expect(persistedTrack.artist).toBe("Daft Punk Official");
    expect(persistedTrack.favorite).toBe(true);
    expect(persistedTrack.playCount).toBe(2);

    // Ensure streaming still works after restart
    const streamAfterRestart = await request(restartedApp)
      .get(`/api/tracks/${createdTrackId}/stream`)
      .set("Range", "bytes=0-255");
    expect(streamAfterRestart.status).toBe(206);
  });
});

import path from "path";
import dotenv from "dotenv";

dotenv.config();

export interface AppConfig {
  port: number;
  databaseUrl: string;
  storageDir: string;
  maxFileSizeBytes: number;
  corsOrigin: string;
}

export function getConfig(): AppConfig {
  const port = parseInt(process.env.PORT || "3001", 10);
  const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
  const backendRoot = path.resolve(__dirname, "..");
  const rawStorageDir = process.env.STORAGE_DIR || "./storage/audio";
  const storageDir = path.isAbsolute(rawStorageDir)
    ? rawStorageDir
    : path.resolve(backendRoot, rawStorageDir);

  const maxMb = process.env.MAX_FILE_SIZE_MB
    ? parseFloat(process.env.MAX_FILE_SIZE_MB) * 1024 * 1024
    : undefined;
  const maxFileSizeBytes = parseInt(
    process.env.MAX_FILE_SIZE_BYTES || String(maxMb || 50 * 1024 * 1024),
    10
  );

  const corsOrigin = process.env.CORS_ORIGIN || "*";

  return {
    port: Number.isNaN(port) ? 3001 : port,
    databaseUrl,
    storageDir,
    maxFileSizeBytes: Number.isNaN(maxFileSizeBytes) ? 50 * 1024 * 1024 : maxFileSizeBytes,
    corsOrigin,
  };
}

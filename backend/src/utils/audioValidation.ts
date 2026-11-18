import path from "path";
import fs from "fs";

export const ALLOWED_EXTENSIONS: Record<string, { format: string; mimeType: string }> = {
  ".mp3": { format: "MP3", mimeType: "audio/mpeg" },
  ".wav": { format: "WAV", mimeType: "audio/wav" },
  ".ogg": { format: "OGG", mimeType: "audio/ogg" },
  ".flac": { format: "FLAC", mimeType: "audio/flac" },
  ".aac": { format: "AAC", mimeType: "audio/aac" },
  ".m4a": { format: "M4A", mimeType: "audio/mp4" },
  ".opus": { format: "OPUS", mimeType: "audio/opus" },
  ".webm": { format: "WEBM", mimeType: "audio/webm" },
};

export const ALLOWED_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/ogg",
  "application/ogg",
  "audio/flac",
  "audio/x-flac",
  "audio/aac",
  "audio/aacp",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "video/mp4",
  "audio/opus",
  "audio/webm",
  "video/webm",
  "application/octet-stream",
]);

export function sanitizeFileName(rawName: string): string {
  // Decode UTF-8 if Latin1-encoded by multer
  let decoded = rawName;
  try {
    if (/[\u0080-\u00ff]/.test(rawName)) {
      const buf = Buffer.from(rawName, "latin1");
      const utf8 = buf.toString("utf8");
      if (!utf8.includes("\ufffd")) {
        decoded = utf8;
      }
    }
  } catch {
    // Keep original if decoding fails
  }

  // Extract basename only (prevent directory traversal in filename)
  const base = path.basename(decoded.replace(/\\/g, "/"));

  // Remove control characters, null bytes, and dangerous symbols
  const cleaned = base
    .replace(/[\x00-\x1f\x80-\x9f]/g, "")
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\.{2,}/g, ".")
    .trim();

  return cleaned || "audio_track.mp3";
}

export function isValidAudioFile(originalName: string, reportedMimeType: string): {
  valid: boolean;
  ext: string;
  format: string;
  canonicalMimeType: string;
  reason?: string;
} {
  const sanitized = sanitizeFileName(originalName);
  const ext = path.extname(sanitized).toLowerCase();
  const extInfo = ALLOWED_EXTENSIONS[ext];

  if (!extInfo) {
    return {
      valid: false,
      ext,
      format: "",
      canonicalMimeType: "",
      reason: `Formato de archivo no permitido (${ext || "sin extensión"}). Formatos aceptados: MP3, WAV, OGG, FLAC, AAC, M4A, OPUS, WEBM.`,
    };
  }

  const normalizedMime = (reportedMimeType || "").toLowerCase().split(";")[0].trim();
  const isMimeAllowed =
    ALLOWED_MIME_TYPES.has(normalizedMime) || normalizedMime.startsWith("audio/");

  if (!isMimeAllowed) {
    return {
      valid: false,
      ext,
      format: "",
      canonicalMimeType: "",
      reason: `Tipo MIME no permitido (${normalizedMime}). Solo se aceptan archivos de audio válidos.`,
    };
  }

  return {
    valid: true,
    ext,
    format: extInfo.format,
    canonicalMimeType:
      normalizedMime.startsWith("audio/") && normalizedMime !== "audio/mp3"
        ? normalizedMime
        : extInfo.mimeType,
  };
}

export function parseTrackMetadataFromFileName(fileName: string): {
  title: string;
  artist: string;
  format: string;
} {
  const sanitized = sanitizeFileName(fileName);
  const ext = path.extname(sanitized).toLowerCase();
  const format = ALLOWED_EXTENSIONS[ext]?.format || ext.replace(".", "").toUpperCase() || "AUDIO";
  const baseName = path.basename(sanitized, path.extname(sanitized)).trim();

  // Clean leading track number like "01 - " or "01. "
  const cleaned = baseName.replace(/^\d{1,3}\s*[-._]\s*/, "");
  const parts = cleaned.split(/\s+-\s+/);

  if (parts.length >= 2) {
    const artist = parts[0].trim();
    const title = parts.slice(1).join(" - ").trim();
    return {
      title: title || cleaned || "Sin título",
      artist: artist || "Artista Local",
      format,
    };
  }

  return {
    title: cleaned || baseName || "Sin título",
    artist: "Biblioteca Local",
    format,
  };
}

export function resolveSafeStoragePath(storageDir: string, storageFileName: string): string | null {
  if (!storageFileName || typeof storageFileName !== "string") return null;
  if (
    storageFileName.includes("..") ||
    storageFileName.includes("/") ||
    storageFileName.includes("\\") ||
    storageFileName.includes("\0")
  ) {
    return null;
  }

  const resolvedDir = path.resolve(storageDir);
  const resolvedFile = path.resolve(resolvedDir, storageFileName);

  const dirWithSep = resolvedDir.endsWith(path.sep) ? resolvedDir : resolvedDir + path.sep;
  if (!resolvedFile.startsWith(dirWithSep)) {
    return null;
  }

  return resolvedFile;
}

export async function safeDeleteStorageFile(
  storageDir: string,
  storageFileName: string
): Promise<boolean> {
  const safePath = resolveSafeStoragePath(storageDir, storageFileName);
  if (!safePath) {
    return false;
  }
  try {
    await fs.promises.unlink(safePath);
    return true;
  } catch (err: any) {
    if (err.code === "ENOENT") return false;
    throw err;
  }
}

export function isValidId(id: unknown): id is string {
  if (typeof id !== "string") return false;
  const trimmed = id.trim();
  if (trimmed.length === 0 || trimmed.length > 128) return false;
  return /^[a-zA-Z0-9_-]+$/.test(trimmed);
}

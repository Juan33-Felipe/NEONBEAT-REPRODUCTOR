import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getPrismaClient } from "../prisma";
import { getConfig } from "../config";
import {
  isValidAudioFile,
  isValidId,
  parseTrackMetadataFromFileName,
  resolveSafeStoragePath,
  safeDeleteStorageFile,
  sanitizeFileName,
  ALLOWED_EXTENSIONS,
} from "../utils/audioValidation";

const router = Router();

function createUploadMiddleware() {
  const config = getConfig();

  if (!fs.existsSync(config.storageDir)) {
    fs.mkdirSync(config.storageDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      if (!fs.existsSync(config.storageDir)) {
        fs.mkdirSync(config.storageDir, { recursive: true });
      }
      cb(null, config.storageDir);
    },
    filename: (_req, file, cb) => {
      const sanitized = sanitizeFileName(file.originalname);
      const ext = path.extname(sanitized).toLowerCase();
      const uniqueName = `${crypto.randomUUID()}${ext}`;
      cb(null, uniqueName);
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: config.maxFileSizeBytes,
      files: 100,
    },
    fileFilter: (_req, file, cb) => {
      const check = isValidAudioFile(file.originalname, file.mimetype);
      if (!check.valid) {
        const err: any = new Error(check.reason || "Formato de archivo no permitido");
        err.statusCode = 400;
        err.code = "INVALID_FILE_TYPE";
        return cb(err);
      }
      cb(null, true);
    },
  });
}

function serializeTrack(track: any) {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    fileName: track.fileName,
    mimeType: track.mimeType,
    format: track.format,
    sizeBytes: track.sizeBytes,
    size: track.sizeBytes,
    storagePath: track.storagePath,
    favorite: track.favorite,
    playCount: track.playCount,
    streamUrl: `/api/tracks/${track.id}/stream`,
    createdAt: track.createdAt,
    updatedAt: track.updatedAt,
  };
}

// GET /api/tracks
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getPrismaClient();
    const { search, favorite } = req.query;

    const where: any = {};

    if (typeof favorite === "string") {
      if (favorite === "true" || favorite === "1") {
        where.favorite = true;
      } else if (favorite === "false" || favorite === "0") {
        where.favorite = false;
      }
    }

    if (typeof search === "string" && search.trim().length > 0) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q } },
        { artist: { contains: q } },
        { fileName: { contains: q } },
      ];
    }

    const tracks = await prisma.track.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json(tracks.map(serializeTrack));
  } catch (err) {
    next(err);
  }
});

// GET /api/tracks/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({
        error: "INVALID_ID",
        message: "El identificador de la pista no es válido.",
        statusCode: 400,
      });
    }

    const prisma = getPrismaClient();
    const track = await prisma.track.findUnique({ where: { id } });

    if (!track) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Pista no encontrada.",
        statusCode: 404,
      });
    }

    return res.status(200).json(serializeTrack(track));
  } catch (err) {
    next(err);
  }
});

// POST /api/tracks (multipart upload of one or multiple files)
router.post("/", (req: Request, res: Response, next: NextFunction) => {
  const upload = createUploadMiddleware().any();

  upload(req, res, async (err: any) => {
    const config = getConfig();
    const uploadedFiles = (req.files as Express.Multer.File[]) || [];

    if (err) {
      // Clean up any files written in this batch before the error occurred
      for (const f of uploadedFiles) {
        await safeDeleteStorageFile(config.storageDir, f.filename).catch(() => {});
      }

      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            error: "FILE_TOO_LARGE",
            message: `El archivo excede el tamaño máximo permitido (${config.maxFileSizeBytes} bytes).`,
            statusCode: 413,
          });
        }
        return res.status(400).json({
          error: "UPLOAD_ERROR",
          message: err.message,
          statusCode: 400,
        });
      }

      const status = err.statusCode || 400;
      return res.status(status).json({
        error: err.code || "INVALID_UPLOAD",
        message: err.message || "Error al procesar los archivos subidos.",
        statusCode: status,
      });
    }

    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res.status(400).json({
        error: "NO_FILES_PROVIDED",
        message: "Debe adjuntar al menos un archivo de audio en multipart/form-data.",
        statusCode: 400,
      });
    }

    try {
      const prisma = getPrismaClient();
      const createdTracks = [];

      for (const file of uploadedFiles) {
        const sanitizedOriginal = sanitizeFileName(file.originalname);
        const validation = isValidAudioFile(sanitizedOriginal, file.mimetype);
        if (!validation.valid) {
          await safeDeleteStorageFile(config.storageDir, file.filename).catch(() => {});
          continue;
        }

        // Reject 0-byte empty files
        if (file.size <= 0) {
          await safeDeleteStorageFile(config.storageDir, file.filename).catch(() => {});
          return res.status(400).json({
            error: "EMPTY_FILE",
            message: `El archivo "${sanitizedOriginal}" está vacío (0 bytes).`,
            statusCode: 400,
          });
        }

        const parsedMeta = parseTrackMetadataFromFileName(sanitizedOriginal);
        const customTitle =
          uploadedFiles.length === 1 && typeof req.body?.title === "string" && req.body.title.trim()
            ? req.body.title.trim().slice(0, 200)
            : parsedMeta.title;
        const customArtist =
          uploadedFiles.length === 1 && typeof req.body?.artist === "string" && req.body.artist.trim()
            ? req.body.artist.trim().slice(0, 200)
            : parsedMeta.artist;

        const created = await prisma.track.create({
          data: {
            title: customTitle,
            artist: customArtist,
            fileName: sanitizedOriginal,
            mimeType: validation.canonicalMimeType,
            format: validation.format,
            sizeBytes: file.size,
            storagePath: file.filename,
            favorite: false,
            playCount: 0,
          },
        });

        createdTracks.push(serializeTrack(created));
      }

      return res.status(201).json({
        tracks: createdTracks,
        count: createdTracks.length,
      });
    } catch (dbErr) {
      for (const f of uploadedFiles) {
        await safeDeleteStorageFile(config.storageDir, f.filename).catch(() => {});
      }
      next(dbErr);
    }
  });
});

// PATCH /api/tracks/:id (edit title, artist or favorite)
router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({
        error: "INVALID_ID",
        message: "El identificador de la pista no es válido.",
        statusCode: 400,
      });
    }

    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({
        error: "INVALID_BODY",
        message: "El cuerpo de la petición debe ser un objeto JSON válido.",
        statusCode: 400,
      });
    }

    const { title, artist, favorite } = req.body;
    const dataToUpdate: Record<string, any> = {};

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0 || title.trim().length > 255) {
        return res.status(400).json({
          error: "INVALID_TITLE",
          message: "El título debe ser una cadena no vacía de máximo 255 caracteres.",
          statusCode: 400,
        });
      }
      dataToUpdate.title = title.trim();
    }

    if (artist !== undefined) {
      if (typeof artist !== "string" || artist.trim().length === 0 || artist.trim().length > 255) {
        return res.status(400).json({
          error: "INVALID_ARTIST",
          message: "El artista debe ser una cadena no vacía de máximo 255 caracteres.",
          statusCode: 400,
        });
      }
      dataToUpdate.artist = artist.trim();
    }

    if (favorite !== undefined) {
      if (typeof favorite !== "boolean") {
        return res.status(400).json({
          error: "INVALID_FAVORITE",
          message: "El campo 'favorite' debe ser un valor booleano (true o false).",
          statusCode: 400,
        });
      }
      dataToUpdate.favorite = favorite;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return res.status(400).json({
        error: "EMPTY_UPDATE",
        message: "Debe proporcionar al menos un campo válido para actualizar (title, artist, favorite).",
        statusCode: 400,
      });
    }

    const prisma = getPrismaClient();
    const existing = await prisma.track.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Pista no encontrada.",
        statusCode: 404,
      });
    }

    const updated = await prisma.track.update({
      where: { id },
      data: dataToUpdate,
    });

    return res.status(200).json(serializeTrack(updated));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tracks/:id
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({
        error: "INVALID_ID",
        message: "El identificador de la pista no es válido.",
        statusCode: 400,
      });
    }

    const prisma = getPrismaClient();
    const config = getConfig();

    const existing = await prisma.track.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Pista no encontrada.",
        statusCode: 404,
      });
    }

    await prisma.track.delete({ where: { id } });
    await safeDeleteStorageFile(config.storageDir, existing.storagePath);

    return res.status(200).json({
      deleted: true,
      id,
      message: "Pista eliminada correctamente.",
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/tracks/:id/play (increment playCount)
router.post("/:id/play", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({
        error: "INVALID_ID",
        message: "El identificador de la pista no es válido.",
        statusCode: 400,
      });
    }

    const prisma = getPrismaClient();
    const existing = await prisma.track.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Pista no encontrada.",
        statusCode: 404,
      });
    }

    const positionSeconds =
      typeof req.body?.positionSeconds === "number" &&
      Number.isFinite(req.body.positionSeconds) &&
      req.body.positionSeconds >= 0
        ? req.body.positionSeconds
        : 0;

    const [updated] = await prisma.$transaction([
      prisma.track.update({
        where: { id },
        data: { playCount: { increment: 1 } },
      }),
      prisma.playbackEvent.create({
        data: {
          trackId: id,
          eventType: "play",
          positionSeconds,
        },
      }),
    ]);

    return res.status(200).json(serializeTrack(updated));
  } catch (err) {
    next(err);
  }
});

// GET /api/tracks/:id/stream (HTTP Range audio streaming using Node streams)
router.get("/:id/stream", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({
        error: "INVALID_ID",
        message: "El identificador de la pista no es válido.",
        statusCode: 400,
      });
    }

    const prisma = getPrismaClient();
    const config = getConfig();

    const track = await prisma.track.findUnique({ where: { id } });
    if (!track) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Pista no encontrada.",
        statusCode: 404,
      });
    }

    const safeFilePath = resolveSafeStoragePath(config.storageDir, track.storagePath);
    if (!safeFilePath) {
      return res.status(403).json({
        error: "FORBIDDEN_PATH",
        message: "Ruta de almacenamiento inválida.",
        statusCode: 403,
      });
    }

    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(safeFilePath);
    } catch {
      return res.status(404).json({
        error: "FILE_NOT_FOUND",
        message: "El archivo de audio físico no se encuentra en el almacenamiento.",
        statusCode: 404,
      });
    }

    const totalSize = stat.size;
    const ext = path.extname(safeFilePath).toLowerCase();
    const mimeType =
      track.mimeType || ALLOWED_EXTENSIONS[ext]?.mimeType || "application/octet-stream";

    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Cache-Control", "no-cache");

    const rangeHeader = req.headers.range;

    if (!rangeHeader) {
      res.status(200);
      res.setHeader("Content-Length", String(totalSize));

      const stream = fs.createReadStream(safeFilePath);
      req.on("close", () => stream.destroy());
      stream.on("error", (streamErr) => {
        if (!res.headersSent) {
          next(streamErr);
        } else {
          res.destroy();
        }
      });
      stream.pipe(res);
      return;
    }

    // Parse Range header strictly: bytes=start-end
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (!match || (match[1] === "" && match[2] === "")) {
      res.status(416);
      res.setHeader("Content-Range", `bytes */${totalSize}`);
      return res.json({
        error: "RANGE_NOT_SATISFIABLE",
        message: "Cabecera Range inválida o mal formada.",
        statusCode: 416,
      });
    }

    const startStr = match[1];
    const endStr = match[2];
    let start: number;
    let end: number;

    if (startStr === "") {
      // Suffix byte-range-spec: bytes=-500 (last 500 bytes)
      const suffixLength = parseInt(endStr, 10);
      if (Number.isNaN(suffixLength) || suffixLength <= 0) {
        res.status(416);
        res.setHeader("Content-Range", `bytes */${totalSize}`);
        return res.json({
          error: "RANGE_NOT_SATISFIABLE",
          message: "Rango de sufijo inválido.",
          statusCode: 416,
        });
      }
      start = Math.max(0, totalSize - suffixLength);
      end = totalSize - 1;
    } else {
      start = parseInt(startStr, 10);
      end = endStr !== "" ? parseInt(endStr, 10) : totalSize - 1;

      if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        start < 0 ||
        start >= totalSize ||
        start > end
      ) {
        res.status(416);
        res.setHeader("Content-Range", `bytes */${totalSize}`);
        return res.json({
          error: "RANGE_NOT_SATISFIABLE",
          message: `El rango solicitado (${rangeHeader}) no es satisfacible para un archivo de ${totalSize} bytes.`,
          statusCode: 416,
        });
      }

      if (end >= totalSize) {
        end = totalSize - 1;
      }
    }

    const chunkSize = end - start + 1;

    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${totalSize}`);
    res.setHeader("Content-Length", String(chunkSize));

    const partialStream = fs.createReadStream(safeFilePath, { start, end });
    req.on("close", () => partialStream.destroy());
    partialStream.on("error", (streamErr) => {
      if (!res.headersSent) {
        next(streamErr);
      } else {
        res.destroy();
      }
    });
    partialStream.pipe(res);
  } catch (err) {
    next(err);
  }
});

export default router;

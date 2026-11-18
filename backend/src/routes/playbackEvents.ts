import { Router, Request, Response, NextFunction } from "express";
import { getPrismaClient } from "../prisma";
import { isValidId } from "../utils/audioValidation";

const router = Router();

const ALLOWED_EVENT_TYPES = new Set([
  "play",
  "pause",
  "seek",
  "ended",
  "skip",
  "resume",
  "rate_change",
  "volume_change",
]);

// POST /api/playback-events
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({
        error: "INVALID_BODY",
        message: "El cuerpo de la petición debe ser un objeto JSON válido.",
        statusCode: 400,
      });
    }

    const { trackId, eventType, positionSeconds } = req.body;

    if (!isValidId(trackId)) {
      return res.status(400).json({
        error: "INVALID_TRACK_ID",
        message: "El campo 'trackId' es obligatorio y debe ser un identificador válido.",
        statusCode: 400,
      });
    }

    if (typeof eventType !== "string" || !ALLOWED_EVENT_TYPES.has(eventType.trim().toLowerCase())) {
      return res.status(400).json({
        error: "INVALID_EVENT_TYPE",
        message: `El campo 'eventType' debe ser uno de: ${Array.from(ALLOWED_EVENT_TYPES).join(", ")}.`,
        statusCode: 400,
      });
    }

    const pos =
      positionSeconds === undefined
        ? 0
        : typeof positionSeconds === "number" && Number.isFinite(positionSeconds) && positionSeconds >= 0
        ? positionSeconds
        : NaN;

    if (Number.isNaN(pos)) {
      return res.status(400).json({
        error: "INVALID_POSITION",
        message: "El campo 'positionSeconds' debe ser un número mayor o igual a 0.",
        statusCode: 400,
      });
    }

    const prisma = getPrismaClient();
    const track = await prisma.track.findUnique({ where: { id: trackId } });

    if (!track) {
      return res.status(404).json({
        error: "TRACK_NOT_FOUND",
        message: "La pista asociada al evento no existe.",
        statusCode: 404,
      });
    }

    const event = await prisma.playbackEvent.create({
      data: {
        trackId,
        eventType: eventType.trim().toLowerCase(),
        positionSeconds: pos,
      },
    });

    return res.status(201).json(event);
  } catch (err) {
    next(err);
  }
});

// GET /api/playback-events (optional helper to inspect recent playback events)
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getPrismaClient();
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || "50"), 10) || 50));

    const events = await prisma.playbackEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        track: {
          select: {
            id: true,
            title: true,
            artist: true,
            format: true,
          },
        },
      },
    });

    return res.status(200).json(events);
  } catch (err) {
    next(err);
  }
});

export default router;

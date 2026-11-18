import { Router, Request, Response, NextFunction } from "express";
import { getPrismaClient } from "../prisma";

const router = Router();

// GET /api/stats
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getPrismaClient();

    const [aggregates, favoriteCount, eventsCount] = await Promise.all([
      prisma.track.aggregate({
        _count: { id: true },
        _sum: {
          sizeBytes: true,
          playCount: true,
        },
      }),
      prisma.track.count({ where: { favorite: true } }),
      prisma.playbackEvent.count(),
    ]);

    const totalTracks = aggregates._count.id || 0;
    const totalSizeBytes = aggregates._sum.sizeBytes || 0;
    const totalPlays = aggregates._sum.playCount || 0;

    return res.status(200).json({
      totalTracks,
      totalBytes: totalSizeBytes,
      totalSizeBytes,
      totalPlays,
      totalFavorites: favoriteCount,
      totalPlaybackEvents: eventsCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;

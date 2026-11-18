import { Router, Request, Response } from "express";
import fs from "fs";
import { getPrismaClient } from "../prisma";
import { getConfig } from "../config";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const config = getConfig();
  const prisma = getPrismaClient();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const storageExists = fs.existsSync(config.storageDir);

    res.status(200).json({
      status: "ok",
      service: "neonbeat-backend",
      timestamp: new Date().toISOString(),
      database: "connected",
      storage: storageExists ? "ready" : "missing",
    });
  } catch (error: any) {
    res.status(503).json({
      status: "error",
      error: "SERVICE_UNAVAILABLE",
      message: error?.message || "Database health check failed",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;

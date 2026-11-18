import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import fs from "fs";
import { getConfig } from "./config";
import healthRouter from "./routes/health";
import tracksRouter from "./routes/tracks";
import playbackEventsRouter from "./routes/playbackEvents";
import statsRouter from "./routes/stats";

export function createApp(): Express {
  const app = express();
  const config = getConfig();

  if (!fs.existsSync(config.storageDir)) {
    fs.mkdirSync(config.storageDir, { recursive: true });
  }

  app.use(
    cors({
      origin: config.corsOrigin === "*" ? "*" : config.corsOrigin.split(","),
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS", "HEAD"],
      allowedHeaders: ["Content-Type", "Range", "Accept", "Origin"],
      exposedHeaders: ["Accept-Ranges", "Content-Range", "Content-Length", "Content-Type"],
    })
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // API Routes
  app.use("/api/health", healthRouter);
  app.use("/api/tracks", tracksRouter);
  app.use("/api/playback-events", playbackEventsRouter);
  app.use("/api/stats", statsRouter);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: "ROUTE_NOT_FOUND",
      message: `La ruta ${req.method} ${req.originalUrl} no existe.`,
      statusCode: 404,
    });
  });

  // Consistent JSON Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof SyntaxError && "body" in err) {
      return res.status(400).json({
        error: "INVALID_JSON",
        message: "El cuerpo JSON enviado está mal formado.",
        statusCode: 400,
      });
    }

    const statusCode = typeof err.statusCode === "number" ? err.statusCode : 500;
    const errorCode = err.code || (statusCode === 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR");
    const message = err.message || "Error interno del servidor.";

    return res.status(statusCode).json({
      error: errorCode,
      message,
      statusCode,
    });
  });

  return app;
}

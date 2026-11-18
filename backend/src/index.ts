import { createApp } from "./app";
import { getConfig } from "./config";
import { disconnectPrisma } from "./prisma";

const config = getConfig();
const app = createApp();

const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(`[NeonBeat Backend] Servidor escuchando en http://0.0.0.0:${config.port}`);
  console.log(`[NeonBeat Backend] Directorio de audios: ${config.storageDir}`);
  console.log(`[NeonBeat Backend] Tamaño máximo de archivo: ${config.maxFileSizeBytes} bytes`);
});

const shutdown = async (signal: string) => {
  console.log(`\n[NeonBeat Backend] Señal ${signal} recibida. Cerrando servidor...`);
  server.close(async () => {
    await disconnectPrisma();
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

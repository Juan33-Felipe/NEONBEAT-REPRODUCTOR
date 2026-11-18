import fs from "fs";
import path from "path";
import { getPrismaClient, disconnectPrisma } from "./prisma";
import { getConfig } from "./config";

async function main() {
  const config = getConfig();
  const prisma = getPrismaClient();

  console.log("[Reset] Limpiando registros de PlaybackEvent y Track en SQLite...");
  await prisma.playbackEvent.deleteMany({});
  await prisma.track.deleteMany({});

  if (fs.existsSync(config.storageDir)) {
    const entries = await fs.promises.readdir(config.storageDir);
    let removed = 0;
    for (const entry of entries) {
      if (entry === ".gitkeep") continue;
      const fullPath = path.join(config.storageDir, entry);
      const stat = await fs.promises.stat(fullPath);
      if (stat.isFile()) {
        await fs.promises.unlink(fullPath);
        removed++;
      }
    }
    console.log(`[Reset] Se eliminaron ${removed} archivos de audio de ${config.storageDir}`);
  }

  console.log("[Reset] Base de datos y almacenamiento reiniciados correctamente.");
  await disconnectPrisma();
}

main().catch(async (err) => {
  console.error("[Reset] Error:", err);
  await disconnectPrisma();
  process.exit(1);
});

import { Track } from "../shared/Models";

export class Scanner {
  static async scanFolder(): Promise<Track[]> {
    if ("showDirectoryPicker" in window) {
      return this.scanWithDirectoryPicker();
    } else {
      return this.scanWithFilePicker();
    }
  }

  private static async scanWithDirectoryPicker(): Promise<Track[]> {
    try {
      const dir = await (window as any).showDirectoryPicker();
      const tracks: Track[] = [];

      // Función recursiva para explorar subcarpetas
      const scanDir = async (dirHandle: any): Promise<void> => {
        for await (const entry of (dirHandle as any).values()) {
          if (entry.kind === "file" && this.isMusicFile(entry.name)) {
            const file = await entry.getFile();
            const track: Track = {
              id: crypto.randomUUID(),
              title: file.name.replace(/\.[^/.]+$/, ""),
              fileName: file.name,
              file: file,
              blobUrl: URL.createObjectURL(file),
            };
            tracks.push(track);
          } else if (entry.kind === "directory") {
            // Explorar subcarpetas recursivamente
            try {
              await scanDir(entry);
            } catch (error) {
              // Ignorar errores de permisos en subcarpetas
              console.warn(`No se pudo acceder a: ${entry.name}`);
            }
          }
        }
      };

      await scanDir(dir);

      if (tracks.length === 0) {
        alert("No se encontraron archivos de audio en la carpeta seleccionada.");
      }

      return tracks;
    } catch (error: any) {
      // User cancelled the dialog
      if (error.name === "AbortError") {
        console.log("Usuario canceló la selección de carpeta");
        return [];
      }

      console.error("Error con showDirectoryPicker:", error);
      alert("Error al escanear la carpeta: " + error.message);
      return [];
    }
  }

  private static async scanWithFilePicker(): Promise<Track[]> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      // Permitir seleccionar carpetas completas (webkitdirectory)
      (input as any).webkitdirectory = true;
      input.accept = ".mp3,.wav,.ogg,.flac,.aac,.m4a";

      input.onchange = async (e: any) => {
        const files = e.target.files;
        const tracks: Track[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (this.isMusicFile(file.name)) {
            const track: Track = {
              id: crypto.randomUUID(),
              title: file.name.replace(/\.[^/.]+$/, ""),
              fileName: file.name,
              file: file,
              blobUrl: URL.createObjectURL(file),
            };
            tracks.push(track);
          }
        }

        if (tracks.length === 0) {
          alert("No se encontraron archivos de audio en la selección.");
        }

        resolve(tracks);
      };

      input.oncancel = () => {
        resolve([]);
      };

      input.click();
    });
  }

  private static isMusicFile(fileName: string): boolean {
    const musicExtensions = /\.(mp3|wav|ogg|flac|aac|m4a)$/i;
    return musicExtensions.test(fileName);
  }
}
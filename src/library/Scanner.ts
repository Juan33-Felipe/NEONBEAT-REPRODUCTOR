import { Track } from "../shared/Models";

export class Scanner {
  private static parseMetadataFromName(file: File): Pick<Track, "title" | "artist" | "format" | "size"> {
    const extMatch = file.name.match(/\.([^.]+)$/);
    const format = extMatch ? extMatch[1].toUpperCase() : "AUDIO";
    const baseName = file.name.replace(/\.[^/.]+$/, "").trim();

    // Clean leading track number like "01 - " or "01. "
    const cleaned = baseName.replace(/^\d{1,3}\s*[-._]\s*/, "");
    const parts = cleaned.split(/\s+-\s+/);

    if (parts.length >= 2) {
      const artist = parts[0].trim();
      const title = parts.slice(1).join(" - ").trim();
      return {
        title: title || cleaned,
        artist: artist || "Artista Local",
        format,
        size: file.size,
      };
    }

    return {
      title: cleaned || baseName,
      artist: "Biblioteca Local",
      format,
      size: file.size,
    };
  }

  static createTrackFromFile(file: File): Track {
    const meta = this.parseMetadataFromName(file);
    return {
      id: crypto.randomUUID(),
      title: meta.title,
      artist: meta.artist,
      fileName: file.name,
      file,
      blobUrl: URL.createObjectURL(file),
      format: meta.format,
      size: meta.size,
      favorite: false,
    };
  }

  static createTracksFromFiles(files: FileList | File[]): Track[] {
    const list = Array.from(files);
    const tracks: Track[] = [];
    for (const file of list) {
      if (this.isMusicFile(file.name)) {
        tracks.push(this.createTrackFromFile(file));
      }
    }
    return tracks;
  }

  static async scanFiles(): Promise<Track[]> {
    try {
      if ("showOpenFilePicker" in window) {
        const handles = await (window as any).showOpenFilePicker({
          types: [
            {
              description: "Archivos de Audio",
              accept: {
                "audio/*": [".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a", ".opus", ".webm"],
              },
            },
          ],
          multiple: true,
        });

        const tracks: Track[] = [];
        for (const handle of handles) {
          const file = await handle.getFile();
          tracks.push(this.createTrackFromFile(file));
        }
        return tracks;
      } else {
        return new Promise((resolve) => {
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          input.accept = ".mp3,.wav,.ogg,.flac,.aac,.m4a,.opus,.webm,audio/*";
          input.onchange = (e: any) => {
            const files = e.target.files;
            if (files && files.length > 0) {
              resolve(this.createTracksFromFiles(files));
            } else {
              resolve([]);
            }
          };
          input.oncancel = () => resolve([]);
          input.click();
        });
      }
    } catch (error: any) {
      if (error.name === "AbortError") return [];
      console.error("Error al seleccionar archivos:", error);
      return [];
    }
  }

  static async scanSingleFile(): Promise<Track | null> {
    const tracks = await this.scanFiles();
    return tracks[0] ?? null;
  }

  static async scanFolder(): Promise<Track[]> {
    if ("showDirectoryPicker" in window) {
      return this.scanWithDirectoryPicker();
    } else {
      return this.scanWithFilePicker();
    }
  }

  private static async scanWithDirectoryPicker(): Promise<Track[]> {
    try {
      const dirHandle = await (window as any).showDirectoryPicker();
      const tracks: Track[] = [];

      const scanDir = async (handle: any): Promise<void> => {
        for await (const entry of handle.values()) {
          if (entry.kind === "file") {
            if (this.isMusicFile(entry.name)) {
              const file = await entry.getFile();
              tracks.push(this.createTrackFromFile(file));
            }
          } else if (entry.kind === "directory") {
            try {
              await scanDir(entry);
            } catch (err) {
              console.warn(`Sin acceso a: ${entry.name}`);
            }
          }
        }
      };

      await scanDir(dirHandle);
      return tracks;
    } catch (error: any) {
      if (error.name === "AbortError") return [];
      return this.scanWithFilePicker();
    }
  }

  private static async scanWithFilePicker(): Promise<Track[]> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      (input as any).webkitdirectory = true;
      (input as any).directory = true;
      (input as any).allowdirs = "true";

      input.onchange = async (e: any) => {
        const files = e.target.files;
        const tracks = files ? this.createTracksFromFiles(files) : [];
        resolve(tracks);
      };

      input.oncancel = () => resolve([]);
      input.click();
    });
  }

  static isMusicFile(fileName: string): boolean {
    const musicExtensions = /\.(mp3|wav|ogg|flac|aac|m4a|opus|webm)$/i;
    return musicExtensions.test(fileName.trim());
  }
}

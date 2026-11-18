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
    const localUrl = URL.createObjectURL(file);
    return {
      id: crypto.randomUUID(),
      title: meta.title,
      artist: meta.artist,
      fileName: file.name,
      file,
      streamUrl: localUrl,
      blobUrl: localUrl,
      format: meta.format,
      size: meta.size,
      sizeBytes: meta.size,
      favorite: false,
      playCount: 0,
      isLocalFallback: true,
    };
  }

  static filterMusicFiles(files: FileList | File[]): File[] {
    return Array.from(files).filter((file) => this.isMusicFile(file.name));
  }

  static createTracksFromFiles(files: FileList | File[]): Track[] {
    const validFiles = this.filterMusicFiles(files);
    return validFiles.map((file) => this.createTrackFromFile(file));
  }

  static async pickFiles(): Promise<File[]> {
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

        const files: File[] = [];
        for (const handle of handles) {
          const file = await handle.getFile();
          if (this.isMusicFile(file.name)) {
            files.push(file);
          }
        }
        return files;
      } else {
        return new Promise((resolve) => {
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          input.accept = ".mp3,.wav,.ogg,.flac,.aac,.m4a,.opus,.webm,audio/*";
          input.onchange = (e: any) => {
            const selected = e.target.files;
            if (selected && selected.length > 0) {
              resolve(this.filterMusicFiles(selected));
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

  static async pickFolderFiles(): Promise<File[]> {
    if ("showDirectoryPicker" in window) {
      return this.pickWithDirectoryPicker();
    } else {
      return this.pickWithDirectoryInput();
    }
  }

  private static async pickWithDirectoryPicker(): Promise<File[]> {
    try {
      const dirHandle = await (window as any).showDirectoryPicker();
      const files: File[] = [];

      const scanDir = async (handle: any): Promise<void> => {
        for await (const entry of handle.values()) {
          if (entry.kind === "file") {
            if (this.isMusicFile(entry.name)) {
              const file = await entry.getFile();
              files.push(file);
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
      return files;
    } catch (error: any) {
      if (error.name === "AbortError") return [];
      return this.pickWithDirectoryInput();
    }
  }

  private static async pickWithDirectoryInput(): Promise<File[]> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      (input as any).webkitdirectory = true;
      (input as any).directory = true;
      (input as any).allowdirs = "true";

      input.onchange = async (e: any) => {
        const selected = e.target.files;
        const files = selected ? this.filterMusicFiles(selected) : [];
        resolve(files);
      };

      input.oncancel = () => resolve([]);
      input.click();
    });
  }

  static async scanFiles(): Promise<Track[]> {
    const files = await this.pickFiles();
    return files.map((f) => this.createTrackFromFile(f));
  }

  static async scanSingleFile(): Promise<Track | null> {
    const tracks = await this.scanFiles();
    return tracks[0] ?? null;
  }

  static async scanFolder(): Promise<Track[]> {
    const files = await this.pickFolderFiles();
    return files.map((f) => this.createTrackFromFile(f));
  }

  static isMusicFile(fileName: string): boolean {
    const musicExtensions = /\.(mp3|wav|ogg|flac|aac|m4a|opus|webm)$/i;
    return musicExtensions.test(fileName.trim());
  }
}

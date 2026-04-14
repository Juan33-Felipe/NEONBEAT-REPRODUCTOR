import { Track } from "../shared/Models";

export class Scanner {
  static async scanSingleFile(): Promise<Track | null> {
    try {
      if ("showOpenFilePicker" in window) {
        const [fileHandle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'Archivos de Audio',
              accept: { 'audio/*': ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'] }
            },
          ],
          multiple: false
        });

        const file = await fileHandle.getFile();
        return {
          id: crypto.randomUUID(),
          title: file.name.replace(/\.[^/.]+$/, ""),
          fileName: file.name,
          file: file,
          blobUrl: URL.createObjectURL(file),
        };
      } else {
        return new Promise((resolve) => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".mp3,.wav,.ogg,.flac,.aac,.m4a";
          input.onchange = (e: any) => {
            const file = e.target.files[0];
            if (file) {
              resolve({
                id: crypto.randomUUID(),
                title: file.name.replace(/\.[^/.]+$/, ""),
                fileName: file.name,
                file: file,
                blobUrl: URL.createObjectURL(file),
              });
            } else {
              resolve(null);
            }
          };
          input.click();
        });
      }
    } catch (error: any) {
      if (error.name === "AbortError") return null;
      console.error("Error al seleccionar archivo:", error);
      return null;
    }
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
              tracks.push({
                id: crypto.randomUUID(),
                title: file.name.replace(/\.[^/.]+$/, ""),
                fileName: file.name,
                file: file,
                blobUrl: URL.createObjectURL(file),
              });
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
      if (tracks.length === 0) alert("No se encontraron audios en la carpeta.");
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
        const tracks: Track[] = [];

        if (files) {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (this.isMusicFile(file.name)) {
              tracks.push({
                id: crypto.randomUUID(),
                title: file.name.replace(/\.[^/.]+$/, ""),
                fileName: file.name,
                file: file,
                blobUrl: URL.createObjectURL(file),
              });
            }
          }
        }
        
        if (tracks.length === 0) alert("Carpeta vacía o sin archivos compatibles.");
        resolve(tracks);
      };

      input.oncancel = () => resolve([]);
      input.click();
    });
  }

  private static isMusicFile(fileName: string): boolean {
    const musicExtensions = /\.(mp3|wav|ogg|flac|aac|m4a)$/i;
    return musicExtensions.test(fileName.trim());
  }
}
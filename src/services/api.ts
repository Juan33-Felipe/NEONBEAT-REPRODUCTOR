import { Track } from "../shared/Models";

const RAW_API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
export const API_BASE_URL = RAW_API_URL.replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode = "API_ERROR",
    public isNetworkError = false
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiStats {
  totalTracks: number;
  totalBytes: number;
  totalSizeBytes: number;
  totalPlays: number;
  totalFavorites: number;
  totalPlaybackEvents: number;
}

export function getStreamUrl(trackId: string): string {
  return `${API_BASE_URL}/api/tracks/${encodeURIComponent(trackId)}/stream`;
}

function mapApiTrackToTrack(raw: any): Track {
  const streamUrl = getStreamUrl(raw.id);
  return {
    id: raw.id,
    title: raw.title,
    artist: raw.artist || "Biblioteca Local",
    fileName: raw.fileName,
    streamUrl,
    blobUrl: streamUrl,
    mimeType: raw.mimeType,
    format: raw.format || "AUDIO",
    size: raw.sizeBytes ?? raw.size ?? 0,
    sizeBytes: raw.sizeBytes ?? raw.size ?? 0,
    storagePath: raw.storagePath,
    favorite: Boolean(raw.favorite),
    playCount: typeof raw.playCount === "number" ? raw.playCount : 0,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    isLocalFallback: false,
  };
}

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch (err: any) {
    throw new ApiError(
      err?.message || "No se pudo conectar con el servidor backend.",
      0,
      "NETWORK_ERROR",
      true
    );
  }

  let data: any = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      data?.message || `Error del servidor (${response.status})`,
      response.status,
      data?.error || "SERVER_ERROR",
      false
    );
  }

  return data as T;
}

export const api = {
  async checkHealth(): Promise<boolean> {
    try {
      const res = await requestJson<{ status: string }>("/api/health");
      return res.status === "ok";
    } catch {
      return false;
    }
  },

  async getTracks(params?: { search?: string; favorite?: boolean }): Promise<Track[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.favorite !== undefined) query.set("favorite", String(params.favorite));
    const qs = query.toString() ? `?${query.toString()}` : "";

    const data = await requestJson<any[] | { tracks: any[] }>(`/api/tracks${qs}`);
    const list = Array.isArray(data) ? data : data.tracks || [];
    return list.map(mapApiTrackToTrack);
  },

  async getTrackById(id: string): Promise<Track> {
    const raw = await requestJson<any>(`/api/tracks/${encodeURIComponent(id)}`);
    return mapApiTrackToTrack(raw);
  },

  async uploadTracks(files: File[]): Promise<Track[]> {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file, file.name);
    }

    const data = await requestJson<{ tracks: any[]; count: number } | any[]>("/api/tracks", {
      method: "POST",
      body: formData,
    });

    const list = Array.isArray(data) ? data : data.tracks || [];
    return list.map(mapApiTrackToTrack);
  },

  async updateTrack(
    id: string,
    payload: { title?: string; artist?: string; favorite?: boolean }
  ): Promise<Track> {
    const raw = await requestJson<any>(`/api/tracks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return mapApiTrackToTrack(raw);
  },

  async deleteTrack(id: string): Promise<void> {
    await requestJson<{ deleted: boolean }>(`/api/tracks/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  async registerPlay(id: string, positionSeconds = 0): Promise<Track> {
    const raw = await requestJson<any>(`/api/tracks/${encodeURIComponent(id)}/play`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ positionSeconds }),
    });
    return mapApiTrackToTrack(raw);
  },

  async recordPlaybackEvent(payload: {
    trackId: string;
    eventType: string;
    positionSeconds?: number;
  }): Promise<void> {
    await requestJson<any>("/api/playback-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trackId: payload.trackId,
        eventType: payload.eventType,
        positionSeconds: payload.positionSeconds ?? 0,
      }),
    });
  },

  async getStats(): Promise<ApiStats> {
    return requestJson<ApiStats>("/api/stats");
  },
};

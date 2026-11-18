export type RepeatMode = "off" | "all" | "one";

export interface Track {
  readonly id: string;
  title: string;
  artist?: string;
  fileName: string;
  file?: File;
  streamUrl: string;
  blobUrl: string;
  mimeType?: string;
  duration?: number;
  size?: number;
  sizeBytes?: number;
  storagePath?: string;
  format?: string;
  favorite?: boolean;
  playCount?: number;
  createdAt?: string;
  updatedAt?: string;
  isLocalFallback?: boolean;
}

export interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  muted: boolean;
  playbackRate: number;
  repeatMode: RepeatMode;
  shuffle: boolean;
  playlist: Track[];
}

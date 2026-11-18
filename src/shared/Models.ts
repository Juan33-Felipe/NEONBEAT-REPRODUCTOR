export type RepeatMode = "off" | "all" | "one";

export interface Track {
  readonly id: string;
  title: string;
  artist?: string;
  fileName: string;
  file: File;
  blobUrl: string;
  duration?: number;
  size?: number;
  format?: string;
  favorite?: boolean;
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

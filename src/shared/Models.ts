export interface Track {
    readonly id: string;
    title: string;
    fileName: string;
    file: File;
    blobUrl: string;
}

export interface PlayerState {
    currentTrack: Track | null;
    isPlaying: boolean;
    volume: number; 
    playlist: Track[];
}
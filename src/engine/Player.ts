import { Sequence } from "../core/Sequence";
import { Track, PlayerState, RepeatMode } from "../shared/Models";

export class MusicPlayer {
  private static instance: MusicPlayer;
  private playlist: Sequence<Track>;
  private audio: HTMLAudioElement;
  private state: PlayerState;
  private previousVolume = 0.8;

  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private sourceConnected = false;

  private constructor() {
    this.playlist = new Sequence<Track>();
    this.audio = new Audio();
    this.audio.preload = "metadata";
    this.state = {
      currentTrack: null,
      isPlaying: false,
      volume: 0.8,
      muted: false,
      playbackRate: 1,
      repeatMode: "off",
      shuffle: false,
      playlist: [],
    };
    this.audio.volume = this.state.volume;
  }

  static getInstance(): MusicPlayer {
    if (!MusicPlayer.instance) {
      MusicPlayer.instance = new MusicPlayer();
    }
    return MusicPlayer.instance;
  }

  private initAudioAnalyser(): void {
    if (this.sourceConnected) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.audioCtx = new AudioCtx();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.78;
      const source = this.audioCtx.createMediaElementSource(this.audio);
      source.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.sourceConnected = true;
    } catch {
      // Fallback gracefully if Web Audio API fails
    }
  }

  getFrequencyData(): Uint8Array | null {
    if (!this.analyser || !this.dataArray || !this.state.isPlaying) return null;
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  private syncStateFromSequence(): void {
    this.state.playlist = this.playlist.toArray();
    this.state.currentTrack = this.playlist.getCurrentData();
  }

  private applyAudioSettings(): void {
    this.audio.volume = this.state.muted ? 0 : this.state.volume;
    this.audio.muted = this.state.muted;
    this.audio.playbackRate = this.state.playbackRate;
  }

  loadPlaylist(tracks: Track[], startIndex = 0): void {
    this.playlist.clear();
    tracks.forEach((track) => this.playlist.append(track));
    this.state.playlist = [...tracks];

    if (tracks.length > 0) {
      const safeIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
      this.playlist.goTo(safeIndex);
      const selected = this.playlist.getCurrentData();
      if (selected) {
        this.state.currentTrack = selected;
        if (this.audio.src !== selected.blobUrl) {
          this.audio.src = selected.blobUrl;
          this.applyAudioSettings();
        }
      }
    } else {
      this.pause();
      this.audio.removeAttribute("src");
      this.state.currentTrack = null;
    }
  }

  enqueue(track: Track): Track[] {
    const wasEmpty = this.playlist.size === 0;
    this.playlist.append(track);
    this.syncStateFromSequence();
    if (wasEmpty && this.state.currentTrack) {
      this.audio.src = this.state.currentTrack.blobUrl;
      this.applyAudioSettings();
    }
    return this.state.playlist;
  }

  enqueueNext(track: Track): Track[] {
    const wasEmpty = this.playlist.size === 0;
    this.playlist.insertAfterCurrent(track);
    this.syncStateFromSequence();
    if (wasEmpty && this.state.currentTrack) {
      this.audio.src = this.state.currentTrack.blobUrl;
      this.applyAudioSettings();
    }
    return this.state.playlist;
  }

  reorderQueue(fromIndex: number, toIndex: number): Track[] {
    this.playlist.move(fromIndex, toIndex);
    this.syncStateFromSequence();
    return this.state.playlist;
  }

  removeFromQueue(index: number): { tracks: Track[]; newIndex: number } {
    const currentIdx = this.getCurrentIndex();
    const wasPlaying = !this.audio.paused;
    const isRemovingCurrent = index === currentIdx;

    this.playlist.removeAt(index);
    this.syncStateFromSequence();

    if (this.playlist.size === 0) {
      this.pause();
      this.audio.removeAttribute("src");
      this.state.currentTrack = null;
      return { tracks: [], newIndex: 0 };
    }

    if (isRemovingCurrent && this.state.currentTrack) {
      this.audio.src = this.state.currentTrack.blobUrl;
      this.applyAudioSettings();
      if (wasPlaying) {
        this.play();
      }
    }

    return {
      tracks: this.state.playlist,
      newIndex: Math.max(0, this.getCurrentIndex()),
    };
  }

  clearQueueKeepCurrent(): Track[] {
    const current = this.state.currentTrack;
    this.playlist.clear();
    if (current) {
      this.playlist.append(current);
    }
    this.syncStateFromSequence();
    return this.state.playlist;
  }

  play(): void {
    if (!this.state.currentTrack) return;
    this.initAudioAnalyser();
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    this.applyAudioSettings();
    this.audio.play().catch((err) => {
      console.warn("Reproducción bloqueada o interrumpida:", err);
    });
    this.state.isPlaying = true;
  }

  pause(): void {
    this.audio.pause();
    this.state.isPlaying = false;
  }

  togglePlay(): void {
    if (!this.state.currentTrack) return;
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  skipNext(autoEnded = false): Track | null {
    const size = this.playlist.size;
    if (size === 0) return null;

    if (autoEnded && this.state.repeatMode === "one") {
      this.audio.currentTime = 0;
      this.play();
      return this.state.currentTrack;
    }

    if (this.state.shuffle && size > 1) {
      const currentIdx = this.getCurrentIndex();
      let randomIdx = currentIdx;
      while (randomIdx === currentIdx) {
        randomIdx = Math.floor(Math.random() * size);
      }
      return this.goToTrack(randomIdx);
    }

    const isLast = this.getCurrentIndex() === size - 1;
    if (autoEnded && isLast && this.state.repeatMode === "off") {
      this.pause();
      this.audio.currentTime = 0;
      return null;
    }

    const nextTrack = this.playlist.next(true);
    if (nextTrack) {
      this.state.currentTrack = nextTrack;
      this.audio.src = nextTrack.blobUrl;
      this.applyAudioSettings();
      this.play();
    }
    return nextTrack;
  }

  skipPrev(): Track | null {
    if (this.playlist.size === 0) return null;
    const prevTrack = this.playlist.prev(true);
    if (prevTrack) {
      this.state.currentTrack = prevTrack;
      this.audio.src = prevTrack.blobUrl;
      this.applyAudioSettings();
      this.play();
    }
    return prevTrack;
  }

  goToTrack(index: number): Track | null {
    const track = this.playlist.goTo(index);
    if (track) {
      this.state.currentTrack = track;
      this.audio.src = track.blobUrl;
      this.applyAudioSettings();
      this.play();
    }
    return track;
  }

  setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.state.volume = clamped;
    if (clamped > 0) {
      this.previousVolume = clamped;
      this.state.muted = false;
      this.audio.muted = false;
    }
    this.audio.volume = clamped;
  }

  toggleMute(): boolean {
    this.state.muted = !this.state.muted;
    this.audio.muted = this.state.muted;
    if (this.state.muted) {
      this.audio.volume = 0;
    } else {
      const restored = this.state.volume > 0 ? this.state.volume : this.previousVolume || 0.8;
      this.state.volume = restored;
      this.audio.volume = restored;
    }
    return this.state.muted;
  }

  setPlaybackRate(rate: number): void {
    this.state.playbackRate = rate;
    this.audio.playbackRate = rate;
  }

  cycleRepeatMode(): RepeatMode {
    const order: RepeatMode[] = ["off", "all", "one"];
    const next = order[(order.indexOf(this.state.repeatMode) + 1) % order.length];
    this.state.repeatMode = next;
    return next;
  }

  toggleShuffle(): boolean {
    this.state.shuffle = !this.state.shuffle;
    return this.state.shuffle;
  }

  getAudio(): HTMLAudioElement {
    return this.audio;
  }

  getState(): PlayerState {
    return this.state;
  }

  getCurrentTrack(): Track | null {
    return this.state.currentTrack;
  }

  getPlaylist(): Track[] {
    return this.state.playlist;
  }

  getCurrentIndex(): number {
    return this.playlist.getCurrentIndex();
  }
}

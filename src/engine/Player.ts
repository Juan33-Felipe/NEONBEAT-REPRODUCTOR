import { Sequence } from "../core/Sequence";
import { Track, PlayerState } from "../shared/Models";

export class MusicPlayer {
  private static instance: MusicPlayer;
  private playlist: Sequence<Track>;
  private audio: HTMLAudioElement;
  private state: PlayerState;

  private constructor() {
    this.playlist = new Sequence<Track>();
    this.audio = new Audio();
    this.state = {
      currentTrack: null,
      isPlaying: false,
      volume: 0.8,
      playlist: [],
    };
  }

  static getInstance(): MusicPlayer {
    if (!MusicPlayer.instance) {
      MusicPlayer.instance = new MusicPlayer();
    }
    return MusicPlayer.instance;
  }

  loadPlaylist(tracks: Track[]): void {
    this.playlist = new Sequence<Track>();
    tracks.forEach((track) => this.playlist.append(track));
    this.state.playlist = tracks;

    if (tracks.length > 0) {
      this.playlist.goTo(0);
      const first = this.playlist.getCurrentData();
      if (first) {
        this.state.currentTrack = first;
        this.audio.src = first.blobUrl;
      }
    }
  }

  play(): void {
    this.audio.play();
    this.state.isPlaying = true;
  }

  pause(): void {
    this.audio.pause();
    this.state.isPlaying = false;
  }

  togglePlay(): void {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  skipNext(): Track | null {
    const nextTrack = this.playlist.next();
    if (nextTrack) {
      this.state.currentTrack = nextTrack;
      this.audio.src = nextTrack.blobUrl;
      this.play();
    }
    return nextTrack;
  }

  skipPrev(): Track | null {
    const prevTrack = this.playlist.prev();
    if (prevTrack) {
      this.state.currentTrack = prevTrack;
      this.audio.src = prevTrack.blobUrl;
      this.play();
    }
    return prevTrack;
  }

  goToTrack(index: number): Track | null {
    const track = this.playlist.goTo(index);
    if (track) {
      this.state.currentTrack = track;
      this.audio.src = track.blobUrl;
      this.play();
    }
    return track;
  }

  setVolume(vol: number): void {
    this.state.volume = vol;
    this.audio.volume = vol;
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
    let index = 0;
    let temp = this.playlist.head;
    while (temp && temp !== this.playlist.current) {
      index++;
      temp = temp.next;
    }
    return temp ? index : -1;
  }
}
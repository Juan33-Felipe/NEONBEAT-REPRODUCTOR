import { useState, useEffect, useRef, useCallback } from "react";
import { MusicPlayer as PlayerService } from "../engine/Player";
import { Scanner } from "../library/Scanner";
import { detectMood } from "../services/moodDetector";
import { Track } from "../shared/Models";
import { PlayerControls } from "./PlayerControls";
import { QueuePanel, QueueView } from "./QueuePanel";
import { AllTracksList } from "./AllTracksList";
import { ParticleCanvas } from "./ParticleCanvas";

export function MusicPlayer() {
  const player = useRef(PlayerService.getInstance()).current;

  // ESTADOS
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [activeTracks, setActiveTracks] = useState<Track[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(player.getState().volume);
  const [queueView, setQueueView] = useState<QueueView>("ahora");

  const lastHistoryId = useRef<string | null>(null);
  const currentTrack = activeTracks[currentIndex] ?? null;
  const mood = detectMood(currentTrack?.title ?? "");
  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  // CONFIGURACIÓN DE COLORES DINÁMICOS
  const theme = isDarkMode ? {
    "--bg-base": "#050505",
    "--bg-card": "rgba(20, 20, 20, 0.8)",
    "--bg-panel": "rgba(0, 0, 0, 0.3)",
    "--text-main": "#ffffff",
    "--text-muted": "rgba(255, 255, 255, 0.4)",
    "--border-faint": "rgba(255, 255, 255, 0.1)",
  } : {
    "--bg-base": "#f5f5f7",
    "--bg-card": "rgba(255, 255, 255, 0.95)",
    "--bg-panel": "rgba(240, 240, 245, 0.9)",
    "--text-main": "#000000",
    "--text-muted": "rgba(0, 0, 0, 0.5)",
    "--border-faint": "rgba(0, 0, 0, 0.12)",
  };

  const syncPlayerState = useCallback(() => {
    setCurrentIndex(player.getCurrentIndex());
  }, [player]);

  useEffect(() => {
    const audio = player.getAudio();
    const onTime = () => setProgress(audio.currentTime);
    const onDuration = () => setDuration(audio.duration);
    const onPlay = () => { setPlaying(true); syncPlayerState(); };
    const onPause = () => setPlaying(false);
    const onEnded = () => handleNext();

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onDuration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onDuration);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [player, syncPlayerState]);

  // LÓGICA DEL HISTORIAL: Se guarda si se escuchan más de 5 segundos
  useEffect(() => {
    if (!currentTrack || !playing) return;
    if (progress > 5 && lastHistoryId.current !== currentTrack.id) {
      setHistory(prev => {
        const filtered = prev.filter(t => t.id !== currentTrack.id);
        return [currentTrack, ...filtered].slice(0, 50);
      });
      lastHistoryId.current = currentTrack.id;
    }
  }, [progress, currentTrack, playing]);

  const handleNext = () => {
    player.skipNext();
    syncPlayerState();
  };

  const handlePrev = () => {
    if (player.getAudio().currentTime > 3) {
      player.getAudio().currentTime = 0;
    } else {
      player.skipPrev();
      syncPlayerState();
    }
  };

  const playAt = useCallback((index: number, list?: Track[]) => {
    const targetList = list || activeTracks;
    player.loadPlaylist(targetList);
    setActiveTracks(targetList);
    player.goToTrack(index);
    player.play();
    syncPlayerState();
  }, [player, activeTracks, syncPlayerState]);

  return (
    <div style={{ 
      width: "100vw", height: "100vh", background: "var(--bg-base)", 
      display: "flex", flexDirection: "column", overflow: "hidden",
      position: "relative", ...theme as any 
    }}>
      <ParticleCanvas mood={mood} playing={playing} />

      {/* HEADER */}
      <div style={{ 
        display: "flex", alignItems: "center", justifyContent: "space-between", 
        padding: "12px 24px", borderBottom: "1px solid var(--border-faint)", 
        background: "var(--bg-card)", zIndex: 10 
      }}>
        <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--text-main)" }}>NEONBEAT</span>
        
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={() => setIsDarkMode(!isDarkMode)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}>
            {isDarkMode ? "☀️" : "🌙"}
          </button>
          
          {selectedIds.length > 0 && (
            <button 
              onClick={() => {
                const selected = allTracks.filter(t => selectedIds.includes(t.id));
                playAt(0, selected);
                setSelectedIds([]);
              }} 
              style={{ background: mood.primary, color: "#000", border: "none", padding: "6px 14px", fontSize: "10px", fontWeight: 800, borderRadius: "2px", cursor: "pointer" }}
            >
              REPRODUCIR SELECCIÓN ({selectedIds.length})
            </button>
          )}

          <button 
            onClick={async () => {
              const found = await Scanner.scanFolder();
              if (found.length) setAllTracks(found);
            }} 
            style={{ background: "none", border: `1px solid ${mood.primary}`, color: mood.primary, padding: "6px 14px", fontSize: "10px", borderRadius: "2px", cursor: "pointer" }}
          >
            CARGAR BIBLIOTECA
          </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", zIndex: 5 }}>
        <div style={{ width: "320px", borderRight: "1px solid var(--border-faint)", background: "var(--bg-panel)" }}>
          <QueuePanel
            tracks={activeTracks} history={history} currentIndex={currentIndex}
            playing={playing} progress={progress} duration={duration}
            pct={pct} mood={mood} view={queueView}
            onSetView={setQueueView} onPlayAt={playAt} onRemoveTrack={() => {}}
          />
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <PlayerControls
            mood={mood} playing={playing} currentTrack={currentTrack}
            pct={pct} progress={progress} duration={duration} volume={volume}
            onToggle={() => player.togglePlay()} onPrev={handlePrev} onNext={handleNext}
            onSeek={(t) => { player.getAudio().currentTime = t; }}
            onVolumeChange={(v) => { player.setVolume(v); setVolume(v); }}
          />
        </div>

        <div style={{ width: "380px", background: "var(--bg-card)", borderLeft: "1px solid var(--border-faint)" }}>
          <AllTracksList 
            tracks={allTracks} 
            currentIndex={activeTracks === allTracks ? currentIndex : -1} 
            playing={playing} 
            mood={mood} 
            onPlayAt={(i) => playAt(i, allTracks)} 
            onRemoveTrack={() => {}} 
            selectedIds={selectedIds} 
            onToggleSelect={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
          />
        </div>
      </div>
    </div>
  );
}

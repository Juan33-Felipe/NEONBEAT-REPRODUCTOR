import { Mood } from "../services/moodDetector";
import { Track } from "../shared/Models";
import { formatTime } from "../utils/formatTime";
import { Ring } from "./Ring";
import { Bars } from "./Bars";

interface Props {
  mood: Mood;
  playing: boolean;
  currentTrack: Track | null;
  pct: number;
  progress: number;
  duration: number;
  volume: number;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
}

export function PlayerControls({
  mood, playing, currentTrack,
  pct, progress, duration, volume,
  onToggle, onPrev, onNext, onSeek, onVolumeChange,
}: Props) {
  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      maxWidth: "500px",
      padding: "20px"
    }}>
      
      {/* VISUALIZADOR */}
      <div style={{ 
        position: "relative", 
        width: "200px", 
        height: "200px", 
        marginBottom: "20px" 
      }}>
        <Ring 
          progress={pct} 
          mood={mood} 
          playing={playing} 
        />
      </div>

      <div style={{ 
        width: "100px", 
        height: "40px", 
        marginBottom: "20px" 
      }}>
        <Bars 
          playing={playing} 
          mood={mood} 
        />
      </div>

      {/* TEXTO DE CANCIÓN */}
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <h1 style={{ 
          fontSize: "26px", 
          fontWeight: 800,
          color: "var(--text-main)", 
          margin: "0 0 8px 0",
          transition: "color 0.3s ease"
        }}>
          {currentTrack?.title ?? "Sin selección"}
        </h1>
        <p style={{ 
          fontSize: "11px", 
          color: mood.primary, 
          fontFamily: "var(--font-mono)", 
          textTransform: "uppercase", 
          letterSpacing: "4px"
        }}>
          {currentTrack ? (playing ? "Reproduciendo" : "Pausado") : "Listo"}
        </p>
      </div>

      {/* BARRA DE PROGRESO */}
      <div style={{ width: "100%", marginBottom: "30px" }}>
        <div 
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            onSeek((x / rect.width) * duration);
          }}
          style={{
            width: "100%", 
            height: "4px", 
            background: "var(--border-faint)",
            borderRadius: "2px", 
            cursor: "pointer", 
            position: "relative",
            overflow: "hidden"
          }}
        >
          <div style={{
            width: `${pct}%`, 
            height: "100%", 
            background: mood.primary,
            boxShadow: `0 0 10px ${mood.primary}`,
            transition: "width 0.1s linear"
          }} />
        </div>
        
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          marginTop: "10px",
          fontSize: "10px", 
          fontFamily: "var(--font-mono)", 
          color: "var(--text-muted)"
        }}>
          <span>{formatTime(progress)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* BOTONES DE CONTROL */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: "40px" 
      }}>
        <button 
          onClick={onPrev}
          style={{ 
            background: "none", 
            border: "none", 
            color: "var(--text-main)", 
            fontSize: "24px", 
            cursor: "pointer" 
          }}
        >
          ⏮
        </button>
        
        <button 
          onClick={onToggle}
          style={{ 
            width: "64px", 
            height: "64px", 
            borderRadius: "50%", 
            background: mood.primary,
            border: "none", 
            color: "#000", 
            fontSize: "24px", 
            cursor: "pointer",
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            boxShadow: `0 4px 15px ${mood.primary}40`
          }}
        >
          {playing ? "⏸" : "▶"}
        </button>

        <button 
          onClick={onNext}
          style={{ 
            background: "none", 
            border: "none", 
            color: "var(--text-main)", 
            fontSize: "24px", 
            cursor: "pointer" 
          }}
        >
          ⏭
        </button>
      </div>

      {/* VOLUMEN */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: "12px", 
        width: "160px", 
        marginTop: "40px" 
      }}>
        <span style={{ fontSize: "14px", color: mood.primary }}>🔈</span>
        <input
          type="range" 
          min="0" 
          max="1" 
          step="0.01" 
          value={volume}
          onChange={e => onVolumeChange(parseFloat(e.target.value))}
          style={{
            flex: 1, 
            height: "4px", 
            cursor: "pointer", 
            outline: "none", 
            appearance: "none",
            background: `linear-gradient(to right, ${mood.primary} ${volume * 100}%, var(--border-faint) ${volume * 100}%)`,
            color: mood.primary,      
            accentColor: mood.primary
          }}
        />
      </div>
    </div>
  );
}
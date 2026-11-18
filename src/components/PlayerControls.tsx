import { useState } from "react";
import { Mood } from "../services/moodDetector";
import { RepeatMode, Track } from "../shared/Models";
import { formatTime } from "../utils/formatTime";
import { AlbumCover } from "./AlbumCover";
import {
  ExpandIcon,
  HeartIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  RepeatIcon,
  ShuffleIcon,
  VolumeIcon,
} from "./Icons";

interface Props {
  mood: Mood;
  playing: boolean;
  currentTrack: Track | null;
  currentIndex?: number;
  pct: number;
  progress: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeatMode: RepeatMode;
  playbackRate: number;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onPlaybackRateChange: (rate: number) => void;
  onToggleFavorite?: (id: string) => void;
}

const RATES = [0.75, 1, 1.25, 1.5, 2];

export function PlayerControls({
  playing,
  currentTrack,
  currentIndex = 0,
  pct,
  progress,
  duration,
  volume,
  muted,
  shuffle,
  repeatMode,
  playbackRate,
  onToggle,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onCycleRepeat,
  onPlaybackRateChange,
  onToggleFavorite,
}: Props) {
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPct, setHoverPct] = useState<number>(0);

  const effectiveVolume = muted ? 0 : volume;

  const cycleRate = () => {
    const idx = RATES.indexOf(playbackRate);
    const next = RATES[(idx + 1) % RATES.length];
    onPlaybackRateChange(next);
  };

  return (
    <footer
      style={{
        width: "100%",
        height: "92px",
        borderRadius: "26px",
        background: "rgba(255, 255, 255, 0.06)",
        backdropFilter: "blur(42px) saturate(195%)",
        WebkitBackdropFilter: "blur(42px) saturate(195%)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        boxShadow: "0 18px 44px rgba(0, 0, 0, 0.36), inset 0 1px 1px rgba(255, 255, 255, 0.24)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        position: "relative",
        zIndex: 30,
        userSelect: "none",
        flexShrink: 0,
        gap: "24px",
      }}
    >
      {/* LEFT: ACTIVE TRACK THUMBNAIL + TITLE & ARTIST */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          width: "25%",
          minWidth: "220px",
          zIndex: 2,
        }}
      >
        <AlbumCover
          track={currentTrack}
          index={currentIndex >= 0 ? currentIndex : 0}
          size={56}
          borderRadius={14}
          showBadgeNumber={false}
        />

        <div style={{ overflow: "hidden", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <p
              style={{
                fontSize: "16px",
                fontWeight: 800,
                color: "#ffffff",
                margin: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {currentTrack?.title ?? "Sin reproducción"}
            </p>
            {currentTrack && onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(currentTrack.id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: currentTrack.favorite ? "#1ED760" : "rgba(255,255,255,0.5)",
                  display: "flex",
                  alignItems: "center",
                  padding: "2px",
                }}
              >
                <HeartIcon
                  size={16}
                  filled={!!currentTrack.favorite}
                  color={currentTrack.favorite ? "#1ED760" : "currentColor"}
                />
              </button>
            )}
          </div>
          <p
            style={{
              fontSize: "13.5px",
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.6)",
              margin: "3px 0 0 0",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {currentTrack
              ? currentTrack.artist || currentTrack.fileName
              : "Ningún archivo seleccionado"}
          </p>
        </div>
      </div>

      {/* CENTER: DOUBLE-RING GREEN PLAY BUTTON + INLINE PROGRESS BAR (Matches new reference) */}
      <div
        style={{
          flex: 1,
          maxWidth: "680px",
          display: "flex",
          alignItems: "center",
          gap: "20px",
          zIndex: 2,
        }}
      >
        {/* Transport cluster */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={onPrev}
            title="Anterior (P)"
            style={{
              background: "none",
              border: "none",
              color: "rgba(255, 255, 255, 0.85)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "4px",
            }}
          >
            <PrevIcon size={18} />
          </button>

          {/* Double-Ring Glowing Green Play/Pause Button */}
          <div
            style={{
              width: "58px",
              height: "58px",
              borderRadius: "50%",
              background: "rgba(30, 215, 96, 0.22)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 28px rgba(30, 215, 96, 0.35)",
            }}
          >
            <button
              onClick={onToggle}
              title={playing ? "Pausar (Espacio)" : "Reproducir (Espacio)"}
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "#1ED760",
                border: "none",
                color: "#041f11",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.15s ease",
              }}
            >
              {playing ? <PauseIcon size={20} color="#041f11" /> : <PlayIcon size={20} color="#041f11" />}
            </button>
          </div>

          <button
            onClick={onNext}
            title="Siguiente (N)"
            style={{
              background: "none",
              border: "none",
              color: "rgba(255, 255, 255, 0.85)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "4px",
            }}
          >
            <NextIcon size={18} />
          </button>
        </div>

        {/* Inline Progress Bar */}
        <span
          style={{
            fontSize: "13px",
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            color: "rgba(255, 255, 255, 0.65)",
            minWidth: "36px",
            textAlign: "right",
          }}
        >
          {formatTime(progress)}
        </span>

        <div
          onMouseMove={(e) => {
            if (!duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            setHoverPct(ratio * 100);
            setHoverTime(ratio * duration);
          }}
          onMouseLeave={() => setHoverTime(null)}
          onClick={(e) => {
            if (!duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            onSeek(ratio * duration);
          }}
          style={{
            flex: 1,
            height: "18px",
            display: "flex",
            alignItems: "center",
            cursor: duration > 0 ? "pointer" : "default",
            position: "relative",
          }}
        >
          {hoverTime !== null && duration > 0 && (
            <div
              style={{
                position: "absolute",
                bottom: "24px",
                left: `${Math.max(3, Math.min(97, hoverPct))}%`,
                transform: "translateX(-50%)",
                background: "rgba(18, 14, 28, 0.92)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                padding: "3px 9px",
                borderRadius: "8px",
                pointerEvents: "none",
              }}
            >
              {formatTime(hoverTime)}
            </div>
          )}

          <div
            style={{
              width: "100%",
              height: "5px",
              background: "rgba(255, 255, 255, 0.16)",
              borderRadius: "999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: "#ffffff",
                borderRadius: "999px",
                boxShadow: "0 0 10px rgba(255, 255, 255, 0.8)",
                transition: "width 0.08s linear",
              }}
            />
          </div>
        </div>

        <span
          style={{
            fontSize: "13px",
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            color: "rgba(255, 255, 255, 0.65)",
            minWidth: "36px",
          }}
        >
          {formatTime(duration)}
        </span>

        {/* Shuffle & Repeat right next to progress bar (matches reference) */}
        <button
          onClick={onToggleShuffle}
          title={shuffle ? "Aleatorio activado (S)" : "Modo aleatorio (S)"}
          style={{
            background: "none",
            border: "none",
            color: shuffle ? "#1ED760" : "rgba(255, 255, 255, 0.6)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            padding: "4px",
          }}
        >
          <ShuffleIcon size={17} />
        </button>

        <button
          onClick={onCycleRepeat}
          title={
            repeatMode === "off"
              ? "Repetir desactivado (R)"
              : repeatMode === "all"
              ? "Repetir cola (R)"
              : "Repetir pista (R)"
          }
          style={{
            background: "none",
            border: "none",
            color: repeatMode !== "off" ? "#1ED760" : "rgba(255, 255, 255, 0.6)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            padding: "4px",
          }}
        >
          <RepeatIcon size={17} one={repeatMode === "one"} />
        </button>
      </div>

      {/* RIGHT: SPEED, VOLUME & EXPAND */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "16px",
          width: "22%",
          minWidth: "200px",
          zIndex: 2,
        }}
      >
        <button
          onClick={cycleRate}
          title="Velocidad de reproducción"
          style={{
            background: "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            borderRadius: "999px",
            color: playbackRate !== 1 ? "#1ED760" : "#ffffff",
            fontSize: "12.5px",
            fontWeight: 800,
            fontFamily: "var(--font-mono)",
            padding: "4px 12px",
            cursor: "pointer",
          }}
        >
          {playbackRate}x
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "125px" }}>
          <button
            onClick={onToggleMute}
            title={muted ? "Activar sonido (M)" : "Silenciar (M)"}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255, 255, 255, 0.8)",
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
            }}
          >
            <VolumeIcon
              size={18}
              color="rgba(255, 255, 255, 0.8)"
              level={effectiveVolume}
              muted={muted}
            />
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={effectiveVolume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            style={{
              flex: 1,
              height: "4px",
              background: `linear-gradient(to right, #ffffff ${
                effectiveVolume * 100
              }%, rgba(255,255,255,0.22) ${effectiveVolume * 100}%)`,
              color: "#ffffff",
            }}
          />
        </div>

        <button
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {});
            } else {
              document.exitFullscreen().catch(() => {});
            }
          }}
          title="Pantalla completa"
          style={{
            background: "none",
            border: "none",
            color: "rgba(255, 255, 255, 0.65)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            padding: "6px",
          }}
        >
          <ExpandIcon size={16} />
        </button>
      </div>
    </footer>
  );
}

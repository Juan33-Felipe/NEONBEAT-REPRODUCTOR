import { useState } from "react";
import { Track } from "../shared/Models";
import { Mood } from "../services/moodDetector";
import { formatTime } from "../utils/formatTime";
import { AlbumCover } from "./AlbumCover";
import { Bars } from "./Bars";
import {
  ArrowRightIcon,
  CloseIcon,
  HeartIcon,
  MoreHorizontalIcon,
  PauseIcon,
  PlayIcon,
  ShareIcon,
} from "./Icons";

export type QueueView = "ahora" | "próximas" | "historial";

interface Props {
  tracks: Track[];
  history: Track[];
  currentIndex: number;
  playing: boolean;
  progress: number;
  duration: number;
  pct: number;
  mood: Mood;
  view: QueueView;
  onSetView: (v: QueueView) => void;
  onPlayAt: (i: number) => void;
  onRemoveTrack: (i: number) => void;
  onReorder?: (draggedIndex: number, targetIndex: number) => void;
  onClearQueue?: () => void;
  onPlayHistoryTrack?: (track: Track) => void;
  onClearHistory?: () => void;
  onTogglePlay?: () => void;
  onToggleFavorite?: (id: string) => void;
}

export function QueuePanel({
  tracks,
  history,
  currentIndex,
  playing,
  duration,
  mood,
  view,
  onSetView,
  onPlayAt,
  onRemoveTrack,
  onReorder,
  onClearQueue,
  onPlayHistoryTrack,
  onClearHistory,
  onTogglePlay,
  onToggleFavorite,
}: Props) {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const currentTrack = tracks[currentIndex] ?? null;
  const upcomingTracks = tracks.slice(currentIndex + 1);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "18px 24px 22px 24px",
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      {/* TOP STATUS HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "18px",
          color: "rgba(255,255,255,0.65)",
          fontSize: "13.5px",
          fontWeight: 700,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ color: "#1ED760", fontWeight: 900, fontSize: "16px" }}>∿</span>
          <span>
            {currentTrack
              ? `Sonando • ${currentTrack.artist || "Biblioteca"}`
              : "Frecuencia • En espera"}
          </span>
        </div>
        <ArrowRightIcon size={16} color="rgba(255,255,255,0.55)" />
      </div>

      {/* TRANSLUCENT FROSTED GLASS WAVEFORM CARD */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.075)",
          backdropFilter: "blur(28px) saturate(185%)",
          WebkitBackdropFilter: "blur(28px) saturate(185%)",
          border: "1px solid rgba(255, 255, 255, 0.16)",
          borderRadius: "28px",
          padding: "22px 0 20px 0",
          marginBottom: "24px",
          boxShadow: "0 20px 46px rgba(0, 0, 0, 0.32), inset 0 1px 1px rgba(255, 255, 255, 0.22)",
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {/* Card Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 22px",
            marginBottom: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px", overflow: "hidden" }}>
            <AlbumCover
              track={currentTrack}
              index={currentIndex >= 0 ? currentIndex : 1}
              size={46}
              borderRadius={12}
              showBadgeNumber={false}
            />
            <div style={{ overflow: "hidden" }}>
              <p
                style={{
                  fontSize: "15.5px",
                  fontWeight: 800,
                  color: "#ffffff",
                  margin: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {currentTrack ? currentTrack.title : "Sin pista activa"}
              </p>
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.6)",
                  margin: "3px 0 0 0",
                }}
              >
                {currentTrack
                  ? `${currentTrack.format || "AUDIO"} • ${formatTime(duration)}`
                  : "0:00"}
              </p>
            </div>
          </div>
          <MoreHorizontalIcon size={18} color="rgba(255,255,255,0.6)" />
        </div>

        {/* Smooth Glowing Bezier Curve */}
        <div style={{ width: "100%", height: "118px", margin: "4px 0" }}>
          <Bars playing={playing} mood={mood} height={118} />
        </div>

        {/* Card Footer Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 22px 0 22px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => currentTrack && onToggleFavorite && onToggleFavorite(currentTrack.id)}
              title="Favorito"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.16)",
                color: currentTrack?.favorite ? "#1ED760" : "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <HeartIcon
                size={15}
                filled={!!currentTrack?.favorite}
                color={currentTrack?.favorite ? "#1ED760" : "#ffffff"}
              />
            </button>
            <button
              onClick={() => onSetView(view === "próximas" ? "ahora" : "próximas")}
              title="Alternar cola"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.16)",
                color: "rgba(255,255,255,0.85)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <ShareIcon size={15} />
            </button>
          </div>

          <button
            onClick={onTogglePlay}
            title={playing ? "Pausar" : "Reproducir"}
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "50%",
              background: "#1ED760",
              border: "none",
              color: "#041f11",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 8px 22px rgba(30, 215, 96, 0.45)",
              transition: "transform 0.15s ease",
            }}
          >
            {playing ? <PauseIcon size={19} color="#041f11" /> : <PlayIcon size={19} color="#041f11" />}
          </button>
        </div>
      </div>

      {/* TABS HEADER (Cola / Próximas / Historial) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: "18px" }}>
          {(
            [
              { id: "ahora", label: "Cola" },
              { id: "próximas", label: `Próximas${upcomingTracks.length ? ` (${upcomingTracks.length})` : ""}` },
              { id: "historial", label: "Historial" },
            ] as { id: QueueView; label: string }[]
          ).map((tab) => {
            const active = view === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSetView(tab.id)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: "15px",
                  fontWeight: active ? 800 : 600,
                  color: active ? "#ffffff" : "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  transition: "color 0.2s",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {view === "próximas" && upcomingTracks.length > 0 && onClearQueue && (
          <button
            onClick={onClearQueue}
            style={{
              background: "none",
              border: "none",
              color: "#1ED760",
              fontSize: "13px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Limpiar
          </button>
        )}

        {view === "historial" && history.length > 0 && onClearHistory && (
          <button
            onClick={onClearHistory}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.6)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Limpiar
          </button>
        )}
      </div>

      {/* TRACK LIST IN GLASS PILLS */}
      <div style={{ flex: 1, overflowY: "auto" }} className="scrollable-content">
        {view === "ahora" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {tracks.length > 0 ? (
              tracks.map((t, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <div
                    key={`${t.id}-${idx}`}
                    onClick={() => onPlayAt(idx)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      padding: "9px 12px",
                      borderRadius: "14px",
                      cursor: "pointer",
                      background: isActive
                        ? "rgba(30, 215, 96, 0.16)"
                        : "rgba(255, 255, 255, 0.06)",
                      border: `1px solid ${
                        isActive ? "rgba(30, 215, 96, 0.45)" : "rgba(255, 255, 255, 0.1)"
                      }`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
                      <AlbumCover
                        track={t}
                        index={idx}
                        size={34}
                        borderRadius={9}
                        showBadgeNumber={false}
                      />
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: isActive ? 800 : 600,
                          color: isActive ? "#1ED760" : "#ffffff",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {t.title}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.55)",
                        flexShrink: 0,
                      }}
                    >
                      {t.format || "MP3"}
                    </span>
                  </div>
                );
              })
            ) : (
              <p style={{ fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,0.55)", marginTop: "12px" }}>
                No hay canciones en la cola activa.
              </p>
            )}
          </div>
        )}

        {view === "próximas" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {upcomingTracks.length > 0 ? (
              upcomingTracks.map((t, i) => {
                const actualIndex = currentIndex + 1 + i;
                const isDragOver = dragOverIdx === actualIndex;
                return (
                  <div
                    key={`${t.id}-${actualIndex}`}
                    draggable
                    onDragStart={() => setDraggedIdx(actualIndex)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverIdx(actualIndex);
                    }}
                    onDragLeave={() => setDragOverIdx(null)}
                    onDrop={() => {
                      if (draggedIdx !== null && onReorder && draggedIdx !== actualIndex) {
                        onReorder(draggedIdx, actualIndex);
                      }
                      setDraggedIdx(null);
                      setDragOverIdx(null);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      padding: "9px 12px",
                      borderRadius: "14px",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderTop: isDragOver ? "2px solid #1ED760" : undefined,
                      cursor: "grab",
                    }}
                  >
                    <div
                      onClick={() => onPlayAt(actualIndex)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        overflow: "hidden",
                        flex: 1,
                        cursor: "pointer",
                      }}
                    >
                      <AlbumCover
                        track={t}
                        index={actualIndex}
                        size={34}
                        borderRadius={9}
                        showBadgeNumber={false}
                      />
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#ffffff",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {t.title}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveTrack(actualIndex);
                      }}
                      title="Quitar de la cola"
                      style={{
                        background: "none",
                        border: "none",
                        color: "rgba(255,255,255,0.55)",
                        cursor: "pointer",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <CloseIcon size={15} />
                    </button>
                  </div>
                );
              })
            ) : (
              <p style={{ fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,0.55)", marginTop: "12px" }}>
                No hay pistas siguientes en cola.
              </p>
            )}
          </div>
        )}

        {view === "historial" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {history.length > 0 ? (
              history.map((t, i) => (
                <div
                  key={`${t.id}-${i}`}
                  onClick={() => onPlayHistoryTrack && onPlayHistoryTrack(t)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "9px 12px",
                    borderRadius: "14px",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
                    <AlbumCover
                      track={t}
                      index={i}
                      size={34}
                      borderRadius={9}
                      showBadgeNumber={false}
                    />
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#ffffff",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {t.title}
                    </span>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.55)" }}>
                    Reciente
                  </span>
                </div>
              ))
            ) : (
              <p style={{ fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,0.55)", marginTop: "12px" }}>
                El historial está vacío.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { Track } from "../shared/Models";
import { Mood } from "../services/moodDetector";

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
}

export function QueuePanel({ 
  tracks, 
  history, 
  currentIndex, 
  mood, 
  view, 
  onSetView, 
  onPlayAt, 
  onRemoveTrack,
  onReorder 
}: Props) {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const currentTrack = tracks[currentIndex] ?? null;

  return (
    <div style={{ 
      width: "320px", 
      flexShrink: 0, 
      background: "var(--bg-panel)", 
      display: "flex", 
      flexDirection: "column", 
      height: "100%" 
    }}>
      {/* SELECTOR DE VISTA */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border-faint)", flexShrink: 0 }}>
        {(["ahora", "próximas", "historial"] as QueueView[]).map((v) => (
          <button 
            key={v} 
            onClick={() => onSetView(v)} 
            style={{ 
              flex: 1, 
              background: "none", 
              border: "none", 
              padding: "12px 0",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "1px",
              textTransform: "uppercase",
              cursor: "pointer",
              color: view === v ? mood.primary : "var(--text-muted)",
              borderBottom: `2px solid ${view === v ? mood.primary : "transparent"}`,
              transition: "all 0.3s"
            }}
          >
            {v}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto" }} className="scrollable-content">
        
        {/* VISTA: REPRODUCIENDO */}
        {view === "ahora" && currentTrack && (
          <div style={{ padding: "24px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "12px" }}>
              Sonando ahora
            </p>
            <div style={{ 
              background: "var(--bg-card)", 
              padding: "16px", 
              borderRadius: "4px", 
              border: `1px solid ${mood.primary}40` 
            }}>
              <p style={{ fontSize: "14px", color: mood.primary, fontWeight: 600, margin: 0 }}>
                {currentTrack.title}
              </p>
              <p style={{ fontSize: "11px", color: "var(--text-main)", marginTop: "4px", opacity: 0.8 }}>
                {currentTrack.fileName}
              </p>
            </div>
          </div>
        )}

        {/* VISTA: PRÓXIMAS */}
        {view === "próximas" && (
          <div style={{ padding: "7px 0" }}>
            {tracks.slice(currentIndex + 1).length > 0 ? (
              tracks.slice(currentIndex + 1).map((t, i) => {
                const actualIndex = currentIndex + 1 + i;
                return (
                  <div 
                    key={t.id} 
                    draggable 
                    onDragStart={() => setDraggedIdx(actualIndex)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedIdx !== null && onReorder && draggedIdx !== actualIndex) {
                        onReorder(draggedIdx, actualIndex);
                      }
                      setDraggedIdx(null);
                    }}
                    style={{ 
                      display: "flex", 
                      padding: "0 16px", 
                      height: "48px",
                      alignItems: "center", 
                      borderBottom: "1px solid var(--border-faint)",
                      cursor: "grab",
                      background: draggedIdx === actualIndex ? "rgba(255,255,255,0.1)" : "transparent",
                      transition: "background 0.2s"
                    }}
                  >
                    <p 
                      style={{ 
                        flex: 1, 
                        fontSize: "11px", 
                        color: "var(--text-main)", 
                        cursor: "pointer",
                        margin: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }} 
                      onClick={() => onPlayAt(actualIndex)}
                    >
                      {t.title}
                    </p>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveTrack(actualIndex);
                      }} 
                      style={{ 
                        background: "none", 
                        border: "none", 
                        color: "#ff5a5a", 
                        cursor: "pointer", 
                        fontSize: "16px", 
                        width: "32px",    
                        height: "32px",   
                        display: "flex",  
                        alignItems: "center", 
                        justifyContent: "center",
                        padding: "0",     
                        flexShrink: 0
                      }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })
            ) : (
              <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "12px", marginTop: "40px" }}>No hay canciones en cola</p>
            )}
          </div>
        )}

        {/* VISTA: HISTORIAL */}
        {view === "historial" && (
          <div style={{ padding: "8px 0" }}>
            {history.length > 0 ? (
              history.map((t, i) => (
                <div key={`${t.id}-${i}`} style={{ display: "flex", padding: "12px 16px", alignItems: "center", borderBottom: "1px solid var(--border-faint)" }}>
                  <p 
                    style={{ 
                      flex: 1, 
                      fontSize: "12px", 
                      color: "var(--text-main)", 
                      cursor: "pointer",
                      margin: 0
                    }}
                    onClick={() => {}}
                  >
                    {t.title}
                  </p>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Visto</span>
                </div>
              ))
            ) : (
              <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "12px", marginTop: "40px" }}>El historial está vacío</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

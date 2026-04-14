import { useState } from "react";
import { Track } from "../shared/Models";
import { Mood } from "../services/moodDetector";

interface Props {
  tracks: Track[];
  currentIndex: number;
  playing: boolean;
  mood: Mood;
  onPlayAt: (i: number) => void;
  onRemoveTrack: (i: number) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
}

export function AllTracksList({ 
  tracks, 
  currentIndex, 
  playing, 
  mood, 
  onPlayAt, 
  onRemoveTrack, 
  selectedIds, 
  onToggleSelect 
}: Props) {
  const [query, setQuery] = useState("");

  const filteredTracks = tracks.filter(t => 
    t.title.toLowerCase().includes(query.toLowerCase()) || 
    t.fileName.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      
      {/* BARRA DE BÚSQUEDA */}
      <div style={{ padding: "16px 16px 8px 16px" }}>
        <input 
          type="text"
          placeholder="Buscar en la biblioteca..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%",
            background: "var(--bg-panel)",
            border: `1px solid var(--border-faint)`,
            borderRadius: "4px",
            padding: "8px 12px",
            color: "var(--text-main)",
            fontSize: "14px",
            outline: "none",
          }}
        />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {filteredTracks.map((track) => {
          const originalIndex = tracks.findIndex(t => t.id === track.id);
          const isSelected = selectedIds.includes(track.id);
          const isCurrent = currentIndex === originalIndex;

          return (
            <div 
              key={track.id} 
              style={{ 
                display: "flex", 
                alignItems: "center", 
                padding: "8px 16px", 
                gap: "12px", 
                background: isSelected ? `${mood.primary}15` : "transparent"
              }}
            >
              <div 
                onClick={() => onToggleSelect(track.id)}
                style={{
                  width: "16px", height: "16px", 
                  border: `1px solid ${isSelected ? mood.primary : "var(--text-muted)"}`,
                  borderRadius: "3px", cursor: "pointer", 
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isSelected ? mood.primary : "transparent", 
                  flexShrink: 0,
                }}
              >
                {isSelected && (
                  <div style={{ width: "6px", height: "6px", background: "#000", borderRadius: "1px" }} />
                )}
              </div>

              <div style={{ flex: 1, cursor: "pointer", overflow: "hidden" }} onClick={() => onPlayAt(originalIndex)}>
                <p style={{ 
                  fontSize: "13px", 
                  margin: 0,
                  color: isCurrent ? mood.primary : "var(--text-main)", 
                  whiteSpace: "nowrap", 
                  overflow: "hidden", 
                  textOverflow: "ellipsis",
                  fontWeight: isCurrent ? 600 : 400
                }}>
                  {track.title}
                </p>
                <p style={{ fontSize: "10px", margin: 0, color: "var(--text-muted)" }}>
                  {track.fileName}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
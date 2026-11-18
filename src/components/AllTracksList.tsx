import { Track } from "../shared/Models";
import { Mood } from "../services/moodDetector";
import { AlbumCover } from "./AlbumCover";
import {
  CloseIcon,
  FileMusicIcon,
  FolderIcon,
  HeartIcon,
  MoreHorizontalIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  QueueNextIcon,
} from "./Icons";

export type BrowseSection =
  | "home"
  | "albums"
  | "tracks"
  | "genres"
  | "recent"
  | "favorites"
  | "charts"
  | "radio";

interface Props {
  tracks: Track[];
  currentTrackId?: string | null;
  currentIndex: number;
  playing: boolean;
  mood: Mood;
  searchQuery?: string;
  activeSection?: BrowseSection;
  onPlayAt: (i: number) => void;
  onRemoveTrack: (i: number) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll?: (ids: string[]) => void;
  onEnqueueTrack?: (track: Track) => void;
  onPlayNextTrack?: (track: Track) => void;
  onToggleFavorite?: (id: string) => void;
  onEditTrack?: (track: Track) => void;
  onRequestLoadFiles?: () => void;
  onRequestLoadFolder?: () => void;
  onTogglePlay?: () => void;
}

export function AllTracksList({
  tracks,
  currentTrackId,
  currentIndex,
  playing,
  searchQuery = "",
  activeSection = "albums",
  onPlayAt,
  onRemoveTrack,
  selectedIds,
  onToggleSelect,
  onEnqueueTrack,
  onPlayNextTrack,
  onToggleFavorite,
  onEditTrack,
  onRequestLoadFiles,
  onRequestLoadFolder,
  onTogglePlay,
}: Props) {
  const q = searchQuery.toLowerCase().trim();

  const filteredTracks = tracks.filter((t) => {
    if (activeSection === "favorites" && !t.favorite) return false;
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      t.fileName.toLowerCase().includes(q) ||
      (t.artist && t.artist.toLowerCase().includes(q))
    );
  });

  const activeTrack = tracks.find((t) => t.id === currentTrackId) ?? tracks[0] ?? null;
  const favCount = tracks.filter((t) => t.favorite).length;

  const bannerSubtitle =
    tracks.length > 0
      ? tracks
          .slice(0, 6)
          .map((t) => t.title)
          .join(", ")
      : "Carga una carpeta o selecciona archivos de audio locales para comenzar.";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflowY: "auto",
        padding: "18px 28px 28px 28px",
        userSelect: "none",
      }}
      className="scrollable-content"
    >
      {/* SECTION HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "14px",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "28px",
            fontWeight: 900,
            color: "#ffffff",
            margin: 0,
            letterSpacing: "-0.4px",
          }}
        >
          {activeSection === "favorites"
            ? "Favorite Songs"
            : activeSection === "recent"
            ? "Recently Played"
            : activeSection === "tracks"
            ? "All Tracks"
            : "Home"}
        </h2>
        <span style={{ fontSize: "13.5px", fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>
          {favCount} Favoritos • {tracks.length} {tracks.length === 1 ? "Canción" : "Canciones"}
        </span>
      </div>

      {/* TRANSLUCENT GLASS HERO BANNER */}
      <div
        style={{
          width: "100%",
          minHeight: "268px",
          borderRadius: "28px",
          background:
            "linear-gradient(125deg, rgba(234, 106, 71, 0.58) 0%, rgba(175, 52, 102, 0.46) 55%, rgba(92, 34, 142, 0.42) 100%)",
          backdropFilter: "blur(28px) saturate(185%)",
          WebkitBackdropFilter: "blur(28px) saturate(185%)",
          border: "1px solid rgba(255, 255, 255, 0.22)",
          position: "relative",
          overflow: "hidden",
          padding: "34px 40px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          marginBottom: "28px",
          boxShadow:
            "0 24px 55px rgba(0, 0, 0, 0.38), inset 0 1px 1px rgba(255, 255, 255, 0.32)",
          flexShrink: 0,
        }}
      >
        {/* Stylized Vector Illustration */}
        <svg
          viewBox="0 0 340 260"
          style={{
            position: "absolute",
            right: "0",
            bottom: "0",
            height: "100%",
            width: "auto",
            pointerEvents: "none",
          }}
        >
          <defs>
            <linearGradient id="suitGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#D91E2A" />
              <stop offset="50%" stopColor="#9E0B16" />
              <stop offset="100%" stopColor="#3B0307" />
            </linearGradient>
            <linearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#B85D38" />
              <stop offset="100%" stopColor="#4A1D0E" />
            </linearGradient>
          </defs>
          <path
            d="M148 54 C142 28, 175 12, 200 18 C222 10, 258 24, 255 52 C272 65, 268 96, 250 112 C230 120, 160 110, 148 54 Z"
            fill="#1D0F0D"
          />
          <circle cx="165" cy="32" r="16" fill="#23120F" />
          <circle cx="195" cy="24" r="18" fill="#1A0D0B" />
          <circle cx="228" cy="34" r="17" fill="#23120F" />
          <circle cx="248" cy="58" r="16" fill="#1A0D0B" />
          <path
            d="M152 68 C146 105, 152 142, 174 150 C196 156, 224 140, 232 110 C236 82, 212 56, 175 58 Z"
            fill="url(#skinGrad)"
          />
          <g transform="rotate(8 182 96)">
            <rect
              x="136"
              y="82"
              width="34"
              height="24"
              rx="5"
              fill="#120907"
              stroke="#E89954"
              strokeWidth="2.5"
            />
            <rect
              x="176"
              y="84"
              width="34"
              height="24"
              rx="5"
              fill="#120907"
              stroke="#E89954"
              strokeWidth="2.5"
            />
            <line x1="170" y1="92" x2="176" y2="92" stroke="#E89954" strokeWidth="2.5" />
            <line x1="210" y1="94" x2="232" y2="90" stroke="#E89954" strokeWidth="2.5" />
            <path d="M142 86 L154 102" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
            <path d="M182 88 L194 104" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
          </g>
          <path d="M175 152 L168 260 L230 260 L224 145 Z" fill="#120808" />
          <path
            d="M190 154 C235 148, 305 162, 336 205 L340 260 L176 260 Z"
            fill="url(#suitGrad)"
          />
          <path
            d="M192 154 L218 260"
            stroke="#FF5A52"
            strokeWidth="2"
            opacity="0.45"
          />
        </svg>

        {/* Left Content of Banner */}
        <div style={{ position: "relative", zIndex: 2, maxWidth: "68%" }}>
          <p
            style={{
              fontSize: "11.5px",
              fontWeight: 800,
              letterSpacing: "1.8px",
              textTransform: "uppercase",
              color: "rgba(255, 255, 255, 0.8)",
              margin: "0 0 12px 0",
            }}
          >
            {activeTrack ? "REPRODUCIENDO AHORA" : "BIBLIOTECA MUSICAL"}
          </p>

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "36px",
              fontWeight: 900,
              color: "#ffffff",
              margin: "0 0 10px 0",
              letterSpacing: "-0.5px",
              lineHeight: 1.1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {activeTrack ? activeTrack.title : "Sin pistas cargadas"}
          </h1>

          <p
            style={{
              fontSize: "14.5px",
              fontWeight: 600,
              lineHeight: 1.55,
              color: "rgba(255, 255, 255, 0.85)",
              margin: 0,
              whiteSpace: "pre-line",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {bannerSubtitle}
          </p>
        </div>

        {/* Bottom Actions on Banner (PLAY Pill + Glass Heart + More, matching reference) */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            gap: "14px",
            marginTop: "22px",
          }}
        >
          <button
            onClick={() => {
              if (activeTrack && onTogglePlay) {
                onTogglePlay();
              } else if (onRequestLoadFiles) {
                onRequestLoadFiles();
              }
            }}
            style={{
              padding: "10px 28px",
              borderRadius: "999px",
              background: "#1ED760",
              border: "none",
              color: "#041f11",
              fontSize: "13.5px",
              fontWeight: 900,
              letterSpacing: "1px",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(30, 215, 96, 0.45)",
              transition: "transform 0.15s ease",
            }}
          >
            {activeTrack ? (playing ? "PAUSE" : "PLAY") : "CARGAR"}
          </button>

          <button
            onClick={() => {
              if (activeTrack && onToggleFavorite) {
                onToggleFavorite(activeTrack.id);
              }
            }}
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.18)",
              backdropFilter: "blur(14px)",
              border: "1px solid rgba(255, 255, 255, 0.28)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: activeTrack ? "pointer" : "default",
              color: "#ffffff",
            }}
          >
            <HeartIcon size={16} filled={!!activeTrack?.favorite} color="#ffffff" />
          </button>

          <div
            onClick={() => {
              if (activeTrack && onEditTrack) {
                onEditTrack(activeTrack);
              }
            }}
            title={activeTrack ? "Editar título y artista" : undefined}
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(14px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              cursor: activeTrack && onEditTrack ? "pointer" : "default",
            }}
          >
            <MoreHorizontalIcon size={16} />
          </div>
        </div>
      </div>

      {/* CONTENT AREA: EMPTY STATE OR USER TRACKS */}
      {tracks.length === 0 ? (
        <div
          style={{
            flex: 1,
            minHeight: "250px",
            borderRadius: "28px",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            background: "rgba(255, 255, 255, 0.065)",
            backdropFilter: "blur(28px) saturate(180%)",
            WebkitBackdropFilter: "blur(28px) saturate(180%)",
            boxShadow: "0 18px 40px rgba(0, 0, 0, 0.28), inset 0 1px 1px rgba(255, 255, 255, 0.2)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "44px 30px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "21px",
              fontWeight: 800,
              color: "#ffffff",
              margin: "0 0 8px 0",
            }}
          >
            Tu biblioteca está vacía
          </p>
          <p
            style={{
              fontSize: "14.5px",
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.65)",
              maxWidth: "430px",
              lineHeight: 1.55,
              margin: "0 0 24px 0",
            }}
          >
            Selecciona archivos de audio o una carpeta completa desde tu equipo, o arrástralos directamente a la ventana.
          </p>
          <div style={{ display: "flex", gap: "14px" }}>
            {onRequestLoadFolder && (
              <button
                onClick={onRequestLoadFolder}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid rgba(255, 255, 255, 0.22)",
                  borderRadius: "999px",
                  color: "#ffffff",
                  padding: "12px 24px",
                  fontSize: "14.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <FolderIcon size={17} color="#1ED760" />
                <span>Cargar Carpeta</span>
              </button>
            )}
            {onRequestLoadFiles && (
              <button
                onClick={onRequestLoadFiles}
                style={{
                  background: "#1ED760",
                  border: "none",
                  borderRadius: "999px",
                  color: "#041f11",
                  padding: "12px 24px",
                  fontSize: "14.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  boxShadow: "0 8px 24px rgba(30, 215, 96, 0.4)",
                }}
              >
                <FileMusicIcon size={17} color="#041f11" />
                <span>Seleccionar Archivos</span>
              </button>
            )}
          </div>
        </div>
      ) : filteredTracks.length === 0 ? (
        <div
          style={{
            padding: "56px 24px",
            textAlign: "center",
            color: "rgba(255,255,255,0.6)",
            fontSize: "15px",
            fontWeight: 600,
          }}
        >
          No se encontraron canciones para este filtro.
        </div>
      ) : activeSection === "tracks" || activeSection === "recent" || activeSection === "favorites" ? (
        /* FROSTED GLASS HORIZONTAL TRACK PILL ROWS (Matches Recently Played rows in reference) */
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filteredTracks.map((track) => {
            const originalIndex = tracks.findIndex((t) => t.id === track.id);
            const isCurrent = currentTrackId
              ? currentTrackId === track.id
              : currentIndex === originalIndex;
            const isSelected = selectedIds.includes(track.id);

            return (
              <div
                key={track.id}
                onClick={() => onPlayAt(originalIndex)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "12px 18px",
                  borderRadius: "18px",
                  background: isCurrent
                    ? "rgba(30, 215, 96, 0.16)"
                    : isSelected
                    ? "rgba(255, 255, 255, 0.14)"
                    : "rgba(255, 255, 255, 0.075)",
                  backdropFilter: "blur(24px) saturate(180%)",
                  WebkitBackdropFilter: "blur(24px) saturate(180%)",
                  border: `1px solid ${
                    isCurrent ? "rgba(30, 215, 96, 0.5)" : "rgba(255, 255, 255, 0.14)"
                  }`,
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(track.id);
                  }}
                  style={{ accentColor: "#1ED760", cursor: "pointer", width: "16px", height: "16px" }}
                />
                <AlbumCover
                  track={track}
                  index={originalIndex}
                  size={44}
                  borderRadius={12}
                  showBadgeNumber={false}
                />
                <div style={{ flex: 1, overflow: "hidden", display: "flex", alignItems: "center", gap: "24px" }}>
                  <p
                    style={{
                      flex: 1,
                      fontSize: "15px",
                      fontWeight: 800,
                      color: isCurrent ? "#1ED760" : "#ffffff",
                      margin: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {track.title}
                  </p>
                  <p
                    style={{
                      width: "35%",
                      fontSize: "13.5px",
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.65)",
                      margin: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {track.artist || track.fileName}
                    {typeof track.playCount === "number" && track.playCount > 0
                      ? ` • ${track.playCount} reprod.`
                      : ""}
                  </p>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {onEditTrack && (
                    <button
                      onClick={() => onEditTrack(track)}
                      title="Editar pista"
                      style={{
                        background: "none",
                        border: "none",
                        color: "rgba(255,255,255,0.55)",
                        cursor: "pointer",
                        padding: "6px",
                      }}
                    >
                      <MoreHorizontalIcon size={16} />
                    </button>
                  )}
                  {onToggleFavorite && (
                    <button
                      onClick={() => onToggleFavorite(track.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: track.favorite ? "#1ED760" : "rgba(255,255,255,0.55)",
                        cursor: "pointer",
                        padding: "6px",
                      }}
                    >
                      <HeartIcon
                        size={16}
                        filled={!!track.favorite}
                        color={track.favorite ? "#1ED760" : "currentColor"}
                      />
                    </button>
                  )}
                  {onPlayNextTrack && (
                    <button
                      onClick={() => onPlayNextTrack(track)}
                      title="Reproducir a continuación"
                      style={{
                        background: "none",
                        border: "none",
                        color: "rgba(255,255,255,0.65)",
                        cursor: "pointer",
                        padding: "6px",
                      }}
                    >
                      <QueueNextIcon size={16} />
                    </button>
                  )}
                  {onEnqueueTrack && (
                    <button
                      onClick={() => onEnqueueTrack(track)}
                      title="Añadir a la cola"
                      style={{
                        background: "none",
                        border: "none",
                        color: "rgba(255,255,255,0.65)",
                        cursor: "pointer",
                        padding: "6px",
                      }}
                    >
                      <PlusIcon size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => onRemoveTrack(originalIndex)}
                    title="Eliminar"
                    style={{
                      background: "none",
                      border: "none",
                      color: "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      padding: "6px",
                    }}
                  >
                    <CloseIcon size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 4-COLUMN GLASS ALBUM / TRACK CARDS GRID */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "24px",
          }}
        >
          {filteredTracks.map((track) => {
            const originalIndex = tracks.findIndex((t) => t.id === track.id);
            const isCurrent = currentTrackId
              ? currentTrackId === track.id
              : currentIndex === originalIndex;
            const isSelected = selectedIds.includes(track.id);

            return (
              <div
                key={track.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
                  position: "relative",
                  padding: "12px",
                  borderRadius: "24px",
                  background: isCurrent
                    ? "rgba(30, 215, 96, 0.14)"
                    : "rgba(255, 255, 255, 0.065)",
                  backdropFilter: "blur(24px)",
                  border: `1px solid ${
                    isCurrent ? "rgba(30, 215, 96, 0.5)" : "rgba(255, 255, 255, 0.12)"
                  }`,
                  boxShadow: "0 12px 30px rgba(0, 0, 0, 0.25)",
                  transition: "transform 0.2s ease",
                }}
                onClick={() => onPlayAt(originalIndex)}
              >
                <div style={{ position: "relative", marginBottom: "12px" }}>
                  <AlbumCover
                    track={track}
                    index={originalIndex}
                    borderRadius={18}
                  />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect(track.id);
                    }}
                    title="Seleccionar pista"
                    style={{
                      position: "absolute",
                      top: "10px",
                      left: "10px",
                      width: "26px",
                      height: "26px",
                      borderRadius: "8px",
                      background: isSelected ? "#1ED760" : "rgba(0,0,0,0.45)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255,255,255,0.25)",
                      color: isSelected ? "#041f11" : "#fff",
                      fontWeight: 900,
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    {isSelected ? "✓" : ""}
                  </button>

                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      display: "flex",
                      gap: "6px",
                    }}
                  >
                    {onEnqueueTrack && (
                      <button
                        onClick={() => onEnqueueTrack(track)}
                        title="Añadir a la cola"
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "9px",
                          background: "rgba(0,0,0,0.5)",
                          backdropFilter: "blur(8px)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <PlusIcon size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => onRemoveTrack(originalIndex)}
                      title="Eliminar pista"
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "9px",
                        background: "rgba(0,0,0,0.5)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <CloseIcon size={13} />
                    </button>
                  </div>

                  <div
                    style={{
                      position: "absolute",
                      bottom: "12px",
                      right: "12px",
                      width: "38px",
                      height: "38px",
                      borderRadius: "50%",
                      background: isCurrent ? "#1ED760" : "rgba(0, 0, 0, 0.55)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isCurrent ? "#041f11" : "#ffffff",
                    }}
                  >
                    {isCurrent && playing ? (
                      <PauseIcon size={15} color={isCurrent ? "#041f11" : "#ffffff"} />
                    ) : (
                      <PlayIcon size={15} color={isCurrent ? "#041f11" : "#ffffff"} />
                    )}
                  </div>
                </div>

                <p
                  style={{
                    fontSize: "15px",
                    fontWeight: 800,
                    color: isCurrent ? "#1ED760" : "#ffffff",
                    margin: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {track.title}
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "rgba(255, 255, 255, 0.6)",
                    margin: "3px 0 0 0",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {track.artist || track.format || "Local Audio"}
                  {typeof track.playCount === "number" && track.playCount > 0
                    ? ` • ${track.playCount} ▶`
                    : ""}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

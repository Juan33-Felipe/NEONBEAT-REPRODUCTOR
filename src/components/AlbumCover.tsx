import React from "react";
import { Track } from "../shared/Models";

interface Props {
  track?: Track | null;
  index?: number;
  size?: number | string;
  borderRadius?: number | string;
  showBadgeNumber?: boolean;
  style?: React.CSSProperties;
}

const PALETTES = [
  {
    bg: "linear-gradient(135deg, #00A8E8 0%, #0077B6 100%)",
    accent: "#FFD166",
    fg: "#051923",
    pattern: "circles",
  },
  {
    bg: "linear-gradient(135deg, #1D2D50 0%, #133B5C 55%, #1E5F74 100%)",
    accent: "#A8DADC",
    fg: "#070B19",
    pattern: "silhouette",
  },
  {
    bg: "linear-gradient(135deg, #80CED7 0%, #63C7B2 50%, #263D42 100%)",
    accent: "#F7F9F9",
    fg: "#1D2628",
    pattern: "geometric",
  },
  {
    bg: "linear-gradient(135deg, #2B0912 0%, #170408 100%)",
    accent: "#F78812",
    fg: "#FFFFFF",
    pattern: "polygon",
  },
  {
    bg: "linear-gradient(135deg, #3A1C71 0%, #D76Z77 50%, #FFAF7B 100%)",
    accent: "#FFE66D",
    fg: "#140A26",
    pattern: "waves",
  },
  {
    bg: "linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)",
    accent: "#38EF7D",
    fg: "#E0FBFC",
    pattern: "grid",
  },
];

function hashTitle(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = str.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h);
}

export function AlbumCover({
  track,
  index = 0,
  size = "100%",
  borderRadius = 18,
  showBadgeNumber = true,
  style,
}: Props) {
  const paletteIdx = index % 4;
  const p = PALETTES[paletteIdx];
  const numStr = index === 3 ? "06" : String((index % 99) + 1).padStart(2, "0");
  const shortTitle = (track?.title || "NEON BEAT").slice(0, 18).toUpperCase();
  const shortSub = (track?.artist || track?.format || "AUDIO EDITION").slice(0, 20);

  return (
    <div
      style={{
        width: size,
        height: size,
        aspectRatio: "1 / 1",
        borderRadius,
        background: p.bg,
        position: "relative",
        overflow: "hidden",
        userSelect: "none",
        boxShadow: "0 10px 28px rgba(0, 0, 0, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.18)",
        ...style,
      }}
    >
      {/* Pattern 0: Cyan Graphic / Retro Print */}
      {paletteIdx === 0 && (
        <>
          <div
            style={{
              position: "absolute",
              top: "12%",
              right: "10%",
              fontSize: "18px",
              fontWeight: 900,
              lineHeight: 0.95,
              color: p.accent,
              textAlign: "right",
              letterSpacing: "-0.5px",
              opacity: 0.9,
              maxWidth: "70%",
              wordBreak: "break-word",
            }}
          >
            {shortTitle.split(" ").slice(0, 2).join("\n")}
          </div>
          <svg
            viewBox="0 0 100 100"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          >
            <circle cx="32" cy="70" r="14" fill="none" stroke="#fff" strokeWidth="4" />
            <circle cx="68" cy="70" r="14" fill="none" stroke="#fff" strokeWidth="4" />
            <path d="M32 70 L48 48 L68 70 M48 48 L42 32" stroke="#051923" strokeWidth="4.5" fill="none" strokeLinecap="round" />
            <circle cx="46" cy="24" r="6" fill="#051923" />
          </svg>
        </>
      )}

      {/* Pattern 1: Deep Blue Night Silhouette */}
      {paletteIdx === 1 && (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 75% 25%, rgba(100,180,255,0.28) 0%, transparent 55%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "12%",
              right: "12%",
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              letterSpacing: "2px",
              color: "#ffffff",
              opacity: 0.85,
            }}
          >
            {track?.format || "LP"}
          </div>
          <svg
            viewBox="0 0 100 100"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          >
            <circle cx="38" cy="54" r="14" fill="#05070e" />
            <path d="M12 100 C14 74 62 74 65 100 Z" fill="#05070e" />
            <rect x="68" y="28" width="2" height="2" fill="#fff" opacity="0.6" />
            <rect x="20" y="22" width="1.5" height="1.5" fill="#fff" opacity="0.4" />
            <rect x="82" y="48" width="2" height="2" fill="#fff" opacity="0.5" />
          </svg>
        </>
      )}

      {/* Pattern 2: Mint/Teal Architectural Geometric */}
      {paletteIdx === 2 && (
        <svg
          viewBox="0 0 100 100"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          <rect x="14" y="0" width="16" height="100" fill="#1b2a2f" opacity="0.75" />
          <rect x="52" y="20" width="22" height="80" fill="#9adAD9" opacity="0.6" />
          <path d="M52 24 H76 M64 24 V42" stroke="#ffffff" strokeWidth="4.5" />
          <path d="M22 72 A10 10 0 0 0 42 72" stroke="#ffffff" strokeWidth="4.5" fill="none" />
          <rect x="0" y="50" width="28" height="7" fill="#0d171a" />
        </svg>
      )}

      {/* Pattern 3: Dark Burgundy + Orange Octagon & Number Badge */}
      {paletteIdx === 3 && (
        <>
          <svg
            viewBox="0 0 100 100"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          >
            <polygon
              points="35,14 65,14 86,35 86,65 65,82 35,82 14,65 14,35"
              fill={p.accent}
            />
          </svg>
          {showBadgeNumber && (
            <div
              style={{
                position: "absolute",
                bottom: "10%",
                right: "10%",
                left: "10%",
                textAlign: "right",
                color: "#ffffff",
              }}
            >
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 900,
                  lineHeight: 0.95,
                  letterSpacing: "-1px",
                }}
              >
                {numStr}:
              </div>
              <div
                style={{
                  fontSize: "8px",
                  fontWeight: 700,
                  opacity: 0.9,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {shortTitle}
              </div>
              <div
                style={{
                  fontSize: "6.5px",
                  opacity: 0.65,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {shortSub}
              </div>
            </div>
          )}
        </>
      )}

      {/* Subtle Gloss Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 50%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

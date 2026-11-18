import { useRef, useEffect, useState } from "react";
import { Mood } from "../services/moodDetector";
import { MusicPlayer } from "../engine/Player";

interface Props {
  progress: number;
  mood: Mood;
  playing: boolean;
}

export function Ring({ progress, mood, playing }: Props) {
  const SIZE = 200;
  const R = SIZE / 2 - 14;
  const CIRC = 2 * Math.PI * R;
  const clampedPct = Math.max(0, Math.min(100, progress));
  const dash = CIRC * (clampedPct / 100);

  const angleRef = useRef(0);
  const lastRef = useRef<number | null>(null);
  const rafRef = useRef<number>();
  const playRef = useRef(playing);
  const player = useRef(MusicPlayer.getInstance()).current;

  const [angle, setAngle] = useState(0);
  const [bassScale, setBassScale] = useState(1);

  useEffect(() => {
    playRef.current = playing;
    if (!playing) setBassScale(1);
  }, [playing]);

  useEffect(() => {
    const tick = (ts: number) => {
      if (playRef.current) {
        if (lastRef.current !== null) {
          angleRef.current += (ts - lastRef.current) * 0.018;
        }
        lastRef.current = ts;
        setAngle(angleRef.current % 360);

        const freq = player.getFrequencyData();
        if (freq && freq.length > 0) {
          const bass = (freq[0] + freq[1] + freq[2]) / (3 * 255);
          setBassScale(1 + bass * 0.12);
        }
      } else {
        lastRef.current = null;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [player]);

  const TICKS = Array.from({ length: 32 }, (_, i) => i);

  return (
    <div style={{ position: "relative", width: SIZE, height: SIZE }}>
      {/* Rotating decorative ticks */}
      <svg
        width={SIZE}
        height={SIZE}
        style={{
          position: "absolute",
          inset: 0,
          transform: `rotate(${angle}deg)`,
        }}
      >
        {TICKS.map((i) => {
          const rad = (i / TICKS.length) * 2 * Math.PI;
          const isMajor = i % 4 === 0;
          const inner = R - (isMajor ? 9 : 6);
          const outer = R - 2;
          return (
            <line
              key={i}
              x1={SIZE / 2 + inner * Math.cos(rad)}
              y1={SIZE / 2 + inner * Math.sin(rad)}
              x2={SIZE / 2 + outer * Math.cos(rad)}
              y2={SIZE / 2 + outer * Math.sin(rad)}
              stroke={mood.primary}
              strokeWidth={isMajor ? "1.5" : "1"}
              opacity={isMajor ? "0.45" : "0.2"}
            />
          );
        })}
      </svg>

      {/* Fixed 12-o'clock circular progress ring */}
      <svg
        width={SIZE}
        height={SIZE}
        style={{
          position: "absolute",
          inset: 0,
          transform: "rotate(-90deg)",
        }}
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="var(--border-faint)"
          strokeWidth="2.5"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={mood.primary}
          strokeWidth="3"
          strokeDasharray={`${dash} ${CIRC}`}
          strokeLinecap="round"
          style={{
            transition: "stroke 0.6s ease",
            filter: `drop-shadow(0 0 6px ${mood.primary}80)`,
          }}
        />
      </svg>

      {/* Center reactive core */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 86,
            height: 86,
            borderRadius: "50%",
            border: `1.5px solid ${mood.primary}45`,
            background: `radial-gradient(circle, ${mood.primary}22 0%, ${mood.accent} 85%)`,
            boxShadow: playing ? `0 0 28px ${mood.primary}30` : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${bassScale.toFixed(3)})`,
            transition: "background 0.8s ease, border-color 0.8s ease, transform 0.08s ease",
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke={mood.primary}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transition: "stroke 0.8s ease",
              transform: `rotate(${angle * 0.5}deg)`,
            }}
          >
            <path d="M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

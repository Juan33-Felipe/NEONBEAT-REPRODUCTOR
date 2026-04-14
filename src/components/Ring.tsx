import { useRef, useEffect, useState } from "react";
import { Mood } from "../services/moodDetector";

interface Props { progress: number; mood: Mood; playing: boolean; }

export function Ring({ progress, mood, playing }: Props) {
  const SIZE   = 190;
  const R      = SIZE / 2 - 12;
  const CIRC   = 2 * Math.PI * R;
  const dash   = CIRC * (progress / 100);

  const angleRef = useRef(0);
  const lastRef  = useRef<number | null>(null);
  const rafRef   = useRef<number>();
  const playRef  = useRef(playing);
  const [angle, setAngle] = useState(0);

  useEffect(() => { playRef.current = playing; }, [playing]);

  useEffect(() => {
    const tick = (ts: number) => {
      if (playRef.current) {
        if (lastRef.current !== null)
          angleRef.current += (ts - lastRef.current) * 0.014;
        lastRef.current = ts;
        setAngle(angleRef.current % 360);
      } else {
        lastRef.current = null;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const TICKS = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div style={{ position: "relative", width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} style={{ transform: `rotate(${angle - 90}deg)` }}>
        {TICKS.map(i => {
          const rad   = (i / 24) * 2 * Math.PI;
          const inner = R - 6, outer = R - 1;
          return (
            <line key={i}
              x1={SIZE / 2 + inner * Math.cos(rad)} y1={SIZE / 2 + inner * Math.sin(rad)}
              x2={SIZE / 2 + outer * Math.cos(rad)} y2={SIZE / 2 + outer * Math.sin(rad)}
              stroke={mood.primary} strokeWidth="1" opacity="0.2"
            />
          );
        })}
        <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none"
          stroke={mood.primary} strokeWidth="1.5"
          strokeDasharray={`${dash} ${CIRC}`} strokeLinecap="round"
          style={{ transition: "stroke 1.2s ease" }}
        />
      </svg>

      {/* Center disc */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          width: 78, height: 78, borderRadius: "50%",
          border: `1px solid ${mood.primary}30`,
          background: mood.accent,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 1.2s ease, border-color 1.2s ease",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke={mood.primary} strokeWidth="1.2" strokeLinecap="round"
            style={{ transition: "stroke 1.2s ease" }}>
            <path d="M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
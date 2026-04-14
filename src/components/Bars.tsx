import { useRef, useEffect, useState } from "react";
import { Mood } from "../services/moodDetector";

interface Props { playing: boolean; mood: Mood; }

export function Bars({ playing, mood }: Props) {
  const [heights, setHeights] = useState<number[]>(Array(12).fill(3)); 
  const playRef = useRef(playing);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { playRef.current = playing; }, [playing]);

  useEffect(() => {
    const tick = () => {
      setHeights(prev =>
        prev.map(v =>
          playRef.current
            ? v + (3 + Math.random() * 10 - v) * 0.25 
            : v + (3 - v) * 0.12
        )
      );
      timerRef.current = setTimeout(tick, 65);
    };
    tick();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <div style={{
      display: "flex",
      alignItems: "center", 
      justifyContent: "center",
      gap: "3px",
      height: "50px", 
      width: "100%",
    }}>
      {heights.map((v, i) => (
        <div key={i} style={{
          width: "3px",
          height: `${Math.round(v)}px`,
          borderRadius: "1px",
          background: mood.primary,
          opacity: 0.4 + (i / 12) * 0.6,
          transition: "height 0.065s ease, background 1.2s ease",
        }} />
      ))}
    </div>
  );
}
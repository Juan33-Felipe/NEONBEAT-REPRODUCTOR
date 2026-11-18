import { useRef, useEffect } from "react";
import { Mood } from "../services/moodDetector";
import { MusicPlayer } from "../engine/Player";

interface Props {
  playing: boolean;
  mood: Mood;
  height?: number;
}

export function Bars({ playing, mood, height = 96 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playRef = useRef(playing);
  const moodRef = useRef(mood);
  const rafRef = useRef<number>();
  const player = useRef(MusicPlayer.getInstance()).current;

  useEffect(() => {
    playRef.current = playing;
  }, [playing]);

  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let phase = 0.8;
    const pointsCount = 11;
    const baseWave = [0.35, 0.65, 0.25, 0.78, 0.22, 0.88, 0.30, 0.74, 0.42, 0.68, 0.55];
    const smoothed = [...baseWave];

    const draw = () => {
      const w = (canvas.width = canvas.offsetWidth || 260);
      const h = (canvas.height = canvas.offsetHeight || height);
      ctx.clearRect(0, 0, w, h);

      const freq = player.getFrequencyData();
      const isPlaying = playRef.current;
      phase += isPlaying ? 0.055 : 0.012;

      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < pointsCount; i++) {
        const ratio = i / (pointsCount - 1);
        const waveOffset = Math.sin(phase + i * 1.65) * (isPlaying ? 0.22 : 0.08);
        let target = Math.max(0.12, Math.min(0.92, baseWave[i] + waveOffset));

        if (isPlaying && freq && freq.length > 0) {
          const bin = Math.min(freq.length - 1, Math.floor(ratio * freq.length * 0.65));
          const val = freq[bin] / 255;
          target = Math.max(0.1, Math.min(0.95, 0.25 + val * 0.65 + waveOffset * 0.5));
        }

        smoothed[i] += (target - smoothed[i]) * 0.18;
        pts.push({
          x: ratio * w,
          y: h * (0.14 + (1 - smoothed[i]) * 0.68),
        });
      }

      // Build smooth cubic bezier path
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 0; i < pts.length - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2;
        const yc = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x, last.y);

      // Stroke wave
      const waveColor = "#F39C3D";
      ctx.strokeStyle = waveColor;
      ctx.lineWidth = 2.2;
      ctx.shadowColor = waveColor;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Gradient fill under curve
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, h * 0.2, 0, h);
      grad.addColorStop(0, "rgba(243, 156, 61, 0.26)");
      grad.addColorStop(0.75, "rgba(243, 156, 61, 0.05)");
      grad.addColorStop(1, "rgba(243, 156, 61, 0.0)");
      ctx.fillStyle = grad;
      ctx.fill();

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [player, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: `${height}px`,
        display: "block",
      }}
    />
  );
}

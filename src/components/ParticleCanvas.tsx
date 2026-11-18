import { useRef, useEffect } from "react";
import { Mood } from "../services/moodDetector";
import { MusicPlayer } from "../engine/Player";

interface Orb {
  xRatio: number;
  yRatio: number;
  radiusRatio: number;
  hueOffset: number;
  speedX: number;
  speedY: number;
  phase: number;
}

interface Facet {
  x: number;
  y: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  hueOffset: number;
  opacity: number;
}

interface Props {
  mood: Mood;
  playing: boolean;
}

export function ParticleCanvas({ mood, playing }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    orbs: [] as Orb[],
    facets: [] as Facet[],
    mood,
    playing,
    time: 0,
    baseHue: 275, // Starts in rich purple/magenta like the reference
  });
  const rafRef = useRef<number>();
  const player = useRef(MusicPlayer.getInstance()).current;

  useEffect(() => {
    stateRef.current.mood = mood;
  }, [mood]);

  useEffect(() => {
    stateRef.current.playing = playing;
  }, [playing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth || window.innerWidth;
      canvas.height = canvas.offsetHeight || window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    stateRef.current.orbs = [
      { xRatio: 0.14, yRatio: 0.35, radiusRatio: 0.55, hueOffset: 0, speedX: 0.22, speedY: 0.18, phase: 0 },
      { xRatio: 0.42, yRatio: 0.68, radiusRatio: 0.62, hueOffset: 42, speedX: -0.19, speedY: 0.24, phase: 1.8 },
      { xRatio: 0.82, yRatio: 0.75, radiusRatio: 0.58, hueOffset: -38, speedX: 0.16, speedY: -0.21, phase: 3.4 },
      { xRatio: 0.72, yRatio: 0.22, radiusRatio: 0.50, hueOffset: 85, speedX: -0.15, speedY: -0.17, phase: 5.1 },
      { xRatio: 0.28, yRatio: 0.82, radiusRatio: 0.48, hueOffset: 135, speedX: 0.20, speedY: -0.14, phase: 2.6 },
    ];

    stateRef.current.facets = Array.from({ length: 14 }, (_, i) => ({
      x: (i / 14) + Math.random() * 0.08,
      y: Math.random(),
      size: 160 + Math.random() * 220,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.0012,
      hueOffset: (i * 28) % 160,
      opacity: 0.05 + Math.random() * 0.06,
    }));

    const draw = () => {
      const { orbs, facets, playing: p } = stateRef.current;
      const cw = canvas.width;
      const ch = canvas.height;
      if (cw <= 0 || ch <= 0) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const freq = player.getFrequencyData();
      let bassBoost = 0;
      if (p && freq && freq.length > 0) {
        bassBoost = (freq[0] + freq[1] + freq[2]) / (3 * 255);
      }

      // Slowly advance time and cycle the base hue bit by bit continuously
      const delta = p ? 0.008 + bassBoost * 0.012 : 0.0045;
      stateRef.current.time += delta;
      stateRef.current.baseHue = (stateRef.current.baseHue + (p ? 0.14 : 0.06)) % 360;

      const t = stateRef.current.time;
      const baseHue = stateRef.current.baseHue;

      // Deep dark base canvas
      ctx.fillStyle = "#08060e";
      ctx.fillRect(0, 0, cw, ch);

      const maxDim = Math.max(cw, ch);

      // 1. Large Blurred Color-Shifting Ambient Clouds
      orbs.forEach((orb) => {
        const cx = cw * (orb.xRatio + Math.sin(t * orb.speedX + orb.phase) * 0.16);
        const cy = ch * (orb.yRatio + Math.cos(t * orb.speedY + orb.phase) * 0.16);
        const r = Math.max(10, maxDim * orb.radiusRatio * (1 + bassBoost * 0.15));
        const hue = (baseHue + orb.hueOffset + 360) % 360;

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `hsla(${hue}, 82%, 54%, 0.42)`);
        grad.addColorStop(0.45, `hsla(${(hue + 18) % 360}, 76%, 42%, 0.22)`);
        grad.addColorStop(1, `hsla(${hue}, 70%, 20%, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Subtle Crystalline Geometric Facets (like the polygonal glass backdrop in the reference)
      facets.forEach((f) => {
        f.rotation += f.rotSpeed * (p ? 1.8 : 1);
        const fx = cw * ((f.x + Math.sin(t * 0.08 + f.hueOffset) * 0.04 + 1) % 1);
        const fy = ch * ((f.y + Math.cos(t * 0.07 + f.hueOffset) * 0.04 + 1) % 1);
        const hue = (baseHue + f.hueOffset + 360) % 360;

        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(f.rotation);
        ctx.beginPath();
        ctx.moveTo(0, -f.size);
        ctx.lineTo(f.size * 0.86, f.size * 0.5);
        ctx.lineTo(-f.size * 0.86, f.size * 0.5);
        ctx.closePath();

        const fGrad = ctx.createLinearGradient(-f.size, -f.size, f.size, f.size);
        fGrad.addColorStop(0, `hsla(${hue}, 85%, 65%, ${f.opacity})`);
        fGrad.addColorStop(1, `hsla(${(hue + 40) % 360}, 80%, 35%, 0)`);
        ctx.fillStyle = fGrad;
        ctx.fill();
        ctx.restore();
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [player]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

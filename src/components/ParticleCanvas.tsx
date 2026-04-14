import { useRef, useEffect } from "react";
import { Mood } from "../services/moodDetector";

interface Particle {
  x: number; y: number; r: number;
  vx: number; vy: number; phase: number;
}

interface Props { mood: Mood; playing: boolean; }

export function ParticleCanvas({ mood, playing }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ particles: [] as Particle[], mood, playing });
  const rafRef   = useRef<number>();

  useEffect(() => { stateRef.current.mood    = mood;    }, [mood]);
  useEffect(() => { stateRef.current.playing = playing; }, [playing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    const W = canvas.width;
    const H = canvas.height;

    stateRef.current.particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * W,  y: Math.random() * H,
      r: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      phase: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      const { particles, mood: m, playing: p } = stateRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const speed = p ? 1 : 0.2;
      const color = m.primary;

      particles.forEach(pt => {
        pt.phase += 0.015 * speed;
        pt.x += pt.vx * speed;
        pt.y += pt.vy * speed;
        if (pt.x < 0) pt.x = canvas.width; if (pt.x > canvas.width) pt.x = 0;
        if (pt.y < 0) pt.y = canvas.height; if (pt.y > canvas.height) pt.y = 0;
        
        const op = 0.2 + 0.4 * Math.sin(pt.phase);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fillStyle = color + Math.round(op * 255).toString(16).padStart(2, "0");
        ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 110) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            const lineOp = (1 - d / 110) * 0.15;
            ctx.strokeStyle = color + Math.round(lineOp * 255).toString(16).padStart(2, "0");
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => { 
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current); 
    };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: "absolute", inset: 0,
      width: "100%", height: "100%",
      pointerEvents: "none",
    }} />
  );
}
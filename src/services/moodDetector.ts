export interface Mood {
  name: string;
  label: string;
  primary: string;
  glow: string;
  accent: string;
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function detectMood(title: string = ""): Mood {
  const t = title.toLowerCase();

  if (!t.trim()) {
    return {
      name: "cyber",
      label: "Cyber Neon",
      primary: "#00F5D4",
      glow: "rgba(0,245,212,0.14)",
      accent: "#061a17",
    };
  }

  if (/night|dark|shadow|noir|black|midnight|luna|noche|moon|eclipse/.test(t))
    return { name: "night", label: "Nocturno", primary: "#6C8EFF", glow: "rgba(108,142,255,0.14)", accent: "#0d1230" };

  if (/fire|rage|hot|burn|red|guerra|blood|furia|inferno|fuego|llama|rock|metal/.test(t))
    return { name: "fire", label: "Ígneo", primary: "#FF5E3A", glow: "rgba(255,94,58,0.14)", accent: "#1a0a05" };

  if (/chill|calm|ocean|wave|agua|mar|rain|blue|cielo|sky|brisa|ice|lluvia/.test(t))
    return { name: "ocean", label: "Océano", primary: "#38BDF8", glow: "rgba(56,189,248,0.14)", accent: "#071828" };

  if (/love|heart|rosa|pink|coraz|flor|flower|sweet|amor|beso|kiss/.test(t))
    return { name: "love", label: "Romance", primary: "#F472B6", glow: "rgba(244,114,182,0.14)", accent: "#1e0a14" };

  if (/forest|green|nature|natural|verde|selva|tierra|bosque|vida/.test(t))
    return { name: "forest", label: "Orgánico", primary: "#4ADE80", glow: "rgba(74,222,128,0.14)", accent: "#071a0c" };

  if (/electric|cyber|neon|future|tech|digital|matrix|synth|retro|club|dance/.test(t))
    return { name: "cyber", label: "Cyberpunk", primary: "#A855F7", glow: "rgba(168,85,247,0.14)", accent: "#12071e" };

  if (/gold|sun|sol|luz|light|bright|amarillo|yellow|dawn|verano|summer|oro/.test(t))
    return { name: "solar", label: "Solar", primary: "#FBBF24", glow: "rgba(251,191,36,0.14)", accent: "#1a1200" };

  let hash = 0;
  for (let i = 0; i < t.length; i++) {
    hash = t.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash % 360);
  const primary = hslToHex(hue, 82, 62);
  const accent = hslToHex(hue, 45, 9);
  const glow = `${primary}22`;

  return {
    name: "dynamic",
    label: "Frecuencia Dinámica",
    primary,
    glow,
    accent,
  };
}

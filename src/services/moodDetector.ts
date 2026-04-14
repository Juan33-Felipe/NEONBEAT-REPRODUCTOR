export interface Mood {
  name: string;
  primary: string;
  glow: string;
  accent: string;
}

export function detectMood(title: string = ""): Mood {
  const t = title.toLowerCase();

  
  if (/night|dark|shadow|noir|black|midnight|luna|noche/.test(t))
    return { name: "night", primary: "#6C8EFF", glow: "rgba(108,142,255,0.12)", accent: "#0d1230" };

  if (/fire|rage|hot|burn|red|guerra|blood|furia|inferno/.test(t))
    return { name: "fire", primary: "#FF5E3A", glow: "rgba(255,94,58,0.12)", accent: "#1a0a05" };

  if (/chill|calm|ocean|wave|agua|mar|rain|blue|cielo|sky/.test(t))
    return { name: "ocean", primary: "#38BDF8", glow: "rgba(56,189,248,0.12)", accent: "#071828" };

  if (/love|heart|rosa|pink|coraz|flor|flower|sweet/.test(t))
    return { name: "love", primary: "#F472B6", glow: "rgba(244,114,182,0.12)", accent: "#1e0a14" };

  if (/forest|green|nature|natural|verde|selva|tierra/.test(t))
    return { name: "forest", primary: "#4ADE80", glow: "rgba(74,222,128,0.12)", accent: "#071a0c" };

  if (/electric|cyber|neon|future|tech|digital|matrix/.test(t))
    return { name: "cyber", primary: "#A855F7", glow: "rgba(168,85,247,0.12)", accent: "#12071e" };

  if (/gold|sun|sol|luz|light|bright|amarillo|yellow|dawn/.test(t))
    return { name: "solar", primary: "#FBBF24", glow: "rgba(251,191,36,0.12)", accent: "#1a1200" };

  // 2. Si no hay una palabra clave, el sistema no sabe que hacer entonces el hash soluciona esto
  let hash = 0;
  for (let i = 0; i < t.length; i++) {
    hash = t.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Colores varidados
  const hue = Math.abs(hash % 360);
  const primary = `hsl(${hue}, 80%, 65%)`;
  const glow = `hsla(${hue}, 80%, 65%, 0.12)`;
  const accent = `hsl(${hue}, 40%, 8%)`;

  return {
    name: "dynamic",
    primary,
    glow,
    accent,
  };
}
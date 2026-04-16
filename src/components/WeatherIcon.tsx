/** SVG weather icons with multiple style variants */

export type IconStyle = "filled" | "line" | "neon" | "minimal" | "duotone";

interface Props {
  code: number;
  size?: number;
  variant?: IconStyle;
}

export default function WeatherIcon({ code, size = 28, variant = "filled" }: Props) {
  const category = getCategory(code);
  const renderer = STYLES[variant];
  return renderer[category](size);
}

type Category = "clear" | "partlyCloudy" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "thunder";

function getCategory(code: number): Category {
  if (code === 0) return "clear";
  if (code <= 2) return "partlyCloudy";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 55) return "drizzle";
  if ((code >= 61 && code <= 65) || (code >= 80 && code <= 82)) return "rain";
  if (code >= 71 && code <= 75) return "snow";
  if (code >= 95) return "thunder";
  return "cloudy";
}

type IconSet = Record<Category, (s: number) => JSX.Element>;

// Helper: sun rays
const rays = (cx: number, cy: number, inner: number, outer: number, count: number, stroke: string, sw: number) =>
  Array.from({ length: count }, (_, i) => {
    const a = (i * (360 / count)) * Math.PI / 180;
    return (
      <line key={i}
        x1={cx + Math.cos(a) * inner} y1={cy + Math.sin(a) * inner}
        x2={cx + Math.cos(a) * outer} y2={cy + Math.sin(a) * outer}
        stroke={stroke} strokeWidth={sw} strokeLinecap="round"
      />
    );
  });

// ═══════════════════════════════════════════
// A. Filled (current)
// ═══════════════════════════════════════════
const filled: IconSet = {
  clear: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="6" fill="#FBBF24" />
      {rays(16, 16, 9, 12, 8, "#FBBF24", 2)}
    </svg>
  ),
  partlyCloudy: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <circle cx="12" cy="12" r="5" fill="#FBBF24" />
      {rays(12, 12, 7.5, 9.5, 6, "#FBBF24", 1.5)}
      <ellipse cx="20" cy="21" rx="9" ry="6" fill="#94A3B8" />
      <ellipse cx="16" cy="19" rx="5" ry="4" fill="#94A3B8" />
    </svg>
  ),
  cloudy: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <ellipse cx="16" cy="19" rx="10" ry="6" fill="#94A3B8" />
      <ellipse cx="12" cy="16" rx="6" ry="5" fill="#94A3B8" />
      <ellipse cx="20" cy="17" rx="5" ry="4" fill="#94A3B8" />
    </svg>
  ),
  fog: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32">
      {[13, 18, 23].map((y) => (
        <line key={y} x1="6" y1={y} x2="26" y2={y} stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      ))}
    </svg>
  ),
  drizzle: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <ellipse cx="16" cy="14" rx="10" ry="6" fill="#94A3B8" />
      <ellipse cx="12" cy="11" rx="6" ry="5" fill="#94A3B8" />
      {[11, 16, 21].map((x) => (
        <line key={x} x1={x} y1="22" x2={x} y2="25" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" />
      ))}
    </svg>
  ),
  rain: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <ellipse cx="16" cy="13" rx="10" ry="6" fill="#64748B" />
      <ellipse cx="12" cy="10" rx="6" ry="5" fill="#64748B" />
      {[9, 14, 19, 23].map((x, i) => (
        <line key={x} x1={x} y1={21 + (i % 2) * 2} x2={x - 1} y2={26 + (i % 2) * 2}
          stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
      ))}
    </svg>
  ),
  snow: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <ellipse cx="16" cy="13" rx="10" ry="6" fill="#94A3B8" />
      <ellipse cx="12" cy="10" rx="6" ry="5" fill="#94A3B8" />
      {[10, 16, 22].map((x) => (
        <circle key={x} cx={x} cy="24" r="1.5" fill="#BAE6FD" />
      ))}
    </svg>
  ),
  thunder: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <ellipse cx="16" cy="12" rx="10" ry="6" fill="#64748B" />
      <ellipse cx="12" cy="9" rx="6" ry="5" fill="#64748B" />
      <polygon points="17,17 14,23 17,23 15,28 20,21 17,21 19,17" fill="#FBBF24" />
    </svg>
  ),
};

// ═══════════════════════════════════════════
// B. Line (stroke only, Lucide-like)
// ═══════════════════════════════════════════
const cloudPath = "M10,22 Q6,22 6,18 Q6,14 10,14 Q10,10 16,10 Q22,10 22,14 L24,14 Q28,14 28,18 Q28,22 24,22 Z";
const cloudSmall = "M12,22 Q8,22 8,19 Q8,16 12,16 Q12,12 16,12 Q20,12 20,16 L22,16 Q25,16 25,19 Q25,22 22,22 Z";

const line: IconSet = {
  clear: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="5" stroke="#FBBF24" strokeWidth="1.5" />
      {rays(16, 16, 8, 11, 8, "#FBBF24", 1.5)}
    </svg>
  ),
  partlyCloudy: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <circle cx="11" cy="10" r="4" stroke="#FBBF24" strokeWidth="1.5" />
      {rays(11, 10, 6, 8, 6, "#FBBF24", 1.2)}
      <path d={cloudSmall} stroke="#CBD5E1" strokeWidth="1.5" />
    </svg>
  ),
  cloudy: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <path d={cloudPath} stroke="#CBD5E1" strokeWidth="1.5" />
    </svg>
  ),
  fog: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      {[12, 17, 22].map((y, i) => (
        <line key={y} x1={7 + i} y1={y} x2={25 - i} y2={y} stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" />
      ))}
    </svg>
  ),
  drizzle: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <path d="M10,19 Q6,19 6,16 Q6,12 10,12 Q10,8 16,8 Q22,8 22,12 L24,12 Q27,12 27,15 Q27,19 24,19 Z" stroke="#CBD5E1" strokeWidth="1.5" />
      {[12, 17, 22].map((x) => (
        <line key={x} x1={x} y1="22" x2={x} y2="24.5" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" />
      ))}
    </svg>
  ),
  rain: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <path d="M10,18 Q6,18 6,15 Q6,11 10,11 Q10,7 16,7 Q22,7 22,11 L24,11 Q27,11 27,14 Q27,18 24,18 Z" stroke="#CBD5E1" strokeWidth="1.5" />
      {[10, 15, 20, 24].map((x, i) => (
        <line key={x} x1={x} y1={21 + (i % 2)} x2={x - 1} y2={25 + (i % 2)}
          stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
      ))}
    </svg>
  ),
  snow: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <path d="M10,18 Q6,18 6,15 Q6,11 10,11 Q10,7 16,7 Q22,7 22,11 L24,11 Q27,11 27,14 Q27,18 24,18 Z" stroke="#CBD5E1" strokeWidth="1.5" />
      {[11, 17, 23].map((x) => (
        <circle key={x} cx={x} cy="23" r="1.2" stroke="#BAE6FD" strokeWidth="1" fill="none" />
      ))}
    </svg>
  ),
  thunder: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <path d="M10,17 Q6,17 6,14 Q6,10 10,10 Q10,6 16,6 Q22,6 22,10 L24,10 Q27,10 27,13 Q27,17 24,17 Z" stroke="#CBD5E1" strokeWidth="1.5" />
      <polyline points="17,18 14,23 17,23 15,27" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

// ═══════════════════════════════════════════
// C. Neon (stroke + glow)
// ═══════════════════════════════════════════
const glow = (id: string, color: string) => (
  <defs>
    <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <style>{`#${id}-g { filter: url(#${id}); stroke: ${color}; }`}</style>
  </defs>
);

const neon: IconSet = {
  clear: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      {glow("nc", "#FBBF24")}
      <g id="nc-g">
        <circle cx="16" cy="16" r="5" strokeWidth="1.5" />
        {rays(16, 16, 8, 11, 8, "#FBBF24", 1.5)}
      </g>
    </svg>
  ),
  partlyCloudy: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      {glow("npc-s", "#FBBF24")}
      {glow("npc-c", "#60A5FA")}
      <g id="npc-s-g"><circle cx="11" cy="10" r="4" strokeWidth="1.5" />{rays(11, 10, 6, 8, 6, "#FBBF24", 1.2)}</g>
      <g id="npc-c-g"><path d={cloudSmall} strokeWidth="1.5" /></g>
    </svg>
  ),
  cloudy: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      {glow("ncl", "#94A3B8")}
      <g id="ncl-g"><path d={cloudPath} strokeWidth="1.5" /></g>
    </svg>
  ),
  fog: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      {glow("nf", "#94A3B8")}
      <g id="nf-g">
        {[12, 17, 22].map((y, i) => (
          <line key={y} x1={7 + i} y1={y} x2={25 - i} y2={y} strokeWidth="1.5" strokeLinecap="round" />
        ))}
      </g>
    </svg>
  ),
  drizzle: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      {glow("nd", "#60A5FA")}
      <g id="nd-g">
        <path d="M10,19 Q6,19 6,16 Q6,12 10,12 Q10,8 16,8 Q22,8 22,12 L24,12 Q27,12 27,15 Q27,19 24,19 Z" strokeWidth="1.5" />
        {[12, 17, 22].map((x) => (
          <line key={x} x1={x} y1="22" x2={x} y2="24.5" strokeWidth="1.5" strokeLinecap="round" />
        ))}
      </g>
    </svg>
  ),
  rain: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      {glow("nr", "#3B82F6")}
      <g id="nr-g">
        <path d="M10,18 Q6,18 6,15 Q6,11 10,11 Q10,7 16,7 Q22,7 22,11 L24,11 Q27,11 27,14 Q27,18 24,18 Z" strokeWidth="1.5" />
        {[10, 15, 20, 24].map((x, i) => (
          <line key={x} x1={x} y1={21 + (i % 2)} x2={x - 1} y2={25 + (i % 2)} strokeWidth="1.5" strokeLinecap="round" />
        ))}
      </g>
    </svg>
  ),
  snow: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      {glow("ns", "#BAE6FD")}
      <g id="ns-g">
        <path d="M10,18 Q6,18 6,15 Q6,11 10,11 Q10,7 16,7 Q22,7 22,11 L24,11 Q27,11 27,14 Q27,18 24,18 Z" strokeWidth="1.5" />
        {[11, 17, 23].map((x) => (
          <circle key={x} cx={x} cy="23" r="1.2" strokeWidth="1" />
        ))}
      </g>
    </svg>
  ),
  thunder: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      {glow("nt", "#A78BFA")}
      <g id="nt-g">
        <path d="M10,17 Q6,17 6,14 Q6,10 10,10 Q10,6 16,6 Q22,6 22,10 L24,10 Q27,10 27,13 Q27,17 24,17 Z" strokeWidth="1.5" />
        <polyline points="17,18 14,23 17,23 15,27" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  ),
};

// ═══════════════════════════════════════════
// D. Minimal (circles, dots, lines only)
// ═══════════════════════════════════════════
const minimal: IconSet = {
  clear: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="7" fill="none" stroke="#FBBF24" strokeWidth="2" />
      <circle cx="16" cy="16" r="2" fill="#FBBF24" />
    </svg>
  ),
  partlyCloudy: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <circle cx="12" cy="12" r="5" fill="none" stroke="#FBBF24" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.5" fill="#FBBF24" />
      <circle cx="18" cy="20" r="6" fill="none" stroke="#94A3B8" strokeWidth="1.5" />
      <circle cx="22" cy="18" r="4" fill="none" stroke="#94A3B8" strokeWidth="1.5" />
    </svg>
  ),
  cloudy: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <circle cx="14" cy="17" r="7" fill="none" stroke="#94A3B8" strokeWidth="1.5" />
      <circle cx="21" cy="16" r="5" fill="none" stroke="#94A3B8" strokeWidth="1.5" />
    </svg>
  ),
  fog: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32">
      {[12, 17, 22].map((y) => (
        <g key={y}>
          {[8, 12, 16, 20, 24].map((x) => (
            <circle key={x} cx={x} cy={y} r="1" fill="#94A3B8" opacity="0.5" />
          ))}
        </g>
      ))}
    </svg>
  ),
  drizzle: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <circle cx="14" cy="14" r="6" fill="none" stroke="#94A3B8" strokeWidth="1.5" />
      <circle cx="21" cy="13" r="4" fill="none" stroke="#94A3B8" strokeWidth="1.5" />
      {[12, 17, 22].map((x) => (
        <circle key={x} cx={x} cy="25" r="1.2" fill="#60A5FA" />
      ))}
    </svg>
  ),
  rain: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <circle cx="14" cy="13" r="6" fill="none" stroke="#64748B" strokeWidth="1.5" />
      <circle cx="21" cy="12" r="4" fill="none" stroke="#64748B" strokeWidth="1.5" />
      {[9, 13, 17, 21, 25].map((x) => (
        <line key={x} x1={x} y1="22" x2={x} y2="26" stroke="#3B82F6" strokeWidth="1.2" strokeLinecap="round" />
      ))}
    </svg>
  ),
  snow: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <circle cx="14" cy="13" r="6" fill="none" stroke="#94A3B8" strokeWidth="1.5" />
      <circle cx="21" cy="12" r="4" fill="none" stroke="#94A3B8" strokeWidth="1.5" />
      {[10, 16, 22].map((x) => (
        <g key={x}>
          <line x1={x} y1="22" x2={x} y2="28" stroke="#BAE6FD" strokeWidth="1" strokeLinecap="round" />
          <line x1={x - 2} y1="25" x2={x + 2} y2="25" stroke="#BAE6FD" strokeWidth="1" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  ),
  thunder: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <circle cx="14" cy="12" r="6" fill="none" stroke="#64748B" strokeWidth="1.5" />
      <circle cx="21" cy="11" r="4" fill="none" stroke="#64748B" strokeWidth="1.5" />
      <line x1="17" y1="19" x2="14" y2="24" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="24" x2="17" y2="24" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="17" y1="24" x2="15" y2="28" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

// ═══════════════════════════════════════════
// E. Duotone (teal accent + white)
// ═══════════════════════════════════════════
const T = "#1D9E75"; // teal accent
const W = "rgba(255,255,255,0.7)";

const duotone: IconSet = {
  clear: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="6" fill={T} />
      {rays(16, 16, 9, 12, 8, W, 1.5)}
    </svg>
  ),
  partlyCloudy: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <circle cx="12" cy="11" r="5" fill={T} />
      {rays(12, 11, 7, 9, 6, W, 1.2)}
      <ellipse cx="20" cy="21" rx="9" ry="6" fill={W} />
      <ellipse cx="16" cy="19" rx="5" ry="4" fill={W} />
    </svg>
  ),
  cloudy: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <ellipse cx="16" cy="19" rx="10" ry="6" fill={W} />
      <ellipse cx="12" cy="16" rx="6" ry="5" fill={T} opacity="0.6" />
      <ellipse cx="20" cy="17" rx="5" ry="4" fill={W} />
    </svg>
  ),
  fog: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <line x1="6" y1="13" x2="26" y2="13" stroke={W} strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="18" x2="24" y2="18" stroke={T} strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="23" x2="26" y2="23" stroke={W} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  drizzle: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <ellipse cx="16" cy="14" rx="10" ry="6" fill={W} />
      <ellipse cx="12" cy="11" rx="6" ry="5" fill={W} />
      {[11, 16, 21].map((x) => (
        <line key={x} x1={x} y1="22" x2={x} y2="25" stroke={T} strokeWidth="1.5" strokeLinecap="round" />
      ))}
    </svg>
  ),
  rain: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <ellipse cx="16" cy="13" rx="10" ry="6" fill={W} />
      <ellipse cx="12" cy="10" rx="6" ry="5" fill={W} />
      {[9, 14, 19, 23].map((x, i) => (
        <line key={x} x1={x} y1={21 + (i % 2) * 2} x2={x - 1} y2={26 + (i % 2) * 2}
          stroke={T} strokeWidth="1.5" strokeLinecap="round" />
      ))}
    </svg>
  ),
  snow: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <ellipse cx="16" cy="13" rx="10" ry="6" fill={W} />
      <ellipse cx="12" cy="10" rx="6" ry="5" fill={W} />
      {[10, 16, 22].map((x) => (
        <circle key={x} cx={x} cy="24" r="1.5" fill={T} />
      ))}
    </svg>
  ),
  thunder: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <ellipse cx="16" cy="12" rx="10" ry="6" fill={W} />
      <ellipse cx="12" cy="9" rx="6" ry="5" fill={W} />
      <polygon points="17,17 14,23 17,23 15,28 20,21 17,21 19,17" fill={T} />
    </svg>
  ),
};

// ═══════════════════════════════════════════
const STYLES: Record<IconStyle, IconSet> = { filled, line, neon, minimal, duotone };

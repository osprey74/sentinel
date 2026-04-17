/** Tiny SVG sparkline chart */

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  max?: number;
}

export default function Sparkline({
  data,
  width = 60,
  height = 20,
  color = "var(--color-ok)",
  max = 100,
}: SparklineProps) {
  if (data.length < 2) return null;

  const padding = 1;
  const w = width - padding * 2;
  const h = height - padding * 2;
  const step = w / (data.length - 1);

  const points = data.map((v, i) => {
    const x = padding + i * step;
    const y = padding + h - (Math.min(v, max) / max) * h;
    return `${x},${y}`;
  });

  const fillPoints = [
    `${padding},${padding + h}`,
    ...points,
    `${padding + w},${padding + h}`,
  ].join(" ");

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polygon points={fillPoints} fill={color} opacity="0.12" />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

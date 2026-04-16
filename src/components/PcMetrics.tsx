import type { SystemMetrics } from "../types";

interface Props {
  metrics: SystemMetrics;
}

export default function PcMetrics({ metrics: m }: Props) {

  const fmtPct = (v: number) => `${Math.round(v)}%`;
  const fmtDisk = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb >= 1024 ? `${(gb / 1024).toFixed(2)} TB` : `${gb.toFixed(2)} GB`;
  };
  const fmtNet = (bytesPerSec: number) => {
    if (bytesPerSec < 1024) return `${Math.round(bytesPerSec)} B/s`;
    const kbps = bytesPerSec / 1024;
    if (kbps < 1024) return `${Math.round(kbps)} KB/s`;
    const mbps = kbps / 1024;
    return `${mbps.toFixed(1)} MB/s`;
  };

  const pctColor = (v: number) =>
    v >= 90 ? "var(--color-crit)" : v >= 70 ? "var(--color-warn)" : "var(--color-ok)";

  const cards: { label: string; value: string; color: string }[] = [
    { label: "CPU", value: fmtPct(m.cpu), color: pctColor(m.cpu) },
    { label: "MEM", value: fmtPct(m.mem), color: pctColor(m.mem) },
    { label: "DISK", value: fmtDisk(m.diskFree), color: "var(--text-primary)" },
    { label: "NET", value: `↓${fmtNet(m.netDown)}`, color: "var(--text-primary)" },
  ];

  return (
    <div className="section">
      <div className="section-label">PC Metrics</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {cards.map((c) => (
          <div key={c.label} style={{
            background: "var(--bg-card)",
            borderRadius: 8,
            padding: "8px 10px",
            border: "1px solid var(--border-faint)",
          }}>
            <div style={{
              fontSize: 9,
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              marginBottom: 2,
            }}>
              {c.label}
            </div>
            <div style={{
              fontSize: 18,
              fontWeight: 600,
              fontFamily: "var(--font-mono)",
              color: c.color,
              lineHeight: 1,
            }}>
              {c.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

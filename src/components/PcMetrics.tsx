import { useState, useCallback } from "react";
import type { SystemMetrics, DiskInfo } from "../types";

interface Props {
  metrics: SystemMetrics;
}

export default function PcMetrics({ metrics: m }: Props) {
  const [diskIdx, setDiskIdx] = useState(0);

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

  // Current disk to display
  const disks = m.disks.length > 0 ? m.disks : [{ label: "C:", free: m.diskFree, total: m.diskTotal }];
  const currentDisk = disks[diskIdx % disks.length] ?? disks[0];

  const cycleDisk = useCallback(() => {
    setDiskIdx((prev) => (prev + 1) % disks.length);
  }, [disks.length]);

  return (
    <div className="section">
      <div className="section-label">PC Metrics</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <MetricCard label="CPU" value={fmtPct(m.cpu)} color={pctColor(m.cpu)} />
        <MetricCard label="MEM" value={fmtPct(m.mem)} color={pctColor(m.mem)} />
        <MetricCard
          label={`DISK ${currentDisk.label}`}
          value={fmtDisk(currentDisk.free)}
          color="var(--text-primary)"
          onClick={disks.length > 1 ? cycleDisk : undefined}
          hint={disks.length > 1 ? `${diskIdx % disks.length + 1}/${disks.length}` : undefined}
        />
        <MetricCard label="NET" value={`↓${fmtNet(m.netDown)}`} color="var(--text-primary)" />
      </div>
    </div>
  );
}

function MetricCard({ label, value, color, onClick, hint }: {
  label: string;
  value: string;
  color: string;
  onClick?: () => void;
  hint?: string;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--bg-card)",
        borderRadius: 8,
        padding: "8px 10px",
        border: "1px solid var(--border-faint)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 2,
      }}>
        <span style={{
          fontSize: 9, color: "var(--text-tertiary)",
          fontFamily: "var(--font-mono)", fontWeight: 600,
        }}>
          {label}
        </span>
        {hint && (
          <span style={{
            fontSize: 8, color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
          }}>
            {hint}
          </span>
        )}
      </div>
      <div style={{
        fontSize: 18, fontWeight: 600,
        fontFamily: "var(--font-mono)",
        color: color, lineHeight: 1,
      }}>
        {value}
      </div>
    </div>
  );
}

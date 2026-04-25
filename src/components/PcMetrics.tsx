import { useState, useCallback, useRef, useEffect } from "react";
import type { SystemMetrics } from "../types";
import Sparkline from "./Sparkline";

const HISTORY_SIZE = 30; // ~2.5 minutes at 5s intervals

interface Props {
  metrics: SystemMetrics;
}

export default function PcMetrics({ metrics: m }: Props) {
  const [diskIdx, setDiskIdx] = useState(0);
  const cpuHistory = useRef<number[]>([]);
  const memHistory = useRef<number[]>([]);
  const gpuHistory = useRef<number[]>([]);
  const [, forceRender] = useState(0);

  // Track CPU/MEM/GPU history
  useEffect(() => {
    if (m.cpu === 0 && m.mem === 0 && !m.gpu) return; // skip initial zeros
    cpuHistory.current = [...cpuHistory.current.slice(-(HISTORY_SIZE - 1)), m.cpu];
    memHistory.current = [...memHistory.current.slice(-(HISTORY_SIZE - 1)), m.mem];
    if (m.gpu) {
      gpuHistory.current = [...gpuHistory.current.slice(-(HISTORY_SIZE - 1)), m.gpu.usage];
    }
    forceRender((n) => n + 1);
  }, [m.cpu, m.mem, m.gpu]);

  const fmtPct = (v: number) => `${Math.round(v)}%`;
  const fmtDisk = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb >= 1024 ? `${(gb / 1024).toFixed(2)} TB` : `${gb.toFixed(2)} GB`;
  };
  const fmtBytesShort = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb >= 1024 ? `${(gb / 1024).toFixed(1)}T` : `${Math.round(gb)}G`;
  };
  const fmtNet = (bytesPerSec: number) => {
    if (bytesPerSec < 1024) return `${Math.round(bytesPerSec)} B/s`;
    const kbps = bytesPerSec / 1024;
    if (kbps < 1024) return `${Math.round(kbps)} KB/s`;
    const mbps = kbps / 1024;
    return `${mbps.toFixed(1)} MB/s`;
  };
  const fmtTemp = (c: number | null | undefined) =>
    c == null ? undefined : `${Math.round(c)}°C`;
  const fmtFreq = (mhz: number) => {
    if (mhz <= 0) return undefined;
    return mhz >= 1000 ? `${(mhz / 1000).toFixed(2)} GHz` : `${mhz} MHz`;
  };
  const memHint = m.memTotal > 0
    ? `${fmtBytesShort(m.memUsed)} / ${fmtBytesShort(m.memTotal)}B`
    : undefined;

  const pctColor = (v: number) =>
    v >= 90 ? "var(--color-crit)" : v >= 70 ? "var(--color-warn)" : "var(--color-ok)";
  const tempColor = (c: number | null | undefined) => {
    if (c == null) return "var(--text-tertiary)";
    return c >= 85 ? "var(--color-crit)" : c >= 70 ? "var(--color-warn)" : "var(--text-tertiary)";
  };

  const disks = m.disks.length > 0
    ? m.disks
    : [{ label: "C:", free: m.diskFree, total: m.diskTotal, model: null, temp: null }];
  const currentDisk = disks[diskIdx % disks.length] ?? disks[0];

  const cycleDisk = useCallback(() => {
    setDiskIdx((prev) => (prev + 1) % disks.length);
  }, [disks.length]);

  return (
    <div className="section">
      <div className="section-label">PC Metrics</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <MetricCard
          label="CPU" value={fmtPct(m.cpu)} color={pctColor(m.cpu)}
          temp={fmtTemp(m.cpuTemp)} tempColor={tempColor(m.cpuTemp)}
          hint={fmtFreq(m.cpuFreqMhz)}
          sparkline={<Sparkline data={cpuHistory.current} color={pctColor(m.cpu)} />}
        />
        <MetricCard
          label="MEM" value={fmtPct(m.mem)} color={pctColor(m.mem)}
          temp={fmtTemp(m.memTemp)} tempColor={tempColor(m.memTemp)}
          hint={memHint}
          sparkline={<Sparkline data={memHistory.current} color={pctColor(m.mem)} />}
        />
        {m.gpu && (
          <MetricCard
            label="GPU" value={fmtPct(m.gpu.usage)} color={pctColor(m.gpu.usage)}
            temp={fmtTemp(m.gpu.temp)} tempColor={tempColor(m.gpu.temp)}
            sparkline={<Sparkline data={gpuHistory.current} color={pctColor(m.gpu.usage)} />}
            hint={m.gpu.memTotal > 0 ? `VRAM ${fmtDisk(m.gpu.memUsed)}/${fmtDisk(m.gpu.memTotal)}` : undefined}
          />
        )}
        <MetricCard
          label={`DISK ${currentDisk.label}`}
          value={fmtDisk(currentDisk.free)}
          color="var(--text-primary)"
          temp={fmtTemp(currentDisk.temp)} tempColor={tempColor(currentDisk.temp)}
          onClick={disks.length > 1 ? cycleDisk : undefined}
          hint={
            disks.length > 1
              ? `${diskIdx % disks.length + 1}/${disks.length}${currentDisk.model ? " " + currentDisk.model : ""}`
              : currentDisk.model ?? undefined
          }
        />
        <MetricCard label="NET" value={`↓${fmtNet(m.netDown)}`} color="var(--text-primary)" />
      </div>
    </div>
  );
}

function MetricCard({ label, value, color, onClick, hint, sparkline, temp, tempColor }: {
  label: string;
  value: string;
  color: string;
  onClick?: () => void;
  hint?: string;
  sparkline?: React.ReactNode;
  temp?: string;
  tempColor?: string;
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
        display: "flex", justifyContent: "space-between", alignItems: "flex-end",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <div style={{
            fontSize: 18, fontWeight: 600,
            fontFamily: "var(--font-mono)",
            color: color, lineHeight: 1,
          }}>
            {value}
          </div>
          {temp && (
            <div style={{
              fontSize: 10, fontWeight: 600,
              fontFamily: "var(--font-mono)",
              color: tempColor ?? "var(--text-tertiary)",
              lineHeight: 1,
            }}>
              {temp}
            </div>
          )}
        </div>
        {sparkline}
      </div>
    </div>
  );
}

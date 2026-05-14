import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-shell";
import type { HealthTarget, StatusLevel } from "../types";
import { STATUS_COLORS } from "../types";

interface Props {
  health: HealthTarget[];
}

export default function HealthCheck({ health }: Props) {
  const anyDown = health.some(
    (h) => h.latency === null && h.lastSuccessAt !== null
  );
  const now = useTicker(anyDown);

  if (health.length === 0) {
    return null;
  }

  return (
    <div className="section">
      <div className="section-label">Self-Hosted</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {health.map((h) => (
          <HealthRow key={h.name} target={h} now={now} />
        ))}
      </div>
    </div>
  );
}

function useTicker(enabled: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [enabled]);
  return now;
}

function HealthRow({ target, now }: { target: HealthTarget; now: number }) {
  const status = target.status as StatusLevel;
  const color = STATUS_COLORS[status] ?? STATUS_COLORS.unknown;

  let latencyLabel: string;
  if (target.latency !== null) {
    latencyLabel = `${target.latency}ms`;
  } else if (target.lastSuccessAt !== null) {
    const elapsedSec = Math.max(
      0,
      Math.floor((now - target.lastSuccessAt) / 1000)
    );
    latencyLabel = `${elapsedSec}s`;
  } else {
    latencyLabel = "timeout";
  }

  const handleClick = () => {
    if (target.url) {
      open(target.url);
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "3px 0",
        cursor: target.url ? "pointer" : "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
          flexShrink: 0,
          boxShadow: status === "crit" ? `0 0 6px ${color}` : "none",
        }} />
        <span style={{ fontSize: 12, color: "var(--text-primary)" }}>
          {target.name}
        </span>
      </div>
      <span style={{
        fontSize: 10,
        fontFamily: "var(--font-mono)",
        color: status === "crit" ? "var(--color-crit)" : "var(--text-secondary)",
      }}>
        {latencyLabel}
      </span>
    </div>
  );
}

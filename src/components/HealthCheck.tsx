import { open } from "@tauri-apps/plugin-shell";
import type { HealthTarget, StatusLevel } from "../types";
import { STATUS_COLORS } from "../types";

interface Props {
  health: HealthTarget[];
}

export default function HealthCheck({ health }: Props) {
  if (health.length === 0) {
    return null;
  }

  return (
    <div className="section">
      <div className="section-label">Self-Hosted</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {health.map((h) => (
          <HealthRow key={h.name} target={h} />
        ))}
      </div>
    </div>
  );
}

function HealthRow({ target }: { target: HealthTarget }) {
  const status = target.status as StatusLevel;
  const color = STATUS_COLORS[status] ?? STATUS_COLORS.unknown;

  const latencyLabel = target.latency !== null
    ? `${target.latency}ms`
    : "timeout";

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

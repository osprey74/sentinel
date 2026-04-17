import { useEffect, useRef } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import type { ServiceTarget, HealthTarget, StatusLevel } from "../types";
import { STATUS_COLORS } from "../types";

interface CompactModeProps {
  elapsed: number;
  services: ServiceTarget[];
  health: HealthTarget[];
  focused: boolean;
  onDoubleClick: () => void;
}

export default function CompactMode({ elapsed, services, health, focused, onDoubleClick }: CompactModeProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Auto-resize window for compact mode
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = Math.ceil(entry.borderBoxSize[0].blockSize);
        if (height > 0) {
          getCurrentWindow().setSize(new LogicalSize(320, height));
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Aggregate worst status
  const allStatuses = [
    ...services.map((s) => s.status as StatusLevel),
    ...health.map((h) => h.status as StatusLevel),
  ];
  const hasAny = allStatuses.length > 0;
  const overallStatus: StatusLevel = allStatuses.includes("crit")
    ? "crit"
    : allStatuses.includes("warn")
      ? "warn"
      : allStatuses.includes("unknown")
        ? "unknown"
        : "ok";

  return (
    <div
      ref={rootRef}
      data-tauri-drag-region
      onDoubleClick={onDoubleClick}
      style={{
        padding: "8px 14px",
        background: "rgba(15,15,20,0.88)",
        backdropFilter: "blur(20px)",
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        cursor: "default",
        display: "flex",
        alignItems: "center",
        gap: 8,
        opacity: focused ? 1 : 0.35,
        transition: "opacity 0.3s ease",
      }}
    >
      {/* Overall status dot */}
      <StatusDot status={hasAny ? overallStatus : "ok"} size={7} />

      <span style={{
        fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.65)",
        letterSpacing: 0.3,
      }}>
        Sentinel
      </span>

      {/* Service dots */}
      {services.length > 0 && (
        <div style={{ display: "flex", gap: 3, alignItems: "center", marginLeft: 2 }}>
          {services.map((svc) => (
            <StatusDot key={svc.name} status={svc.status as StatusLevel} size={5} title={svc.name} />
          ))}
        </div>
      )}

      {/* Health dots */}
      {health.length > 0 && (
        <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
          {health.map((h) => (
            <StatusDot key={h.name} status={h.status as StatusLevel} size={5} title={h.name} />
          ))}
        </div>
      )}

      {/* Elapsed */}
      <span style={{
        fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-mono)",
        marginLeft: "auto", whiteSpace: "nowrap",
      }}>
        {elapsed}s
      </span>
    </div>
  );
}

function StatusDot({ status, size, title }: { status: StatusLevel; size: number; title?: string }) {
  const color = STATUS_COLORS[status] ?? STATUS_COLORS.unknown;
  return (
    <span
      title={title ? `${title}: ${status}` : undefined}
      style={{
        width: size, height: size, borderRadius: "50%",
        background: color, display: "inline-block", flexShrink: 0,
        boxShadow: status === "crit" ? `0 0 4px ${color}` : "none",
      }}
    />
  );
}

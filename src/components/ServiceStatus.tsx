import { open } from "@tauri-apps/plugin-shell";
import type { ServiceTarget, StatusLevel } from "../types";
import { STATUS_COLORS, STATUS_LABELS } from "../types";

interface Props {
  services: ServiceTarget[];
}

export default function ServiceStatus({ services }: Props) {
  if (services.length === 0) {
    return (
      <div className="section">
        <div className="section-label">Services</div>
        <div style={{
          color: "var(--text-tertiary)",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
        }}>
          Checking...
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="section-label">Services</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {services.map((svc) => (
          <ServiceRow key={svc.name} service={svc} />
        ))}
      </div>
    </div>
  );
}

function ServiceRow({ service }: { service: ServiceTarget }) {
  const status = service.status as StatusLevel;
  const color = STATUS_COLORS[status] ?? STATUS_COLORS.unknown;
  const label = STATUS_LABELS[status] ?? STATUS_LABELS.unknown;

  const handleClick = () => {
    if (service.url) {
      open(service.url);
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
        cursor: service.url ? "pointer" : "default",
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
          {service.name}
        </span>
      </div>
      <span style={{
        fontSize: 10,
        fontFamily: "var(--font-mono)",
        color: color,
      }}>
        {label}
      </span>
    </div>
  );
}

import { getCurrentWindow } from "@tauri-apps/api/window";

interface HeaderProps {
  elapsed: number;
  showSettings: boolean;
  onToggleSettings: () => void;
  dragLocked: boolean;
}

export default function Header({
  elapsed,
  showSettings,
  onToggleSettings,
  dragLocked,
}: HeaderProps) {
  return (
    <div
      {...(!dragLocked ? { "data-tauri-drag-region": true } : {})}
      style={{
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid var(--border-subtle)",
        cursor: dragLocked ? "default" : "grab",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <div style={{ display: "flex", gap: 3 }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "var(--header-dots)",
              }}
            />
          ))}
        </div>
        <span style={{
          fontSize: 13, fontWeight: 600,
          color: "var(--header-title)",
          letterSpacing: 0.5,
        }}>
          Sentinel
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          onClick={(e) => { e.stopPropagation(); onToggleSettings(); }}
          style={{
            fontSize: 11,
            color: showSettings ? "var(--color-ok)" : "var(--header-icon)",
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            transition: "color 0.15s",
          }}
        >
          {showSettings ? "\u2715" : "\u2699"}
        </span>
        <span style={{
          fontSize: 10,
          color: "var(--header-icon)",
          fontFamily: "var(--font-mono)",
        }}>
          {elapsed}s ago
        </span>
        <span
          onClick={(e) => {
            e.stopPropagation();
            getCurrentWindow().close();
          }}
          style={{
            fontSize: 11,
            color: "var(--header-icon)",
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#E24B4A")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "")}
        >
          {"\u2715"}
        </span>
      </div>
    </div>
  );
}

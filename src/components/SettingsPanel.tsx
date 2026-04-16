import type { IconStyle } from "./WeatherIcon";
import WeatherIcon from "./WeatherIcon";

const ICON_STYLES: { value: IconStyle; label: string }[] = [
  { value: "filled", label: "Filled" },
  { value: "line", label: "Line" },
  { value: "neon", label: "Neon" },
  { value: "minimal", label: "Minimal" },
  { value: "duotone", label: "Duotone" },
];

interface SettingsPanelProps {
  onClose: () => void;
  iconStyle: IconStyle;
  onIconStyleChange: (style: IconStyle) => void;
}

export default function SettingsPanel({ onClose, iconStyle, onIconStyleChange }: SettingsPanelProps) {
  return (
    <div className="section" style={{ paddingBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>
          Settings
        </span>
        <span
          onClick={onClose}
          style={{ fontSize: 11, color: "var(--color-ok)", cursor: "pointer", fontFamily: "var(--font-mono)" }}
        >
          done
        </span>
      </div>

      {/* Weather Icon Style */}
      <div style={{ marginBottom: 6 }}>
        <div style={{
          fontSize: 9,
          fontWeight: 600,
          color: "rgba(255,255,255,0.28)",
          textTransform: "uppercase",
          letterSpacing: 1.2,
          marginBottom: 8,
        }}>
          Weather Icon Style
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {ICON_STYLES.map((s) => {
            const selected = iconStyle === s.value;
            return (
              <div
                key={s.value}
                onClick={() => onIconStyleChange(s.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 10px",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: selected ? "rgba(29, 158, 117, 0.15)" : "var(--bg-card)",
                  border: selected ? "1px solid rgba(29, 158, 117, 0.4)" : "1px solid var(--border-faint)",
                  transition: "all 0.15s",
                }}
              >
                {/* Preview: sun + cloud icons */}
                <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                  <WeatherIcon code={0} size={20} variant={s.value} />
                  <WeatherIcon code={3} size={20} variant={s.value} />
                  <WeatherIcon code={63} size={20} variant={s.value} />
                </div>
                <span style={{
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  color: selected ? "var(--color-ok)" : "var(--text-secondary)",
                  fontWeight: selected ? 600 : 400,
                }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Placeholder for future settings */}
      <div style={{ marginTop: 14 }}>
        <div style={{
          fontSize: 9,
          fontWeight: 600,
          color: "rgba(255,255,255,0.28)",
          textTransform: "uppercase",
          letterSpacing: 1.2,
          marginBottom: 6,
        }}>
          Services
        </div>
        <div style={{ color: "var(--text-tertiary)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
          Coming in Phase 2
        </div>
      </div>
    </div>
  );
}

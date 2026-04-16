/**
 * TODO: Implement — see DESIGN.md for specification
 */

interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  return (
    <div className="section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>
          Service settings
        </span>
        <span
          onClick={onClose}
          style={{ fontSize: 11, color: "var(--color-ok)", cursor: "pointer", fontFamily: "var(--font-mono)" }}
        >
          done
        </span>
      </div>
      <div style={{ color: "var(--text-tertiary)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
        Not yet implemented
      </div>
    </div>
  );
}

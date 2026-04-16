/**
 * TODO: Implement — see DESIGN.md for specification
 */

interface CompactModeProps {
  elapsed: number;
  onDoubleClick: () => void;
}

export default function CompactMode({ elapsed, onDoubleClick }: CompactModeProps) {
  return (
    <div
      onDoubleClick={onDoubleClick}
      style={{
        padding: "9px 14px",
        background: "rgba(15,15,20,0.88)",
        backdropFilter: "blur(20px)",
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        cursor: "default",
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 11,
        color: "rgba(255,255,255,0.65)",
      }}
    >
      <span style={{ fontWeight: 600 }}>Sentinel</span>
      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-mono)", marginLeft: "auto" }}>
        {elapsed}s — double-click to expand
      </span>
    </div>
  );
}

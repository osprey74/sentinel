import { useState, useEffect } from "react";

interface MemoEditorProps {
  initialValue: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}

export default function MemoEditor({ initialValue, onSave, onCancel }: MemoEditorProps) {
  const [value, setValue] = useState(initialValue);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.5)",
        padding: 12,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 280,
          background: "var(--bg-widget)",
          backdropFilter: "blur(20px)",
          border: "1px solid var(--border-widget)",
          borderRadius: 10,
          padding: 12,
          boxShadow: "var(--shadow-widget)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{
          fontSize: 10, fontWeight: 600, color: "var(--section-label)",
          textTransform: "uppercase", letterSpacing: 1.2,
        }}>
          Edit Memo (Markdown)
        </div>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          placeholder="# Heading&#10;- List item&#10;**bold** *italic*&#10;[link](https://...)"
          style={{
            width: "100%",
            minHeight: 180,
            padding: 8,
            borderRadius: 6,
            border: "1px solid rgba(128,128,128,0.2)",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            resize: "vertical",
            outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "5px 12px",
              borderRadius: 6,
              border: "1px solid var(--border-faint)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(value)}
            style={{
              padding: "5px 12px",
              borderRadius: 6,
              border: "none",
              background: "var(--color-ok)",
              color: "#fff",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

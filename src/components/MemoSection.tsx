import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import ReactMarkdown from "react-markdown";
import MemoEditor from "./MemoEditor";

export default function MemoSection() {
  const [content, setContent] = useState<string>("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    invoke<string>("load_memo")
      .then(setContent)
      .catch((e) => console.error("[memo] load failed:", e));
  }, []);

  const handleSave = useCallback((next: string) => {
    setContent(next);
    setEditing(false);
    invoke("save_memo", { content: next }).catch((e) =>
      console.error("[memo] save failed:", e),
    );
  }, []);

  const isEmpty = content.trim().length === 0;

  return (
    <>
      <div className="section">
        <div className="section-label">Memo</div>
        <div
          onDoubleClick={() => setEditing(true)}
          style={{
            minHeight: 40,
            padding: "8px 10px",
            background: "var(--bg-card)",
            borderRadius: 8,
            border: "1px solid var(--border-faint)",
            cursor: "pointer",
            fontSize: 11,
            color: "var(--text-primary)",
            fontFamily: "var(--font-ui)",
            lineHeight: 1.5,
            wordBreak: "break-word",
          }}
        >
          {isEmpty ? (
            <div style={{ color: "var(--text-tertiary)", fontStyle: "italic" }}>
              Double-click to edit...
            </div>
          ) : (
            <div className="memo-content">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
      {editing && (
        <MemoEditor
          initialValue={content}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      )}
    </>
  );
}

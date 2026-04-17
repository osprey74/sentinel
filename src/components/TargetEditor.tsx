import { useState, useCallback, useRef } from "react";

/** Shared editor for service targets and health check targets */

interface ServiceEntry {
  name: string;
  url: string;
  jsonPath?: string;
  statusUrl?: string;
}

interface HealthEntry {
  name: string;
  url: string;
  method: string;
  expectedStatus: number;
}

// ── Pointer-based Drag Reorder ──

function usePointerReorder<T>(items: T[], setItems: (items: T[]) => void) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const onPointerDown = (idx: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragIdx(idx);
    setOverIdx(idx);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragIdx === null) return;
    for (let i = 0; i < rowRefs.current.length; i++) {
      const el = rowRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
        setOverIdx(i);
        return;
      }
    }
  };

  const onPointerUp = () => {
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      const next = [...items];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(overIdx, 0, moved);
      setItems(next);
    }
    setDragIdx(null);
    setOverIdx(null);
  };

  const setRef = (idx: number) => (el: HTMLDivElement | null) => {
    rowRefs.current[idx] = el;
  };

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    const next = [...items];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setItems(next);
  };

  const moveDown = (idx: number) => {
    if (idx >= items.length - 1) return;
    const next = [...items];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setItems(next);
  };

  return { dragIdx, overIdx, setRef, onPointerDown, onPointerMove, onPointerUp, moveUp, moveDown };
}

// ── Item Row ──

interface ItemRowProps {
  name: string;
  urlDisplay: string;
  index: number;
  total: number;
  isDragging: boolean;
  isOver: boolean;
  rowRef: (el: HTMLDivElement | null) => void;
  onHandlePointerDown: (e: React.PointerEvent) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

function ItemRow({ name, urlDisplay, index, total, isDragging, isOver, rowRef, onHandlePointerDown, onMoveUp, onMoveDown, onRemove }: ItemRowProps) {
  return (
    <div ref={rowRef} style={{ position: "relative" }}>
      {/* Drop indicator line */}
      {isOver && (
        <div style={{
          position: "absolute", top: -2, left: 4, right: 4, height: 2,
          background: "var(--color-ok)", borderRadius: 1, zIndex: 1,
        }} />
      )}
      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        padding: "4px 4px 4px 0", borderRadius: 6, marginBottom: 2,
        background: isDragging ? "rgba(29, 158, 117, 0.08)" : "var(--bg-card)",
        border: isDragging ? "1px dashed rgba(29, 158, 117, 0.4)" : "1px solid var(--border-faint)",
        opacity: isDragging ? 0.6 : 1,
        transition: "background 0.1s, opacity 0.15s",
      }}>
        {/* Drag handle + arrows */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "0 2px", flexShrink: 0,
        }}>
          <span
            onClick={onMoveUp}
            style={{
              fontSize: 8, color: index > 0 ? "var(--text-tertiary)" : "transparent",
              cursor: index > 0 ? "pointer" : "default", lineHeight: 1, userSelect: "none",
            }}
          >
            ▲
          </span>
          <span
            onPointerDown={onHandlePointerDown}
            style={{
              fontSize: 11, color: "var(--text-muted)", cursor: "grab",
              fontFamily: "var(--font-mono)", userSelect: "none", touchAction: "none",
              lineHeight: 1,
            }}
          >
            ⠿
          </span>
          <span
            onClick={onMoveDown}
            style={{
              fontSize: 8, color: index < total - 1 ? "var(--text-tertiary)" : "transparent",
              cursor: index < total - 1 ? "pointer" : "default", lineHeight: 1, userSelect: "none",
            }}
          >
            ▼
          </span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: "var(--text-primary)" }}>{name}</div>
          <div style={{
            fontSize: 9, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {urlDisplay}
          </div>
        </div>

        {/* Delete */}
        <span
          onClick={onRemove}
          style={{ fontSize: 11, color: "var(--color-crit)", cursor: "pointer", fontFamily: "var(--font-mono)", padding: "0 6px", flexShrink: 0 }}
        >
          ✕
        </span>
      </div>
    </div>
  );
}

// ── Service Targets Editor ──

interface ServiceEditorProps {
  targets: ServiceEntry[];
  onSave: (targets: ServiceEntry[]) => void;
}

export function ServiceEditor({ targets, onSave }: ServiceEditorProps) {
  const [items, setItems] = useState<ServiceEntry[]>(targets);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const dirty = JSON.stringify(items) !== JSON.stringify(targets);
  const drag = usePointerReorder(items, setItems);

  const remove = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const add = useCallback(() => {
    if (!newName.trim() || !newUrl.trim()) return;
    setItems((prev) => [...prev, {
      name: newName.trim(),
      url: newUrl.trim(),
      jsonPath: "status.indicator",
      statusUrl: undefined,
    }]);
    setNewName("");
    setNewUrl("");
    setAdding(false);
  }, [newName, newUrl]);

  return (
    <div onPointerMove={drag.onPointerMove} onPointerUp={drag.onPointerUp}>
      {items.map((t, i) => (
        <ItemRow
          key={`${t.name}-${i}`}
          name={t.name}
          urlDisplay={t.url.replace(/^https?:\/\//, "").substring(0, 35)}
          index={i}
          total={items.length}
          isDragging={drag.dragIdx === i}
          isOver={drag.overIdx === i && drag.dragIdx !== null && drag.dragIdx !== i}
          rowRef={drag.setRef(i)}
          onHandlePointerDown={drag.onPointerDown(i)}
          onMoveUp={() => drag.moveUp(i)}
          onMoveDown={() => drag.moveDown(i)}
          onRemove={() => remove(i)}
        />
      ))}

      {adding ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Service name" autoFocus style={inputStyle} />
          <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="Status API URL" onKeyDown={(e) => e.key === "Enter" && add()} style={inputStyle} />
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={add} style={btnOk} disabled={!newName.trim() || !newUrl.trim()}>Add</button>
            <button onClick={() => { setAdding(false); setNewName(""); setNewUrl(""); }} style={btnCancel}>Cancel</button>
          </div>
        </div>
      ) : (
        <div onClick={() => setAdding(true)} style={addLink}>+ add service</div>
      )}

      {dirty && <button onClick={() => onSave(items)} style={{ ...btnOk, width: "100%", marginTop: 6 }}>Save Changes</button>}
    </div>
  );
}

// ── Health Targets Editor ──

interface HealthEditorProps {
  targets: HealthEntry[];
  onSave: (targets: HealthEntry[]) => void;
}

export function HealthEditor({ targets, onSave }: HealthEditorProps) {
  const [items, setItems] = useState<HealthEntry[]>(targets);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const dirty = JSON.stringify(items) !== JSON.stringify(targets);
  const drag = usePointerReorder(items, setItems);

  const remove = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const add = useCallback(() => {
    if (!newName.trim() || !newUrl.trim()) return;
    setItems((prev) => [...prev, {
      name: newName.trim(),
      url: newUrl.trim(),
      method: "GET",
      expectedStatus: 200,
    }]);
    setNewName("");
    setNewUrl("");
    setAdding(false);
  }, [newName, newUrl]);

  return (
    <div onPointerMove={drag.onPointerMove} onPointerUp={drag.onPointerUp}>
      {items.map((t, i) => (
        <ItemRow
          key={`${t.name}-${i}`}
          name={t.name}
          urlDisplay={t.url.replace(/^https?:\/\//, "").substring(0, 35)}
          index={i}
          total={items.length}
          isDragging={drag.dragIdx === i}
          isOver={drag.overIdx === i && drag.dragIdx !== null && drag.dragIdx !== i}
          rowRef={drag.setRef(i)}
          onHandlePointerDown={drag.onPointerDown(i)}
          onMoveUp={() => drag.moveUp(i)}
          onMoveDown={() => drag.moveDown(i)}
          onRemove={() => remove(i)}
        />
      ))}

      {adding ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Endpoint name" autoFocus style={inputStyle} />
          <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="Health check URL" onKeyDown={(e) => e.key === "Enter" && add()} style={inputStyle} />
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={add} style={btnOk} disabled={!newName.trim() || !newUrl.trim()}>Add</button>
            <button onClick={() => { setAdding(false); setNewName(""); setNewUrl(""); }} style={btnCancel}>Cancel</button>
          </div>
        </div>
      ) : (
        <div onClick={() => setAdding(true)} style={addLink}>+ add endpoint</div>
      )}

      {dirty && <button onClick={() => onSave(items)} style={{ ...btnOk, width: "100%", marginTop: 6 }}>Save Changes</button>}
    </div>
  );
}

// ── Shared Styles ──

const inputStyle: React.CSSProperties = {
  padding: "5px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)", color: "var(--text-primary)",
  fontSize: 11, fontFamily: "var(--font-mono)", outline: "none",
};

const btnOk: React.CSSProperties = {
  padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
  background: "var(--color-ok)", color: "#fff", fontSize: 10,
  fontFamily: "var(--font-mono)", fontWeight: 600,
};

const btnCancel: React.CSSProperties = {
  padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border-faint)",
  background: "transparent", color: "var(--text-tertiary)", fontSize: 10,
  fontFamily: "var(--font-mono)", cursor: "pointer",
};

const addLink: React.CSSProperties = {
  fontSize: 10, color: "var(--color-ok)", cursor: "pointer",
  fontFamily: "var(--font-mono)", marginTop: 4, textAlign: "center",
};

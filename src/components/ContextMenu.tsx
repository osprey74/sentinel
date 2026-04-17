import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

interface ContextMenuProps {
  x: number;
  y: number;
  dragLocked: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onToggleLock: () => void;
}

export default function ContextMenu({ x, y, dragLocked, onClose, onOpenSettings, onToggleLock }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const items: { label: string; action: () => void; color?: string; check?: boolean }[] = [
    {
      label: "Settings",
      action: () => { onClose(); onOpenSettings(); },
    },
    {
      label: "Lock Position",
      action: () => { onClose(); onToggleLock(); },
      check: dragLocked,
    },
    {
      label: "Hide to Tray",
      action: () => { onClose(); getCurrentWindow().hide(); },
    },
    {
      label: "Quit",
      action: () => invoke("quit_app"),
      color: "var(--color-crit)",
    },
  ];

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 1000,
        minWidth: 140,
        padding: "4px 0",
        background: "var(--bg-widget)",
        backdropFilter: "blur(12px)",
        borderRadius: 8,
        border: "1px solid var(--border-widget)",
        boxShadow: "var(--shadow-widget)",
      }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          onClick={item.action}
          style={{
            padding: "6px 14px",
            fontSize: 11,
            color: item.color ?? "var(--text-primary)",
            cursor: "pointer",
            fontFamily: "var(--font-ui)",
            transition: "background 0.1s",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <span>{item.label}</span>
          {item.check !== undefined && (
            <span style={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              color: item.check ? "var(--color-ok)" : "var(--text-muted)",
              fontWeight: 600,
            }}>
              {item.check ? "ON" : "OFF"}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

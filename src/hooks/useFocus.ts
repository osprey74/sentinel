import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Tracks whether the Tauri window is focused.
 * Returns `true` when focused, `false` when blurred.
 * Used to control widget opacity (100% focused, 35% unfocused).
 */
export function useFocus(): boolean {
  const [focused, setFocused] = useState(true);

  useEffect(() => {
    const unlisten = getCurrentWindow().onFocusChanged(({ payload }) => {
      setFocused(payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return focused;
}

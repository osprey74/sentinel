import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import type { HealthTarget } from "../types";

export function useHealthStatus(): HealthTarget[] {
  const [health, setHealth] = useState<HealthTarget[]>([]);

  useEffect(() => {
    const unlisten = listen<HealthTarget[]>("health-status", (event) => {
      setHealth(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return health;
}

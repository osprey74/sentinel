import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import type { SystemMetrics } from "../types";

/**
 * Listens for system metrics events pushed from the Rust backend.
 * The Rust side emits "system-metrics" events via tauri::Emitter
 * at the interval configured in config.toml [metrics].poll_interval_seconds.
 *
 * TODO: Replace mock data with actual Tauri event listener once
 *       the Rust backend sysinfo polling is implemented.
 */
export function useSystemMetrics(): SystemMetrics {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: 0,
    cpuFreqMhz: 0,
    mem: 0,
    memTotal: 0,
    memUsed: 0,
    diskFree: 0,
    diskTotal: 0,
    disks: [],
    netDown: 0,
    netUp: 0,
    gpu: null,
    cpuTemp: null,
    memTemp: null,
    diskTemps: [],
    lhmAvailable: false,
  });

  useEffect(() => {
    const unlisten = listen<SystemMetrics>("system-metrics", (event) => {
      setMetrics(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return metrics;
}

import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import type { ServiceTarget } from "../types";

export function useServiceStatus(): ServiceTarget[] {
  const [services, setServices] = useState<ServiceTarget[]>([]);

  useEffect(() => {
    const unlisten = listen<ServiceTarget[]>("service-status", (event) => {
      setServices(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return services;
}

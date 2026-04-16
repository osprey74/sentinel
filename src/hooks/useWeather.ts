import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import type { DayForecast } from "../types";

export function useWeather(): DayForecast[] {
  const [forecast, setForecast] = useState<DayForecast[]>([]);

  useEffect(() => {
    const unlisten = listen<DayForecast[]>("weather-update", (event) => {
      setForecast(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return forecast;
}

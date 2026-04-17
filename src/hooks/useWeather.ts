import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import type { DayForecast } from "../types";

export function useWeather(): DayForecast[] {
  const [forecast, setForecast] = useState<DayForecast[]>([]);

  useEffect(() => {
    // Fetch cached data on mount (avoids missing the first emit)
    invoke<DayForecast[]>("get_cached_weather").then((cached) => {
      if (cached.length > 0) setForecast(cached);
    });

    const unlisten = listen<DayForecast[]>("weather-update", (event) => {
      setForecast(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return forecast;
}

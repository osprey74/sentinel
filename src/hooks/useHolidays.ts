import { useEffect, useState } from "react";

const HOLIDAYS_URL = "https://holidays-jp.github.io/api/v1/date.json";
const CACHE_KEY = "sentinel-holidays-jp";

interface CacheShape {
  fetchedAt: string; // YYYY-MM-DD
  data: Record<string, string>;
}

function loadCache(): CacheShape | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheShape;
    if (!parsed.fetchedAt || !parsed.data) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isCacheFresh(cache: CacheShape): boolean {
  // Refetch if the cache was made in a previous calendar year, or older than 30 days.
  const fetched = new Date(cache.fetchedAt);
  if (isNaN(fetched.getTime())) return false;
  const now = new Date();
  if (fetched.getFullYear() !== now.getFullYear()) return false;
  const ageDays = (now.getTime() - fetched.getTime()) / 86_400_000;
  return ageDays < 30;
}

export function useHolidays(): Record<string, string> {
  const [holidays, setHolidays] = useState<Record<string, string>>(() => {
    const cache = loadCache();
    return cache?.data ?? {};
  });

  useEffect(() => {
    const cache = loadCache();
    if (cache && isCacheFresh(cache)) return;

    let cancelled = false;
    fetch(HOLIDAYS_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: Record<string, string>) => {
        if (cancelled) return;
        setHolidays(data);
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ fetchedAt: today, data } satisfies CacheShape),
        );
      })
      .catch((e) => {
        console.error("[holidays] fetch failed:", e);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return holidays;
}

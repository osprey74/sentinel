/** PC hardware metrics from sysinfo */
export interface SystemMetrics {
  cpu: number;
  mem: number;
  diskFree: number;
  diskTotal: number;
  netDown: number;
  netUp: number;
}

/** Service status from Statuspage API */
export type StatusLevel = "ok" | "warn" | "crit" | "unknown";

export interface ServiceTarget {
  name: string;
  status: StatusLevel;
  url?: string;
}

/** Health check target with latency */
export interface HealthTarget {
  name: string;
  status: StatusLevel;
  latency: number | null;
  url?: string;
}

/** Weather forecast for a single day (Open-Meteo) */
export interface DayForecast {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipProbability: number;
}

/** Weather config from TOML */
export interface WeatherConfig {
  enabled: boolean;
  latitude: number;
  longitude: number;
  locationName: string;
  forecastDays: number;
}

/** WMO Weather Code icon mapping */
export const WMO_ICONS: Record<number, { icon: string; label: string }> = {
  0:  { icon: "\u2600\uFE0F", label: "Clear" },
  1:  { icon: "\uD83C\uDF24", label: "Mostly clear" },
  2:  { icon: "\u26C5\uFE0F", label: "Partly cloudy" },
  3:  { icon: "\u2601\uFE0F", label: "Overcast" },
  45: { icon: "\uD83C\uDF2B", label: "Fog" },
  48: { icon: "\uD83C\uDF2B", label: "Fog" },
  51: { icon: "\uD83C\uDF26", label: "Light drizzle" },
  53: { icon: "\uD83C\uDF26", label: "Drizzle" },
  55: { icon: "\uD83C\uDF26", label: "Heavy drizzle" },
  61: { icon: "\uD83C\uDF27", label: "Light rain" },
  63: { icon: "\uD83C\uDF27", label: "Rain" },
  65: { icon: "\uD83C\uDF27", label: "Heavy rain" },
  71: { icon: "\u2744\uFE0F", label: "Light snow" },
  73: { icon: "\u2744\uFE0F", label: "Snow" },
  75: { icon: "\u2744\uFE0F", label: "Heavy snow" },
  80: { icon: "\uD83C\uDF27", label: "Showers" },
  81: { icon: "\uD83C\uDF27", label: "Showers" },
  82: { icon: "\uD83C\uDF27", label: "Heavy showers" },
  95: { icon: "\u26C8\uFE0F", label: "Thunderstorm" },
  96: { icon: "\u26C8\uFE0F", label: "Thunderstorm" },
  99: { icon: "\u26C8\uFE0F", label: "Thunderstorm" },
};

/** Status color mapping */
export const STATUS_COLORS: Record<StatusLevel, string> = {
  ok: "#1D9E75",
  warn: "#EF9F27",
  crit: "#E24B4A",
  unknown: "#888780",
};

export const STATUS_LABELS: Record<StatusLevel, string> = {
  ok: "operational",
  warn: "degraded",
  crit: "down",
  unknown: "checking",
};

/** Single disk drive info */
export interface DiskInfo {
  label: string;
  free: number;
  total: number;
  model: string | null;
  temp: number | null;
}

/** NVIDIA GPU metrics from NVML (Windows only) */
export interface GpuMetrics {
  name: string;
  usage: number;
  temp: number | null;
  memUsed: number;
  memTotal: number;
}

/** Per-storage-device temperature reported by LibreHardwareMonitor */
export interface DiskTemp {
  label: string;
  temp: number;
}

/** PC hardware metrics from sysinfo + NVML + LibreHardwareMonitor */
export interface SystemMetrics {
  cpu: number;
  cpuFreqMhz: number;
  mem: number;
  memTotal: number;
  memUsed: number;
  diskFree: number;
  diskTotal: number;
  disks: DiskInfo[];
  netDown: number;
  netUp: number;
  gpu: GpuMetrics | null;
  cpuTemp: number | null;
  memTemp: number | null;
  diskTemps: DiskTemp[];
  lhmAvailable: boolean;
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

/** WMO Weather Code mapping — symbol + color for consistent rendering */
export const WMO_ICONS: Record<number, { symbol: string; color: string; label: string }> = {
  0:  { symbol: "☀", color: "#FBBF24", label: "Clear" },
  1:  { symbol: "🌤", color: "#FBBF24", label: "Mostly clear" },
  2:  { symbol: "⛅", color: "#94A3B8", label: "Partly cloudy" },
  3:  { symbol: "☁", color: "#94A3B8", label: "Overcast" },
  45: { symbol: "🌫", color: "#94A3B8", label: "Fog" },
  48: { symbol: "🌫", color: "#94A3B8", label: "Fog" },
  51: { symbol: "🌦", color: "#60A5FA", label: "Light drizzle" },
  53: { symbol: "🌦", color: "#60A5FA", label: "Drizzle" },
  55: { symbol: "🌦", color: "#60A5FA", label: "Heavy drizzle" },
  61: { symbol: "🌧", color: "#3B82F6", label: "Light rain" },
  63: { symbol: "🌧", color: "#3B82F6", label: "Rain" },
  65: { symbol: "🌧", color: "#2563EB", label: "Heavy rain" },
  71: { symbol: "❄", color: "#BAE6FD", label: "Light snow" },
  73: { symbol: "❄", color: "#BAE6FD", label: "Snow" },
  75: { symbol: "❄", color: "#7DD3FC", label: "Heavy snow" },
  80: { symbol: "🌧", color: "#3B82F6", label: "Showers" },
  81: { symbol: "🌧", color: "#3B82F6", label: "Showers" },
  82: { symbol: "🌧", color: "#2563EB", label: "Heavy showers" },
  95: { symbol: "⛈", color: "#A78BFA", label: "Thunderstorm" },
  96: { symbol: "⛈", color: "#A78BFA", label: "Thunderstorm" },
  99: { symbol: "⛈", color: "#A78BFA", label: "Thunderstorm" },
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

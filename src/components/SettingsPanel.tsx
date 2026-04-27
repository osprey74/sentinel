import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { IconStyle } from "./WeatherIcon";
import type { SystemMetrics } from "../types";
import WeatherIcon from "./WeatherIcon";
import { ServiceEditor, HealthEditor } from "./TargetEditor";

const ICON_STYLES: { value: IconStyle; label: string }[] = [
  { value: "filled", label: "Filled" },
  { value: "line", label: "Line" },
  { value: "neon", label: "Neon" },
  { value: "minimal", label: "Minimal" },
  { value: "duotone", label: "Duotone" },
];

interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  country: string | null;
  admin1: string | null;
}

interface ServiceTarget {
  name: string;
  url: string;
  jsonPath?: string;
  statusUrl?: string;
}

interface HealthTarget {
  name: string;
  url: string;
  method: string;
  expectedStatus: number;
}

interface LhmStatus {
  bundled: boolean;
  bundledPath: string | null;
  taskInstalled: boolean;
  running: boolean;
}

interface SettingsPanelProps {
  onClose: () => void;
  iconStyle: IconStyle;
  onIconStyleChange: (style: IconStyle) => void;
  locationName: string;
  onLocationChange: (name: string) => void;
  theme: "dark" | "light";
  onThemeChange: (theme: "dark" | "light") => void;
  activeOpacity: number;
  onActiveOpacityChange: (value: number) => void;
  dimOpacity: number;
  onDimOpacityChange: (value: number) => void;
}

export default function SettingsPanel({
  onClose, iconStyle, onIconStyleChange, locationName, onLocationChange, theme, onThemeChange,
  activeOpacity, onActiveOpacityChange, dimOpacity, onDimOpacityChange,
}: SettingsPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Service/health targets loaded from config
  const [serviceTargets, setServiceTargets] = useState<ServiceTarget[] | null>(null);
  const [healthTargets, setHealthTargets] = useState<HealthTarget[] | null>(null);
  const [autostart, setAutostart] = useState<boolean | null>(null);
  const [lhmAvailable, setLhmAvailable] = useState<boolean | null>(null);
  const [lhmStatus, setLhmStatus] = useState<LhmStatus | null>(null);
  const [lhmBusy, setLhmBusy] = useState(false);
  const [lhmError, setLhmError] = useState<string | null>(null);

  const refreshLhmStatus = useCallback(() => {
    invoke<LhmStatus>("lhm_status").then(setLhmStatus).catch(() => setLhmStatus(null));
  }, []);

  useEffect(() => {
    invoke<ServiceTarget[]>("get_service_targets").then(setServiceTargets);
    invoke<HealthTarget[]>("get_health_targets").then(setHealthTargets);
    invoke<boolean>("get_autostart").then(setAutostart);
    refreshLhmStatus();
  }, [refreshLhmStatus]);

  // Subscribe to live system-metrics events to reflect LHM running state
  useEffect(() => {
    const unlisten = listen<SystemMetrics>("system-metrics", (event) => {
      setLhmAvailable(event.payload.lhmAvailable);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  const handleAutostart = useCallback(async (enabled: boolean) => {
    try {
      await invoke("set_autostart", { enabled });
      setAutostart(enabled);
    } catch (e) {
      console.error("Failed to set autostart:", e);
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    try {
      const res = await invoke<GeoResult[]>("search_location", { query: query.trim() });
      setResults(res);
    } catch {
      setResults([]);
    }
    setSearching(false);
  }, [query]);

  const handleSelect = useCallback(async (geo: GeoResult) => {
    const displayName = [geo.name, geo.admin1, geo.country].filter(Boolean).join(", ");
    try {
      await invoke("set_weather_location", {
        name: displayName,
        latitude: geo.latitude,
        longitude: geo.longitude,
      });
      onLocationChange(displayName);
    } catch (e) {
      console.error("Failed to set location:", e);
    }
    setShowSearch(false);
    setQuery("");
    setResults([]);
  }, [onLocationChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  }, [handleSearch]);

  const handleSaveServices = useCallback(async (targets: ServiceTarget[]) => {
    try {
      await invoke("set_service_targets", { targets });
      setServiceTargets(targets);
    } catch (e) {
      console.error("Failed to save services:", e);
    }
  }, []);

  const handleSaveHealth = useCallback(async (targets: HealthTarget[]) => {
    try {
      await invoke("set_health_targets", { targets });
      setHealthTargets(targets);
    } catch (e) {
      console.error("Failed to save health targets:", e);
    }
  }, []);

  return (
    <div>
      <div className="section" style={{ paddingBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
            Settings
          </span>
          <span
            onClick={onClose}
            style={{ fontSize: 11, color: "var(--color-ok)", cursor: "pointer", fontFamily: "var(--font-mono)" }}
          >
            done
          </span>
        </div>

        {/* Theme */}
        <div style={{ marginBottom: 14 }}>
          <SectionLabel>Theme</SectionLabel>
          <div style={{ display: "flex", gap: 4 }}>
            {(["dark", "light"] as const).map((t) => {
              const selected = theme === t;
              return (
                <div
                  key={t}
                  onClick={() => onThemeChange(t)}
                  style={{
                    flex: 1, padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                    textAlign: "center", fontSize: 11, fontFamily: "var(--font-mono)",
                    background: selected ? "rgba(29, 158, 117, 0.15)" : "var(--bg-card)",
                    border: selected ? "1px solid rgba(29, 158, 117, 0.4)" : "1px solid var(--border-faint)",
                    color: selected ? "var(--color-ok)" : "var(--text-secondary)",
                    fontWeight: selected ? 600 : 400,
                    transition: "all 0.15s",
                  }}
                >
                  {t === "dark" ? "🌙 Dark" : "☀ Light"}
                </div>
              );
            })}
          </div>
        </div>

        {/* Opacity */}
        <div style={{ marginBottom: 14 }}>
          <SectionLabel>Opacity</SectionLabel>
          <OpacitySlider
            label="Active (focused)"
            value={activeOpacity}
            onChange={onActiveOpacityChange}
          />
          <div style={{ height: 6 }} />
          <OpacitySlider
            label="Dim (unfocused / click-through)"
            value={dimOpacity}
            onChange={onDimOpacityChange}
          />
        </div>

        {/* Hardware Sensors (LibreHardwareMonitor) */}
        <div style={{ marginBottom: 14 }}>
          <SectionLabel>Hardware Sensors</SectionLabel>
          <LhmPanel
            lhmAvailable={lhmAvailable}
            status={lhmStatus}
            busy={lhmBusy}
            error={lhmError}
            onRefresh={refreshLhmStatus}
            onAction={async (kind) => {
              setLhmError(null);
              setLhmBusy(true);
              try {
                if (kind === "install") await invoke("lhm_install_autostart");
                else if (kind === "remove") await invoke("lhm_remove_autostart");
                else if (kind === "launch") await invoke("lhm_launch_now");
              } catch (e) {
                setLhmError(typeof e === "string" ? e : String(e));
              } finally {
                setLhmBusy(false);
                // Status may take a moment to reflect; refresh after a tick
                setTimeout(refreshLhmStatus, 800);
              }
            }}
          />
        </div>

        {/* Autostart */}
        {autostart !== null && (
          <div style={{ marginBottom: 14 }}>
            <SectionLabel>Startup</SectionLabel>
            <div
              onClick={() => handleAutostart(!autostart)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                background: "var(--bg-card)", border: "1px solid var(--border-faint)",
              }}
            >
              <span style={{ fontSize: 11, color: "var(--text-primary)" }}>
                Launch on startup
              </span>
              <span style={{
                fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 600,
                color: autostart ? "var(--color-ok)" : "var(--text-tertiary)",
              }}>
                {autostart ? "ON" : "OFF"}
              </span>
            </div>
          </div>
        )}

        {/* Weather Location */}
        <div style={{ marginBottom: 14 }}>
          <SectionLabel>Weather Location</SectionLabel>
          {!showSearch ? (
            <div
              onClick={() => setShowSearch(true)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                background: "var(--bg-card)", border: "1px solid var(--border-faint)",
              }}
            >
              <span style={{ fontSize: 11, color: "var(--text-primary)" }}>{locationName}</span>
              <span style={{ fontSize: 10, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>change</span>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="City name..."
                  autoFocus
                  style={{
                    flex: 1, padding: "5px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.06)", color: "var(--text-primary)",
                    fontSize: 11, fontFamily: "var(--font-mono)", outline: "none",
                  }}
                />
                <button
                  onClick={handleSearch}
                  disabled={searching || query.trim().length < 2}
                  style={{
                    padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                    background: "var(--color-ok)", color: "#fff", fontSize: 10,
                    fontFamily: "var(--font-mono)", fontWeight: 600,
                    opacity: searching || query.trim().length < 2 ? 0.4 : 1,
                  }}
                >
                  {searching ? "..." : "Search"}
                </button>
              </div>
              {results.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {results.map((geo, i) => (
                    <div
                      key={i}
                      onClick={() => handleSelect(geo)}
                      style={{
                        padding: "5px 8px", borderRadius: 6, cursor: "pointer",
                        background: "var(--bg-card)", border: "1px solid var(--border-faint)",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-card)")}
                    >
                      <div style={{ fontSize: 11, color: "var(--text-primary)" }}>{geo.name}</div>
                      <div style={{ fontSize: 9, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                        {[geo.admin1, geo.country].filter(Boolean).join(", ")}
                        {" "}({geo.latitude.toFixed(2)}, {geo.longitude.toFixed(2)})
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div
                onClick={() => { setShowSearch(false); setQuery(""); setResults([]); }}
                style={{
                  fontSize: 10, color: "var(--text-tertiary)", cursor: "pointer",
                  textAlign: "center", marginTop: 4, fontFamily: "var(--font-mono)",
                }}
              >
                cancel
              </div>
            </div>
          )}
        </div>

        {/* Weather Icon Style */}
        <div style={{ marginBottom: 14 }}>
          <SectionLabel>Weather Icon Style</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {ICON_STYLES.map((s) => {
              const selected = iconStyle === s.value;
              return (
                <div
                  key={s.value}
                  onClick={() => onIconStyleChange(s.value)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                    background: selected ? "rgba(29, 158, 117, 0.15)" : "var(--bg-card)",
                    border: selected ? "1px solid rgba(29, 158, 117, 0.4)" : "1px solid var(--border-faint)",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    <WeatherIcon code={0} size={20} variant={s.value} />
                    <WeatherIcon code={3} size={20} variant={s.value} />
                    <WeatherIcon code={63} size={20} variant={s.value} />
                  </div>
                  <span style={{
                    fontSize: 11, fontFamily: "var(--font-mono)",
                    color: selected ? "var(--color-ok)" : "var(--text-secondary)",
                    fontWeight: selected ? 600 : 400,
                  }}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Services Editor */}
        <div style={{ marginBottom: 14 }}>
          <SectionLabel>Services</SectionLabel>
          {serviceTargets ? (
            <ServiceEditor targets={serviceTargets} onSave={handleSaveServices} />
          ) : (
            <div style={{ color: "var(--text-tertiary)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
              Loading...
            </div>
          )}
        </div>

        {/* Health Targets Editor */}
        <div>
          <SectionLabel>Self-Hosted</SectionLabel>
          {healthTargets ? (
            <HealthEditor targets={healthTargets} onSave={handleSaveHealth} />
          ) : (
            <div style={{ color: "var(--text-tertiary)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
              Loading...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OpacitySlider({
  label, value, onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div style={{
      padding: "6px 10px", borderRadius: 8,
      background: "var(--bg-card)", border: "1px solid var(--border-faint)",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 11, marginBottom: 4,
      }}>
        <span style={{ color: "var(--text-primary)" }}>{label}</span>
        <span style={{
          fontFamily: "var(--font-mono)", fontWeight: 600,
          color: "var(--color-ok)",
        }}>
          {Math.round(value * 100)}%
        </span>
      </div>
      <input
        type="range"
        aria-label={label}
        title={label}
        min={10}
        max={100}
        step={5}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        style={{ width: "100%", accentColor: "var(--color-ok)" }}
      />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.28)",
      textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

interface LhmPanelProps {
  lhmAvailable: boolean | null;
  status: LhmStatus | null;
  busy: boolean;
  error: string | null;
  onRefresh: () => void;
  onAction: (kind: "install" | "remove" | "launch") => void;
}

function LhmPanel({ lhmAvailable, status, busy, error, onRefresh, onAction }: LhmPanelProps) {
  const wmiBadgeColor = lhmAvailable === null
    ? "var(--text-tertiary)"
    : lhmAvailable ? "var(--color-ok)" : "var(--text-tertiary)";
  const wmiBadgeText = lhmAvailable === null ? "..." : lhmAvailable ? "DETECTED" : "NOT RUNNING";

  const bundled = status?.bundled ?? false;
  const taskInstalled = status?.taskInstalled ?? false;

  const btnBase = {
    flex: 1,
    padding: "6px 8px",
    borderRadius: 6,
    border: "1px solid var(--border-faint)",
    background: "var(--bg-card)",
    color: "var(--text-primary)",
    fontSize: 10,
    fontFamily: "var(--font-mono)",
    fontWeight: 600,
    cursor: busy ? "wait" : "pointer",
    opacity: busy ? 0.5 : 1,
    transition: "all 0.15s",
  } as const;

  return (
    <div style={{
      padding: "8px 10px", borderRadius: 8,
      background: "var(--bg-card)", border: "1px solid var(--border-faint)",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 6,
      }}>
        <span style={{ fontSize: 11, color: "var(--text-primary)", fontWeight: 600 }}>
          LibreHardwareMonitor
        </span>
        <span
          onClick={onRefresh}
          style={{
            fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 600,
            color: wmiBadgeColor, cursor: "pointer",
          }}
          title="Click to refresh"
        >
          {wmiBadgeText}
        </span>
      </div>

      <div style={{ fontSize: 10, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 8 }}>
        GPU 使用率・GPU 温度・NVMe SSD 温度は Sentinel 単体で取得します。
        <strong style={{ color: "var(--text-primary)" }}>CPU 温度</strong>
        （およびハードウェアセンサー対応 RAM の温度）を表示するには:
        <br />
        <span style={{ color: "var(--text-tertiary)" }}>1.</span> 下の <strong style={{ color: "var(--text-primary)" }}>Enable Auto-Start</strong> でログオン時の管理者起動を登録（初回のみ UAC）
        <br />
        <span style={{ color: "var(--text-tertiary)" }}>2.</span> LHM の <strong style={{ color: "var(--text-primary)" }}>Options → Remote Web Server</strong> をチェック ON（ポート 8085）
        <br />
        Sentinel は <code style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>127.0.0.1:8085/data.json</code> を購読して温度を取得します。
      </div>

      {/* Status table */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr auto", rowGap: 2, columnGap: 8,
        fontSize: 10, fontFamily: "var(--font-mono)", marginBottom: 8,
      }}>
        <span style={{ color: "var(--text-tertiary)" }}>Bundled binary</span>
        <span style={{ color: bundled ? "var(--color-ok)" : "var(--text-tertiary)", fontWeight: 600 }}>
          {bundled ? "YES" : "NO"}
        </span>
        <span style={{ color: "var(--text-tertiary)" }}>Auto-start task</span>
        <span style={{ color: taskInstalled ? "var(--color-ok)" : "var(--text-tertiary)", fontWeight: 600 }}>
          {taskInstalled ? "INSTALLED" : "NOT INSTALLED"}
        </span>
        <span style={{ color: "var(--text-tertiary)" }}>Process</span>
        <span style={{ color: status?.running ? "var(--color-ok)" : "var(--text-tertiary)", fontWeight: 600 }}>
          {status?.running ? "RUNNING" : "STOPPED"}
        </span>
      </div>

      {!bundled && (
        <div style={{
          padding: "6px 8px", borderRadius: 6, marginBottom: 8,
          background: "rgba(239, 159, 39, 0.08)", border: "1px solid rgba(239, 159, 39, 0.3)",
          fontSize: 10, color: "var(--text-secondary)", lineHeight: 1.5,
        }}>
          LHM バイナリがバンドルされていません。リポジトリで{" "}
          <code style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
            pwsh ./scripts/setup-lhm.ps1
          </code>
          {" "}を実行してから再ビルドしてください。
        </div>
      )}

      <div style={{ display: "flex", gap: 4, marginBottom: error ? 8 : 0 }}>
        {!taskInstalled ? (
          <button
            type="button"
            disabled={busy || !bundled}
            onClick={() => onAction("install")}
            style={{
              ...btnBase,
              background: bundled ? "rgba(29, 158, 117, 0.15)" : "var(--bg-card)",
              borderColor: bundled ? "rgba(29, 158, 117, 0.4)" : "var(--border-faint)",
              color: bundled ? "var(--color-ok)" : "var(--text-tertiary)",
              opacity: busy || !bundled ? 0.5 : 1,
            }}
            title={bundled ? "Register scheduled task (UAC prompt)" : "LHM binary not bundled"}
          >
            Enable Auto-Start
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction("remove")}
            style={btnBase}
            title="Remove scheduled task (UAC prompt)"
          >
            Disable
          </button>
        )}
        <button
          type="button"
          disabled={busy || !bundled}
          onClick={() => onAction("launch")}
          style={{ ...btnBase, opacity: busy || !bundled ? 0.5 : 1 }}
          title={bundled ? "Launch LHM now (UAC prompt)" : "LHM binary not bundled"}
        >
          Launch Now
        </button>
      </div>

      {error && (
        <div style={{
          padding: "6px 8px", borderRadius: 6,
          background: "rgba(226, 75, 74, 0.08)", border: "1px solid rgba(226, 75, 74, 0.3)",
          fontSize: 10, color: "var(--color-crit)", fontFamily: "var(--font-mono)",
          wordBreak: "break-word",
        }}>
          {error}
        </div>
      )}

      <div style={{
        fontSize: 9, color: "var(--text-tertiary)",
        fontFamily: "var(--font-mono)", marginTop: 6,
      }}>
        github.com/LibreHardwareMonitor/LibreHardwareMonitor (MPL-2.0)
      </div>
    </div>
  );
}

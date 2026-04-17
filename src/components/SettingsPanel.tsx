import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { IconStyle } from "./WeatherIcon";
import WeatherIcon from "./WeatherIcon";

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

interface SettingsPanelProps {
  onClose: () => void;
  iconStyle: IconStyle;
  onIconStyleChange: (style: IconStyle) => void;
  locationName: string;
  onLocationChange: (name: string) => void;
}

export default function SettingsPanel({
  onClose, iconStyle, onIconStyleChange, locationName, onLocationChange,
}: SettingsPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

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

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  }, [handleSearch]);

  return (
    <div className="section" style={{ paddingBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>
          Settings
        </span>
        <span
          onClick={onClose}
          style={{ fontSize: 11, color: "var(--color-ok)", cursor: "pointer", fontFamily: "var(--font-mono)" }}
        >
          done
        </span>
      </div>

      {/* Weather Location */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.28)",
          textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6,
        }}>
          Weather Location
        </div>
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
                    <div style={{ fontSize: 11, color: "var(--text-primary)" }}>
                      {geo.name}
                    </div>
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
      <div style={{ marginBottom: 6 }}>
        <div style={{
          fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.28)",
          textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8,
        }}>
          Weather Icon Style
        </div>
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
    </div>
  );
}

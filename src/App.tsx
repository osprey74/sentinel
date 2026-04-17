import { useState, useEffect, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { useFocus } from "./hooks/useFocus";
import { useWeather } from "./hooks/useWeather";
import { useSystemMetrics } from "./hooks/useSystemMetrics";
import { useServiceStatus } from "./hooks/useServiceStatus";
import { useHealthStatus } from "./hooks/useHealthStatus";
import Header from "./components/Header";
import ClockCalendar from "./components/ClockCalendar";
import WeatherForecast from "./components/WeatherForecast";
import PcMetrics from "./components/PcMetrics";
import ServiceStatus from "./components/ServiceStatus";
import HealthCheck from "./components/HealthCheck";
import SettingsPanel from "./components/SettingsPanel";
import CompactMode from "./components/CompactMode";
import type { IconStyle } from "./components/WeatherIcon";

function App() {
  const focused = useFocus();
  const forecast = useWeather();
  const metrics = useSystemMetrics();
  const services = useServiceStatus();
  const health = useHealthStatus();
  const [compact, setCompact] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [iconStyle, setIconStyle] = useState<IconStyle>(
    () => (localStorage.getItem("sentinel-icon-style") as IconStyle) || "filled"
  );
  const [locationName, setLocationName] = useState("Loading...");

  // Load location name from config on mount
  useEffect(() => {
    invoke<{ name: string }>("get_weather_location").then((loc) => {
      setLocationName(loc.name);
    });
  }, []);

  const handleIconStyleChange = useCallback((style: IconStyle) => {
    setIconStyle(style);
    localStorage.setItem("sentinel-icon-style", style);
  }, []);

  const toggleCompact = useCallback(() => setCompact((c) => !c), []);
  const toggleSettings = useCallback(() => setShowSettings((s) => !s), []);

  // Listen for tray "open-settings" event
  useEffect(() => {
    const unlisten = getCurrentWindow().listen("open-settings", () => {
      setShowSettings(true);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Elapsed timer
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (compact) {
    return <CompactMode elapsed={elapsed} onDoubleClick={toggleCompact} />;
  }

  return (
    <div
      className="widget-root"
      style={{
        opacity: focused ? 1 : 0.35,
        transition: "opacity 0.3s ease",
      }}
    >
      <Header
        elapsed={elapsed}
        showSettings={showSettings}
        onToggleCompact={toggleCompact}
        onToggleSettings={toggleSettings}
      />

      {showSettings ? (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          iconStyle={iconStyle}
          onIconStyleChange={handleIconStyleChange}
          locationName={locationName}
          onLocationChange={setLocationName}
        />
      ) : (
        <>
          <ClockCalendar />
          <div className="separator" />
          <WeatherForecast iconStyle={iconStyle} forecast={forecast} locationName={locationName} />
          <div className="separator" />
          <PcMetrics metrics={metrics} />
          <div className="separator" />
          <ServiceStatus services={services} />
          {health.length > 0 && <div className="separator" />}
          <HealthCheck health={health} />
          <div className="footer">
            double-click header to compact · ⚙ to configure
          </div>
        </>
      )}
    </div>
  );
}

export default App;

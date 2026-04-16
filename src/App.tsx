import { useState, useEffect, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useFocus } from "./hooks/useFocus";
import { useSystemMetrics } from "./hooks/useSystemMetrics";
import Header from "./components/Header";
import ClockCalendar from "./components/ClockCalendar";
import WeatherForecast from "./components/WeatherForecast";
import PcMetrics from "./components/PcMetrics";
import ServiceStatus from "./components/ServiceStatus";
import HealthCheck from "./components/HealthCheck";
import SettingsPanel from "./components/SettingsPanel";
import CompactMode from "./components/CompactMode";

function App() {
  const focused = useFocus();
  const [compact, setCompact] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [elapsed, setElapsed] = useState(0);

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
        <SettingsPanel onClose={() => setShowSettings(false)} />
      ) : (
        <>
          <ClockCalendar />
          <div className="separator" />
          <WeatherForecast />
          <div className="separator" />
          <PcMetrics />
          <div className="separator" />
          <ServiceStatus />
          <div className="separator" />
          <HealthCheck />
          <div className="footer">
            double-click header to compact · ⚙ to configure
          </div>
        </>
      )}
    </div>
  );
}

export default App;

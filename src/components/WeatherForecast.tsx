import WeatherIcon from "./WeatherIcon";
import type { IconStyle } from "./WeatherIcon";
import type { DayForecast } from "../types";

interface Props {
  iconStyle: IconStyle;
  forecast: DayForecast[];
  locationName: string;
}

export default function WeatherForecast({ iconStyle, forecast, locationName }: Props) {

  if (forecast.length === 0) {
    return (
      <div className="section">
        <div className="section-label">Weather</div>
        <div style={{
          color: "var(--text-tertiary)",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
        }}>
          Loading...
        </div>
      </div>
    );
  }

  const dayLabel = (dateStr: string, idx: number) => {
    if (idx === 0) return "Today";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short" });
  };

  return (
    <div className="section">
      <div className="section-label">Weather — {locationName}</div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {forecast.map((day, i) => (
          <div key={day.date} style={{
            flex: 1,
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}>
            <WeatherIcon code={day.weatherCode} size={28} variant={iconStyle} />
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              lineHeight: 1.3,
              marginTop: 2,
            }}>
              {Math.round(day.tempMax)}°
            </div>
            <div style={{
              fontSize: 10,
              color: "var(--text-tertiary)",
            }}>
              {Math.round(day.tempMin)}°
            </div>
            <div style={{
              fontSize: 9,
              color: day.precipProbability >= 50 ? "#60A5FA" : "var(--text-tertiary)",
              fontWeight: day.precipProbability >= 50 ? 600 : 400,
            }}>
              {day.precipProbability}%
            </div>
            <div style={{
              fontSize: 9,
              color: "var(--text-secondary)",
              marginTop: 1,
            }}>
              {dayLabel(day.date, i)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

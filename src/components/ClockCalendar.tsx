import { useState, useEffect } from "react";

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(new Date());
      timeout = setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    timeout = setTimeout(tick, 1000 - (Date.now() % 1000));
    return () => clearTimeout(timeout);
  }, []);
  return now;
}

export function Clock() {
  const now = useNow();
  return (
    <div className="section" style={{ display: "flex", justifyContent: "center" }}>
      <AnalogClock now={now} />
    </div>
  );
}

export function Calendar() {
  const now = useNow();
  return (
    <div className="section">
      <MiniCalendar now={now} />
    </div>
  );
}

function AnalogClock({ now }: { now: Date }) {
  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8;

  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const hourAngle = (hours + minutes / 60) * 30 - 90;
  const minuteAngle = (minutes + seconds / 60) * 6 - 90;
  const secondAngle = seconds * 6 - 90;

  const hand = (angle: number, len: number, width: number, color: string) => {
    const rad = (angle * Math.PI) / 180;
    return (
      <line
        x1={cx}
        y1={cy}
        x2={cx + Math.cos(rad) * len}
        y2={cy + Math.sin(rad) * len}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
    );
  };

  const dots = [];
  for (let i = 0; i < 60; i++) {
    const angle = ((i * 6) - 90) * (Math.PI / 180);
    const isHour = i % 5 === 0;
    const dotR = isHour ? 2.5 : 1;
    dots.push(
      <circle
        key={i}
        cx={cx + Math.cos(angle) * r}
        cy={cy + Math.sin(angle) * r}
        r={dotR}
        fill={isHour ? "var(--clock-dot-hour)" : "var(--clock-dot-min)"}
      />
    );
  }

  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      {dots}
      {hand(hourAngle, r * 0.5, 3, "var(--clock-hand)")}
      {hand(minuteAngle, r * 0.72, 2, "var(--clock-hand-min)")}
      {hand(secondAngle, r * 0.82, 0.8, "#E24B4A")}
      <circle cx={cx} cy={cy} r={2.5} fill="#E24B4A" />
    </svg>
  );
}

function MiniCalendar({ now }: { now: Date }) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = now.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, width: "100%" }}>
      <div style={{
        fontSize: 10,
        color: "var(--text-secondary)",
        marginBottom: 4,
        textAlign: "center",
      }}>
        {monthLabel}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0 }}>
        {dayNames.map((d) => (
          <div key={d} style={{
            textAlign: "center",
            color: d === "Su" ? "var(--sunday)" : d === "Sa" ? "var(--saturday)" : "var(--text-tertiary)",
            fontSize: 8,
            fontWeight: 600,
            paddingBottom: 2,
          }}>
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          const dow = i % 7;
          const isToday = day === today;
          return (
            <div key={i} style={{
              height: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: day === null
                ? "transparent"
                : isToday
                  ? "#fff"
                  : dow === 0
                    ? "var(--sunday)"
                    : dow === 6
                      ? "var(--saturday)"
                      : "var(--text-secondary)",
              background: isToday ? "var(--color-ok)" : "transparent",
              borderRadius: isToday ? 3 : 0,
              fontWeight: isToday ? 600 : 400,
            }}>
              {day ?? ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}

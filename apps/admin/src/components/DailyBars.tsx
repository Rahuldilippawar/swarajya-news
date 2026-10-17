"use client";

import { useState } from "react";

/**
 * Single-series daily bar chart (published articles per day). One brand hue,
 * thin bars with rounded tops anchored to the baseline, a recessive axis and a
 * per-bar hover/focus tooltip. The same numbers are in the table beside it.
 */
export function DailyBars({ days }: { days: { date: string; published: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.published));
  const W = 720;
  const H = 160;
  const left = 28;
  const bottom = 22;
  const step = (W - left) / Math.max(1, days.length);
  const barW = Math.max(2, Math.min(18, step - 2));
  const y = (v: number) => (H - bottom) * (1 - v / max);
  const label = (date: string) => new Date(`${date}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const tickEvery = Math.ceil(days.length / 8);
  const active = hover === null ? null : days[hover];

  return (
    <figure className="chart" style={{ margin: 0 }}>
      <figcaption className="panel-field" style={{ marginBottom: 6 }}>Articles published per day</figcaption>
      <div style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Articles published per day; values are in the table below" onMouseLeave={() => setHover(null)}>
          <line x1={left} x2={W} y1={H - bottom} y2={H - bottom} stroke="var(--border)" />
          <text x={left - 6} y={y(max) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">{max}</text>
          <text x={left - 6} y={H - bottom} textAnchor="end" fontSize="10" fill="var(--muted)">0</text>
          {days.map((d, i) => {
            const x = left + i * step + (step - barW) / 2;
            const h = (H - bottom) - y(d.published);
            return (
              <g key={d.date}>
                {/* Hit target wider than the bar. */}
                <rect x={left + i * step} y={0} width={step} height={H - bottom} fill="transparent" onMouseEnter={() => setHover(i)} />
                {d.published > 0 && (
                  <path
                    d={`M${x},${H - bottom} v${-Math.max(0, h - 4)} q0,-4 4,-4 h${barW - 8} q4,0 4,4 v${Math.max(0, h - 4)} z`}
                    fill={hover === i ? "var(--brand-red)" : "var(--brand-blue)"}
                    pointerEvents="none"
                  />
                )}
                {i % tickEvery === 0 && (
                  <text x={left + i * step + step / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--muted)">{label(d.date)}</text>
                )}
              </g>
            );
          })}
        </svg>
        {active && (
          <div className="chart-tip" role="status" style={{ left: `${((left + (hover! + 0.5) * step) / W) * 100}%` }}>
            <strong>{active.published}</strong> published<br />
            <span className="panel-hint">{label(active.date)}</span>
          </div>
        )}
      </div>
    </figure>
  );
}

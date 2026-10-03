/**
 * Band chart (design system 5): balance over time, three lines, labeled
 * directly on the lines, no legend box. Includes a text summary.
 *
 * The only arithmetic here maps dollars and years to pixels. No financial math.
 */

import type { BandName, ProjectionResult } from "../../engine";
import { el, svg } from "../dom";
import { dollarsShort } from "../format";

const BANDS: readonly BandName[] = ["best", "likely", "worst"];
const LABEL: Record<BandName, string> = { best: "Best", likely: "Likely", worst: "Worst" };

export interface BandChartOptions {
  /** Converts a real value in a given year to the value to plot (identity for today's dollars). */
  display: (real: number, yearIndex: number) => number;
  dollarsLabel: string;
}

export function bandChart(result: ProjectionResult, o: BandChartOptions): HTMLElement {
  const width = 720;
  const height = 320;
  const pad = { top: 16, right: 64, bottom: 32, left: 8 };

  const series = BANDS.map((band) => ({
    band,
    points: result.bands[band].timeline.rows.map((r, i) => ({ year: r.year, age: r.age, value: o.display(r.netWorth, i) })),
    retirementYear: result.bands[band].retirementYear,
  }));

  const allPoints = series.flatMap((s) => s.points);
  const years = allPoints.map((p) => p.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const maxValue = Math.max(1, ...allPoints.map((p) => p.value));
  const minValue = Math.min(0, ...allPoints.map((p) => p.value));

  const x = (year: number) => pad.left + ((year - minYear) / Math.max(1, maxYear - minYear)) * (width - pad.left - pad.right);
  const y = (value: number) => pad.top + (1 - (value - minValue) / (maxValue - minValue)) * (height - pad.top - pad.bottom);

  const chart = svg("svg", { class: "band-chart", viewBox: `0 0 ${width} ${height}`, role: "img", "aria-labelledby": "band-chart-title band-chart-desc" });
  chart.append(svg("title", { id: "band-chart-title" }, "Net worth over time, three bands"));
  const desc = svg("desc", { id: "band-chart-desc" });
  chart.append(desc);

  // Zero line and a few grid lines.
  chart.append(svg("line", { class: "band-chart__axis", x1: pad.left, x2: width - pad.right, y1: y(0), y2: y(0) }));
  for (const frac of [0.25, 0.5, 0.75, 1]) {
    const v = minValue + frac * (maxValue - minValue);
    chart.append(svg("line", { class: "band-chart__grid", x1: pad.left, x2: width - pad.right, y1: y(v), y2: y(v) }));
    chart.append(svg("text", { class: "band-chart__label", x: width - pad.right + 6, y: y(v) + 4 }, dollarsShort(v)));
  }

  // Year ticks every ten years.
  for (let yr = Math.ceil(minYear / 10) * 10; yr <= maxYear; yr += 10) {
    chart.append(svg("text", { class: "band-chart__label", x: x(yr), y: height - 8, "text-anchor": "middle" }, String(yr)));
  }

  const summaries: string[] = [];
  for (const s of series) {
    const d = s.points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.year).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
    chart.append(svg("path", { class: `band-chart__line band-chart__line--${s.band}`, d }));
    if (s.retirementYear !== null) {
      chart.append(svg("line", { class: "band-chart__marker", x1: x(s.retirementYear), x2: x(s.retirementYear), y1: pad.top, y2: height - pad.bottom }));
    }
    // Label at the point where the line is highest, so the three labels rarely collide.
    const peak = s.points.reduce((best, p) => (p.value > best.value ? p : best), s.points[0]!);
    chart.append(svg("text", { class: `band-chart__label band-chart__label--${s.band}`, x: x(peak.year), y: y(peak.value) - 6, "text-anchor": "middle" }, LABEL[s.band]));
    const last = s.points[s.points.length - 1]!;
    summaries.push(
      `${LABEL[s.band]}: ${s.retirementYear !== null ? `retire in ${s.retirementYear}, ` : "never fully funded, "}peak ${dollarsShort(peak.value)} at age ${peak.age}, ${dollarsShort(last.value)} at age ${last.age}.`,
    );
  }
  desc.textContent = summaries.join(" ");

  return el(
    "figure",
    { class: "stack" },
    chart,
    el("figcaption", { class: "chart-summary" }, `Net worth by year in ${o.dollarsLabel}. ${summaries.join(" ")}`),
  );
}

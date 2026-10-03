/**
 * Band chart (design system 5): balance over time, three lines, labeled
 * directly on the lines, no legend box. Includes a text summary. Every value
 * carries its kind as a tooltip, and the caption carries a Computed badge.
 *
 * The chart is drawn at the width it is shown, so its labels stay readable on
 * a 360px screen. The only arithmetic here maps dollars and years to pixels.
 */

import type { BandName, ProjectionResult } from "../../engine";
import { el, svg } from "../dom";
import { KIND_LABEL, dollarsShort } from "../format";
import { kindBadge } from "./kind-badge";

const BANDS: readonly BandName[] = ["best", "likely", "worst"];
const LABEL: Record<BandName, string> = { best: "Best", likely: "Likely", worst: "Worst" };

export interface BandChartOptions {
  /** Converts a real value in a given year to the value to plot (identity for today's dollars). */
  display: (real: number, yearIndex: number) => number;
  dollarsLabel: string;
  /** The width in CSS pixels the chart will be shown at. */
  width: number;
}

export function bandChart(result: ProjectionResult, o: BandChartOptions): HTMLElement {
  const width = Math.max(260, Math.min(720, Math.round(o.width)));
  const compact = width < 480;
  const height = compact ? 260 : 320;
  const pad = { top: 20, right: compact ? 52 : 64, bottom: 28, left: 8 };
  const tip = `${KIND_LABEL.computed}: worked out by the engine from your numbers.`;

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

  const chart = svg("svg", { class: "band-chart", viewBox: `0 0 ${width} ${height}`, width, height, role: "img", "aria-labelledby": "band-chart-title band-chart-desc" });
  chart.append(svg("title", { id: "band-chart-title" }, "Net worth over time, three bands"));
  const desc = svg("desc", { id: "band-chart-desc" });
  chart.append(desc);

  const label = (cls: string, attrs: Record<string, string | number>, text: string) => {
    const node = svg("text", { class: cls, ...attrs }, text);
    node.append(svg("title", {}, `${text}. ${tip}`));
    return node;
  };

  // Zero line and a few grid lines.
  chart.append(svg("line", { class: "band-chart__axis", x1: pad.left, x2: width - pad.right, y1: y(0), y2: y(0) }));
  for (const frac of compact ? [0.5, 1] : [0.25, 0.5, 0.75, 1]) {
    const v = minValue + frac * (maxValue - minValue);
    chart.append(svg("line", { class: "band-chart__grid", x1: pad.left, x2: width - pad.right, y1: y(v), y2: y(v) }));
    chart.append(label("band-chart__label", { x: width - pad.right + 6, y: y(v) + 4 }, dollarsShort(v)));
  }

  // Year ticks: every ten years, or every twenty when narrow.
  const step = compact ? 20 : 10;
  for (let yr = Math.ceil(minYear / step) * step; yr <= maxYear; yr += step) {
    chart.append(svg("text", { class: "band-chart__label", x: x(yr), y: height - 8, "text-anchor": "middle" }, String(yr)));
  }

  const summaries: string[] = [];
  const labelYs: number[] = [];
  for (const s of series) {
    const d = s.points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.year).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
    const path = svg("path", { class: `band-chart__line band-chart__line--${s.band}`, d });
    path.append(svg("title", {}, `${LABEL[s.band]} band. ${tip}`));
    chart.append(path);
    if (s.retirementYear !== null) {
      chart.append(svg("line", { class: "band-chart__marker", x1: x(s.retirementYear), x2: x(s.retirementYear), y1: pad.top, y2: height - pad.bottom }));
    }
    // Label each line at its right end, nudged apart so the three names never overlap.
    const last = s.points[s.points.length - 1]!;
    const peak = s.points.reduce((best, p) => (p.value > best.value ? p : best), s.points[0]!);
    let ly = y(last.value) - 6;
    for (const taken of labelYs) if (Math.abs(taken - ly) < 18) ly = taken - 18;
    ly = Math.max(pad.top - 6, ly);
    labelYs.push(ly);
    chart.append(label(`band-chart__label band-chart__label--${s.band}`, { x: width - pad.right - 4, y: ly, "text-anchor": "end" }, LABEL[s.band]));
    summaries.push(
      `${LABEL[s.band]}: ${s.retirementYear !== null ? `retire in ${s.retirementYear}, ` : "never fully funded, "}peak ${dollarsShort(peak.value)} at age ${peak.age}, ${dollarsShort(last.value)} at age ${last.age}.`,
    );
  }
  desc.textContent = summaries.join(" ");

  return el(
    "figure",
    { class: "stack chart-figure" },
    chart,
    el("figcaption", { class: "chart-summary" }, el("span", { class: "chart-summary__kind" }, kindBadge("computed")), `Net worth by year in ${o.dollarsLabel}. ${summaries.join(" ")}`),
  );
}

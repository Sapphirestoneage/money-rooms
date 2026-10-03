/**
 * Prints the Maya tie-out: FI age and headline figures for each strategy, then
 * the engine against each checkpoint file, column by column.
 *
 * Run: npm run tie-out:compare
 */

import maya from "../households/maya.json";
import type { SavingsStrategy } from "../../engine";
import { CHECKPOINT_FILES, compareToCheckpoints, mayaFi, mayaTimelineAt42 } from "./maya-tie-out";

const money = (n: number) => Math.round(n).toLocaleString("en-US");

interface Expected {
  byStrategy: Record<SavingsStrategy, { fiAgeLikely: number; assetsAtRetirement: number; lifetimeTaxes: number; oneYearEarlierFailsAt: number }>;
  estateAtPlanTo?: Record<string, number>;
}
const expected = (maya as unknown as { expected: Expected }).expected;

console.log("BY STRATEGY (likely band, tie-out settings). Workpaper values in parentheses.");
for (const strategy of ["maxTaxSavingsNow", "maxTaxFreeGrowth", "enteredOnly"] as const) {
  const r = mayaFi(strategy);
  const e = expected.byStrategy[strategy];
  console.log(
    `  ${strategy}: FI age ${r.fiAge} (${e.fiAgeLikely}); assets at retirement ${money(r.timeline.assetsAtRetirement ?? 0)} (${money(e.assetsAtRetirement)}); lifetime taxes ${money(r.timeline.lifetimeTaxes)} (${money(e.lifetimeTaxes)}); one year earlier fails at ${r.oneYearEarlier?.age ?? "never"} (${e.oneYearEarlierFailsAt}); estate ${money(r.timeline.estate)}`,
  );
}

for (const { file, strategy } of CHECKPOINT_FILES) {
  const timeline = mayaTimelineAt42(strategy);
  const { checked, differences } = compareToCheckpoints(file, timeline);
  console.log(`\n${file} (${strategy}, retire at 42): ${checked} cells checked.`);
  if (differences.length === 0) {
    console.log("  All checkpoints match within tolerance.");
  } else {
    const d = differences[0]!;
    console.log(`  FIRST DIFFERENCE: ${d.year} (age ${d.age}), ${d.column}: workpaper ${money(d.expected)}, engine ${money(d.actual)} (${d.actual - d.expected >= 0 ? "+" : ""}${money(d.actual - d.expected)})`);
    console.log(`  ${differences.length} cells differ in all:`);
    for (const x of differences) console.log(`    ${x.year} age ${x.age} ${x.column}: workpaper ${money(x.expected)}, engine ${money(x.actual)}`);
  }
  const flags = [...new Set([...timeline.flags, ...timeline.rows.flatMap((r) => r.flags)])];
  for (const flag of flags) console.log(`  flag: ${flag}`);
}

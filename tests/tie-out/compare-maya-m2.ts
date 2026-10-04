/** Prints the M2 tie-out: headlines and every differing cell per workpaper. Run: npm run tie-out:m2 */
import { M2_FILES, compareM2, m2Fi, m2Timeline } from "./maya-m2-tie-out";

const money = (n: number) => Math.round(n).toLocaleString("en-US");
for (const { file, plan, policy } of M2_FILES) {
  const fi = m2Fi(policy());
  const t = m2Timeline(policy());
  console.log(`\nPlan ${plan}: FI age ${fi.fiAge} (retire ${fi.retirementYear}); at retire-at-41: assets at retirement ${money(t.assetsAtRetirement ?? 0)}, lifetime taxes and penalties ${money(t.lifetimeTaxes)}, estate ${money(t.estate)}, one year earlier fails at ${fi.oneYearEarlier?.age ?? "never"}`);
  const { checked, differences } = compareM2(file, t);
  console.log(`${file}: ${checked} cells checked, ${differences.length} differ.`);
  for (const d of differences) console.log(`  ${d.year} age ${d.age} ${d.column}: workpaper ${money(d.expected)}, engine ${money(d.actual)} (${d.actual - d.expected >= 0 ? "+" : ""}${money(d.actual - d.expected)})`);
}

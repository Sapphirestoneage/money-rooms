// Prints the numbers behind the Maya tie-out so they can be compared line by line
// with maya-tie-out.xlsx. Run: npx vite-node tests/tie-out/print-maya.ts
import maya from "../households/maya.json";
import { householdFromExample, project, userValue, type ExampleHouseholdFile, type SavingsStrategy } from "../../engine";

const asOf = "2026-10-02";
const money = (n: number | null | undefined) => (n == null ? "-" : Math.round(n).toLocaleString("en-US"));

for (const strategy of ["enteredOnly", "maxTaxSavingsNow", "maxTaxFreeGrowth"] as SavingsStrategy[]) {
  const h = householdFromExample(maya as ExampleHouseholdFile, asOf);
  h.savingsStrategy = userValue(strategy, asOf);
  const r = project(h);
  const L = r.bands.likely;
  console.log(`\n=== ${strategy} ===`);
  console.log(`FI age: best ${r.bands.best.fiAge}, likely ${L.fiAge}, worst ${r.bands.worst.fiAge}`);
  console.log(`likely: assets at retirement ${money(L.timeline.assetsAtRetirement)}, lifetime taxes ${money(L.timeline.lifetimeTaxes)}, estate ${money(L.timeline.estate)}, one year earlier fails at ${L.oneYearEarlier?.age}`);
  const ss = L.timeline.socialSecurity;
  console.log(`Social Security: PIA ${ss.pia.toFixed(2)}/mo, claim ${ss.claimingAgeYears}, annual ${money(ss.annualBenefit)}`);
  for (const i of [0, 1, 2]) {
    const y = L.timeline.rows[i]!;
    console.log(`${y.year} f=${y.fraction} gross ${money(y.income.gross / y.fraction)} | 401k ${money(y.deductions.workplacePretax / y.fraction)} roth401k ${money(y.deductions.workplaceRoth / y.fraction)} | fed ${money(y.taxes.federalIncome / y.fraction)} fica ${money(y.taxes.fica / y.fraction)} NY ${money(y.taxes.state / y.fraction)} | take-home ${money(y.takeHome / y.fraction)} | spend ${money(y.spending / y.fraction)} loan ${money(y.debt.scheduled / y.fraction)} | gap ${money(y.gap / y.fraction)} | contrib ${JSON.stringify(Object.fromEntries(Object.entries(y.contributions).map(([k, v]) => [k, Math.round(v / y.fraction)])))}`);
  }
  const ret = L.timeline.rows.find((x) => x.retired)!;
  console.log(`first retired year ${ret.year} age ${ret.age}: spending ${money(ret.spending)}, withdrawals ${JSON.stringify(Object.fromEntries(Object.entries(ret.withdrawals).map(([k, v]) => [k, Math.round(v)])))}, taxes ${money(ret.taxes.total)}`);
  const loanOff = L.timeline.rows.find((x) => x.balances["loan"] === 0);
  console.log(`loan paid off: ${loanOff?.year} (age ${loanOff?.age})`);
  for (const age of [42, 50, 59, 60, 66, 67, 75, 85, 95]) {
    const y = L.timeline.rows.find((x) => x.age === age);
    if (y) console.log(`  age ${age}: assets ${money(y.assets)} SS ${money(y.socialSecurity)} spend ${money(y.spending)} taxes ${money(y.taxes.total)} shortfall ${money(y.shortfall)}`);
  }
}

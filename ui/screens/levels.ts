/**
 * Levels (docs/levels/): Level 2 Resilience with the sturdiness view, Level 3
 * milestones and the FIRE spectrum, Level 5 Legacy. Inputs for each level's
 * fields, then the unlock view. Reads the engine. Never calculates.
 */

import {
  LEGACY_DEFAULTS,
  MILESTONE_DEFAULTS,
  RESILIENCE,
  annualGiving,
  basicsChecklist,
  disabilityGap,
  estateView,
  freedomBudget,
  givingForever,
  legacyFi,
  milestones,
  missingLevelOneAnswers,
  ruleOfFive,
  runway,
  shockTests,
  spectrumLine,
  staircaseMonths,
  sturdiness,
  sustainableWithdrawalRate,
  termLifeRange,
  unemploymentEstimate,
  userValue,
  type BasicsAnswer,
  type Household,
  type IncomeStability,
  type LegacyProject,
  type Milestone,
} from "../../engine";
import { gentleFlag } from "../components/gentle-flag";
import { kindBadge } from "../components/kind-badge";
import type { Drawer } from "../components/trace-drawer";
import { clear, el, rowId } from "../dom";
import { dollars, dollarsShort, monthWord } from "../format";
import { moduleLevelCards } from "../modules/index";
import type { Store } from "../store";

export interface LevelsContext {
  household: Household;
  store: Store;
  save(): void;
  goToEntry(): void;
  drawer: Drawer;
}

const months = (n: number) => (Number.isFinite(n) ? `${Math.round(n)} ${Math.round(n) === 1 ? "month" : "months"}` : "more than you'll need");

export function levelsScreen(ctx: LevelsContext): HTMLElement {
  const root = el("div", {});
  const h = () => ctx.household;
  const asOf = () => ctx.household.asOf;
  const complete = () => missingLevelOneAnswers(h()).length === 0;
  let milestoneList: Milestone[] | null = null;
  let shocks: ReturnType<typeof shockTests> | null = null;
  let legacy: ReturnType<typeof legacyFi> | null = null;
  let estate: ReturnType<typeof estateView> | null = null;
  let working = false;

  const compute = () => {
    if (working || !complete()) return;
    working = true;
    window.setTimeout(() => {
      try {
        milestoneList = milestones(h());
        shocks = shockTests(h());
        legacy = legacyFi(h());
        estate = estateView(h());
      } catch {
        milestoneList = null;
      }
      working = false;
      render();
    }, 30);
  };
  const invalidate = () => { milestoneList = null; shocks = null; legacy = null; estate = null; ctx.save(); render(); };

  function select<T extends string>(options: { value: T; label: string }[], current: T, onChange: (v: T) => void, label: string): HTMLSelectElement {
    const node = el("select", { class: "select", "aria-label": label });
    for (const o of options) node.append(el("option", { value: o.value, selected: o.value === current }, o.label));
    node.addEventListener("change", () => onChange(node.value as T));
    return node;
  }
  function numberField(label: string, value: number | undefined, placeholder: string, onChange: (v: number | null) => void, help?: string): HTMLElement {
    const input = el("input", { class: "input", type: "number", value: value ?? "", placeholder, min: 0, step: 1 });
    input.addEventListener("change", () => onChange(input.value === "" ? null : Number(input.value)));
    return el("div", { class: "field" }, el("label", {}, label), input, help ? el("p", { class: "field__help" }, help) : null);
  }

  function render(): void {
    clear(root);
    root.append(el("h1", { class: "screen-title" }, "Levels"), el("p", { class: "lede" }, "Levels add new ground. Each ends in an unlock. None is locked: jump anywhere, and What's next suggests the best order."));
    if (!complete()) {
      root.append(gentleFlag("Level 1 first: a few answers are still needed before the levels have numbers to work with.", { label: "Go to your numbers", onClick: ctx.goToEntry }));
      return;
    }
    // Each level's section: the core's card, then any active module's card for that level (docs/module-contract.md).
    root.append(resilienceCard(), ...moduleLevelCards(2, ctx), milestonesCard(), ...moduleLevelCards(3, ctx), legacyCard(), ...moduleLevelCards(5, ctx));
  }

  // ---- Level 2 -------------------------------------------------------------------
  function resilienceCard(): HTMLElement {
    const r = ruleOfFive(h());
    const stairs = staircaseMonths(h());
    const rw = runway(h());
    const s = sturdiness(h());
    const ui = unemploymentEstimate(h());
    const dis = disabilityGap(h());
    const life = termLifeRange(h());
    const res = () => (h().resilience ??= {});
    const inputs = el(
      "details",
      { class: "card" },
      el("summary", { class: "card__summary" }, el("h3", {}, "Level 2 inputs")),
      el(
        "div",
        { class: "field-grid card__details-body" },
        el("div", { class: "field" }, el("label", {}, "Income stability"), select<IncomeStability>([{ value: "steady", label: "Steady (nobody can fire me)" }, { value: "normal", label: "Normal" }, { value: "variable", label: "Variable (commission, gig, at-risk industry)" }], r.stability, (v) => { res().incomeStability = userValue(v, asOf()); invalidate(); }, "Income stability")),
        numberField("Months to close the gap", h().resilience?.monthsToClose?.value, String(RESILIENCE.ruleOfFive.monthsToCloseDefault), (v) => { if (v === null) delete res().monthsToClose; else res().monthsToClose = userValue(v, asOf()); invalidate(); }),
        el("div", { class: "field" }, el("label", {}, "Eligible for unemployment benefits"), select([{ value: "default", label: ui.eligible ? "Yes (from your income type)" : "No (from your income type)" }, { value: "yes", label: "Yes" }, { value: "no", label: "No" }], h().resilience?.unemploymentEligible ? (h().resilience!.unemploymentEligible!.value ? "yes" : "no") : "default", (v) => { if (v === "default") delete res().unemploymentEligible; else res().unemploymentEligible = userValue(v === "yes", asOf()); invalidate(); }, "Eligible for unemployment benefits")),
        numberField("Severance (weeks of pay)", h().resilience?.severanceWeeks?.value, "0", (v) => { if (v === null) delete res().severanceWeeks; else res().severanceWeeks = userValue(v, asOf()); invalidate(); }),
        numberField("Disability coverage (percent of pay replaced)", h().resilience?.disability?.replacesPercentOfPay.value, String(RESILIENCE.disability.defaultReplacesPercentOfPay), (v) => { if (v === null) delete res().disability; else res().disability = { replacesPercentOfPay: userValue(v, asOf()), waitingWeeks: res().disability?.waitingWeeks ?? userValue(RESILIENCE.disability.defaultWaitingWeeks, asOf()) }; invalidate(); }, "Blank means unsure, shown at the usual 60%."),
        numberField("People who depend on your income", h().resilience?.dependents?.value, "0", (v) => { if (v === null) delete res().dependents; else res().dependents = userValue(v, asOf()); invalidate(); }),
        numberField("Other must-pays (dollars a year)", h().resilience?.extraMustPaysAnnual?.value, "0", (v) => { if (v === null) delete res().extraMustPaysAnnual; else res().extraMustPaysAnnual = userValue(v, asOf()); invalidate(); }, "Health insurance, phone, and debt minimums are added from your rows."),
        el("div", { class: "field" }, el("label", {}, "Count retirement accounts as runway (break glass)"), select([{ value: "no", label: "No (the default)" }, { value: "yes", label: "Yes, after tax and the penalty" }], h().resilience?.breakGlass?.value ? "yes" : "no", (v) => { res().breakGlass = userValue(v === "yes", asOf()); invalidate(); }, "Break glass")),
      ),
    );
    return el(
      "section",
      { class: "card", "aria-label": "Level 2: Resilience" },
      el("div", { class: "card__title" }, el("h2", {}, "Level 2: Resilience")),
      el("p", { class: "true-fi__difference" }, s.headline, " ", kindBadge("computed")),
      el("h3", { class: "card__subtitle" }, "The Rule of 5"),
      el("p", {}, `You're ${r.ageYears}, and you spend ${dollars(r.monthlySpending)} a month (debt payments included). Target: ${r.targetMonths.toFixed(1)} months, or ${dollars(r.targetDollars)}. You have ${dollars(r.cashNow)}.`),
      el("p", {}, r.gap > 0 ? `Closing the gap over ${r.monthsToClose} months: ${dollars(r.closeMonthly)} a month, plus ${dollars(r.growthMonthly)} a month to keep pace as you age. ` : "The target is met. To keep pace as you age: ", el("strong", {}, `Save ${dollars(r.saveMonthly)} a month.`)),
      el("h3", { class: "card__subtitle" }, "The spending staircase"),
      el("p", {}, stairs.map((st, i) => (i === 0 ? `${st.label}: ${months(st.months)}.` : ` ${st.label}: +${Math.round(st.added)}.`)).join(""), ` Total: ${months(s.staircaseTotalMonths)}.`),
      el("p", { class: "muted" }, `Graceful path (step down every ${RESILIENCE.staircase.gracefulPathStepEveryMonths} months of no income): ${months(s.gracefulMonths)}. Must-pays stay on every step below full: ${rw.layers.length ? staircaseMustPays() : "none"}.`),
      el("h3", { class: "card__subtitle" }, "The runway stack"),
      el("ul", { class: "aged-list" }, ...rw.layers.map((l) => el("li", {}, el("strong", {}, l.label), el("span", { class: "muted" }, ` ${l.id === "cut" ? "" : `${dollars(l.dollars)}, `}${months(l.months)}`))), el("li", {}, el("strong", {}, "Break glass (retirement accounts)"), el("span", { class: "muted" }, ` ${dollars(rw.breakGlass.dollars)} after tax and the penalty, ${months(rw.breakGlass.months)}${rw.breakGlass.counted ? ", counted" : ", shown but not counted"}`))),
      el("p", {}, `Runway at full spending, health insurance after a job loss included: ${months(rw.totalMonths)}.`),
      el("p", { class: "muted" }, `Unemployment: ${ui.eligible ? `about ${dollars(ui.weeklyBenefit)} a week for ${ui.weeks} weeks, ${dollars(ui.afterTax)} after tax` : "not eligible"}. Source: ${ui.source}${ui.unverified ? " (placeholder, not yet verified: the state table is still to be sourced)" : ` (verified ${ui.lastVerified})`}.`),
      el("h3", { class: "card__subtitle" }, "When you can't work"),
      el("p", {}, `Disability coverage ${dis.unsure ? "(unsure, shown at the usual share) " : ""}would pay about ${dollars(dis.coveredMonthly)} a month after ${dis.waitingWeeks} weeks, leaving a gap of ${dollars(dis.gapMonthly)} a month${dis.gapMonthly > 0 ? `, which your cash covers for ${months(dis.monthsRunwayCovers)}` : ""}.`),
      life.applies ? el("p", {}, `Term life: a range of ${dollarsShort(life.low)} to ${dollarsShort(life.high)} would cover ${RESILIENCE.disability.termLifeYearsOfSupport[0]} to ${RESILIENCE.disability.termLifeYearsOfSupport[1]} years of support plus debts that would pass to others.`) : el("p", { class: "muted" }, "Term life appears only when someone depends on your income."),
      el("h3", { class: "card__subtitle" }, "Shock tests"),
      shocks ? el("ul", { class: "aged-list" }, ...shocks.map((sh) => el("li", {}, el("strong", {}, sh.label), el("div", { class: "muted" }, sh.sentence)))) : (compute(), el("p", { class: "muted" }, "Running the shock tests...")),
      inputs,
    );
  }
  function staircaseMustPays(): string {
    return "health insurance, phone, and debt minimums from your rows";
  }

  // ---- Level 3 -------------------------------------------------------------------
  function milestonesCard(): HTMLElement {
    const ms = () => (h().milestones ??= {});
    const inputs = el(
      "details",
      { class: "card" },
      el("summary", { class: "card__summary" }, el("h3", {}, "Level 3 settings")),
      el(
        "div",
        { class: "field-grid card__details-body" },
        numberField("Coast age", h().milestones?.coastAge?.value, String(MILESTONE_DEFAULTS.coastAge), (v) => { if (v === null) delete ms().coastAge; else ms().coastAge = userValue(v, asOf()); invalidate(); }),
        numberField("Part-time income for Barista FI (a year)", h().milestones?.baristaIncomeAnnual?.value, String(MILESTONE_DEFAULTS.baristaIncomeAnnual), (v) => { if (v === null) delete ms().baristaIncomeAnnual; else ms().baristaIncomeAnnual = userValue(v, asOf()); invalidate(); }),
        numberField("Fat FI multiplier", h().milestones?.fatFiMultiplier?.value, String(MILESTONE_DEFAULTS.fatFiMultiplier), (v) => { if (v === null) delete ms().fatFiMultiplier; else ms().fatFiMultiplier = userValue(v, asOf()); invalidate(); }),
        numberField("Slow FI target age", h().milestones?.slowFiTargetAge?.value, "FI date plus 5", (v) => { if (v === null) delete ms().slowFiTargetAge; else ms().slowFiTargetAge = userValue(v, asOf()); invalidate(); }),
        numberField("Walk-away months", h().milestones?.walkAwayMonths?.value, String(MILESTONE_DEFAULTS.walkAwayMonths), (v) => { if (v === null) delete ms().walkAwayMonths; else ms().walkAwayMonths = userValue(v, asOf()); invalidate(); }),
        numberField("Business runway months", h().milestones?.businessRunwayMonths?.value, String(MILESTONE_DEFAULTS.businessRunwayMonths), (v) => { if (v === null) delete ms().businessRunwayMonths; else ms().businessRunwayMonths = userValue(v, asOf()); invalidate(); }),
      ),
    );
    const body: (HTMLElement | null)[] = [];
    if (!milestoneList) {
      compute();
      body.push(el("p", { class: "muted" }, "Finding each milestone's date..."));
    } else {
      body.push(
        el("p", { class: "true-fi__difference" }, spectrumLine(milestoneList), " ", kindBadge("computed")),
        el("ul", { class: "aged-list" }, ...milestoneList.map((m) => el("li", {}, el("strong", {}, m.label), el("span", {}, m.comingSoon ? " Coming soon." : m.age === null ? " Not reached by plan-to age." : ` Age ${m.age} (${m.year}).`), el("div", { class: "muted" }, `${m.condition}. Moved most by ${m.movedBy}.${m.detail ? ` ${m.detail}` : ""}`)))),
      );
    }
    return el("section", { class: "card", "aria-label": "Level 3: Life plans, milestones" }, el("div", { class: "card__title" }, el("h2", {}, "Level 3: Milestones and the FIRE spectrum")), ...body, inputs);
  }

  // ---- Level 5 -------------------------------------------------------------------
  function legacyCard(): HTMLElement {
    const lg = () => (h().legacy ??= {});
    const basics = basicsChecklist(h());
    const giving = annualGiving(h());
    const swr = sustainableWithdrawalRate(h());
    const forever = givingForever(giving || 5000, swr);
    const budget = freedomBudget(h());
    const projects = h().legacy?.projects ?? [];
    const projectRows = projects.map((p) =>
      el(
        "li",
        {},
        el("div", {}, el("strong", {}, p.name), el("span", { class: "muted" }, ` ${p.type}, ${dollars(p.oneOffCost.value)} once and ${dollars(p.annualCost.value)} a year, ${p.hoursPerWeek.value} hours a week from ${p.startAge}${p.horizonYears === null ? ", forever" : ` for ${p.horizonYears} ${p.horizonYears === 1 ? "year" : "years"}`}`)),
        el("button", { type: "button", class: "button button--quiet button--small", onClick: () => { lg().projects = projects.filter((x) => x.id !== p.id); invalidate(); } }, "Remove"),
      ),
    );
    const addProject = () => {
      const p: LegacyProject = { id: rowId("legacy"), name: "New project", type: "other", oneOffCost: userValue(0, asOf()), annualCost: userValue(0, asOf()), hoursPerWeek: userValue(5, asOf()), startAge: 45, horizonYears: null };
      lg().projects = [...projects, p];
      invalidate();
    };
    const editor = (p: LegacyProject): HTMLElement =>
      el(
        "div",
        { class: "field-grid" },
        el("div", { class: "field" }, el("label", {}, "Name"), (() => { const i = el("input", { class: "input", type: "text", value: p.name }); i.addEventListener("change", () => { p.name = i.value; invalidate(); }); return i; })()),
        el("div", { class: "field" }, el("label", {}, "What it is"), select([{ value: "book", label: "Book" }, { value: "mentoring", label: "Mentoring" }, { value: "scholarship", label: "Scholarship" }, { value: "community", label: "Community project" }, { value: "family", label: "Family support" }, { value: "business", label: "A business that outlives you" }, { value: "creative", label: "Creative work" }, { value: "other", label: "Other" }], p.type, (v) => { p.type = v as LegacyProject["type"]; invalidate(); }, "What it is")),
        numberField("One-off cost", p.oneOffCost.value || undefined, "0", (v) => { p.oneOffCost = userValue(v ?? 0, asOf()); invalidate(); }),
        numberField("Cost a year", p.annualCost.value || undefined, "0", (v) => { p.annualCost = userValue(v ?? 0, asOf()); invalidate(); }),
        numberField("Hours a week", p.hoursPerWeek.value, "5", (v) => { p.hoursPerWeek = userValue(v ?? 0, asOf()); invalidate(); }),
        numberField("Start age", p.startAge, "45", (v) => { p.startAge = v ?? 45; invalidate(); }),
        numberField("Years (blank means forever)", p.horizonYears ?? undefined, "forever", (v) => { p.horizonYears = v; invalidate(); }),
      );
    const basicsList = el(
      "ul",
      { class: "aged-list" },
      ...basics.map((b) =>
        el("li", {}, el("div", {}, el("strong", {}, b.label)), el("div", { class: "muted" }, b.without), select<BasicsAnswer>([{ value: "unsure", label: "Unsure" }, { value: "yes", label: "Yes" }, { value: "no", label: "No" }], b.answer, (v) => {
          const current = lg().basics ?? { beneficiaries: userValue("unsure" as BasicsAnswer, asOf()), will: userValue("unsure" as BasicsAnswer, asOf()), healthcareProxy: userValue("unsure" as BasicsAnswer, asOf()), powerOfAttorney: userValue("unsure" as BasicsAnswer, asOf()) };
          current[b.id] = userValue(v, asOf());
          lg().basics = current;
          invalidate();
        }, b.label)),
      ),
    );
    const body: (HTMLElement | null)[] = [el("div", { class: "card__title" }, el("h2", {}, "Level 5: Legacy"))];
    if (!estate || !legacy) {
      compute();
      body.push(el("p", { class: "muted" }, "Working out the estate and Legacy FI..."));
    } else {
      body.push(
        el("h3", { class: "card__subtitle" }, "Money edition: the estate after heirs' taxes"),
        el("p", {}, `At plan-to age, after heirs' taxes at ${estate.heirTaxRatePercent}% on pretax money: likely ${dollars(estate.byBand.likely.after)}, best ${dollars(estate.byBand.best.after)}, worst ${dollars(estate.byBand.worst.after)}. `, kindBadge("computed")),
        el("p", { class: "muted" }, `Likely band by money type: Roth ${dollarsShort(estate.byBand.likely.roth)} (tax free to heirs), pretax ${dollarsShort(estate.byBand.likely.pretax)} (taxed at their rate), taxable ${dollarsShort(estate.byBand.likely.taxable)} (basis steps up), cash ${dollarsShort(estate.byBand.likely.cash)}.`),
        el("h3", { class: "card__subtitle" }, "Giving"),
        el("p", {}, `Annual giving in your spending: ${dollars(giving)}. ${forever !== null ? `To give ${dollars(giving || 5000)} a year forever at your plan's own withdrawal rate (${((swr ?? 0) * 100).toFixed(1)}%) takes about ${dollars(forever)}.` : "Giving forever needs a funded plan first."}`),
        el("h3", { class: "card__subtitle" }, "Hamiltonian edition: legacy projects"),
        projects.length ? el("ul", { class: "aged-list" }, ...projectRows) : el("p", { class: "muted" }, "No projects yet. Planting seeds: things whose payoff you may never see."),
        ...projects.map(editor),
        el("div", { class: "row-actions" }, el("button", { type: "button", class: "button button--quiet", onClick: addProject }, "Add a legacy project")),
        el("h3", { class: "card__subtitle" }, "Legacy FI and the breathing room"),
        el("p", {}, legacy.age === null ? "The plan with every project paid is not funded by plan-to age." : `Legacy FI at ${legacy.age} (${legacy.year}): the plan funds every project (${dollars(legacy.projectsAnnual)} a year and ${dollars(legacy.projectsOneOff)} once) and stays funded through plan-to age. `, kindBadge("computed")),
        el("p", { class: "muted" }, legacy.targetWithRoom !== null ? `Breathing room of ${h().legacy?.breathingRoomPercent?.value ?? LEGACY_DEFAULTS.breathingRoomPercent}% above the FI number means ${dollars(legacy.targetWithRoom)}${legacy.roomReachedYear !== null ? `, reached in ${legacy.roomReachedYear} while working` : ", not reached by plan-to age while working"}.` : ""),
        numberField("Breathing room (percent of the FI number)", h().legacy?.breathingRoomPercent?.value, String(LEGACY_DEFAULTS.breathingRoomPercent), (v) => { if (v === null) delete lg().breathingRoomPercent; else lg().breathingRoomPercent = userValue(v, asOf()); invalidate(); }),
        el("h3", { class: "card__subtitle" }, "The freedom budget"),
        el("p", {}, budget.sentence),
        budget.overCommitted ? gentleFlag("Your legacy projects ask for more hours than the week has after FI.") : null,
        el("h3", { class: "card__subtitle" }, "The basics"),
        basicsList,
        el("p", { class: "notice" }, "Not legal advice. For anything beyond the basics, see a professional."),
      );
    }
    return el("section", { class: "card", "aria-label": "Level 5: Legacy" }, ...body);
  }

  render();
  return root;
}

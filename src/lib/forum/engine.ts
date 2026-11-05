/**
 * Forum Finder engine.
 *
 * Contains decision logic only. Every amount, period, claim-type list and
 * exclusion comes from /rules via rule(id). Each reasoning step records the
 * rule ids it relied on, so the UI can show the source for every step.
 */
import { feesFile, forumsFile, limitationFile, rule } from "@/lib/rules";
import type { Rule } from "@/lib/rules/schema";
import {
  addPeriod,
  daysBetween,
  formatDate,
  isISODate,
  type ISODate,
} from "@/lib/dates/calendar";

export type PartyType = "individual" | "company";
export type Consent = "yes" | "no" | "unsure";
export type Mediation = "none" | "tadm" | "tmf_union";
export type EmploymentStatus = "employed" | "left" | "dismissed";

export interface ForumInput {
  amount: number;
  nature: string;
  claimant: PartyType;
  respondent: PartyType;
  consent: Consent;
  mediation: Mediation;
  /** false if no sum of money is claimed (e.g. injunction only) */
  moneyClaim: boolean;
  /** date the cause of action accrued, YYYY-MM-DD */
  accrualDate?: ISODate;
  /** employment claims only: decides which TADM deadline applies */
  employmentStatus?: EmploymentStatus;
  /** today, YYYY-MM-DD (injected so results are testable) */
  today: ISODate;
}

export type StepOutcome = "yes" | "no" | "info" | "warn";

export interface ReasonStep {
  forumId: string;
  text: string;
  outcome: StepOutcome;
  ruleIds: string[];
}

export interface ForumOption {
  forumId: string;
  /** short description of why it is open, e.g. "Within the S$20,000 limit" */
  basis: string;
  /** true if it depends on something not yet certain (e.g. consent) */
  conditional: boolean;
  conditions: string[];
  ruleIds: string[];
}

export interface ExcessOption {
  forumId: string;
  limit: number;
  amount: number;
  excess: number;
  ruleIds: string[];
}

export interface FeeResult {
  forumId: string;
  amount: number | null;
  text: string;
  ruleId: string;
}

export interface TimeBarResult {
  forumId: string;
  ruleId: string;
  label: string;
  deadline: ISODate | null;
  expired: boolean | null;
}

export interface LimitationResult {
  ruleId: string | null;
  deadline: ISODate | null;
  status: "ok" | "soon" | "expired" | "unmapped" | "no_date";
  text: string;
}

export interface ForumResult {
  primary: ForumOption | null;
  alternatives: ForumOption[];
  steps: ReasonStep[];
  excessOptions: ExcessOption[];
  fees: FeeResult[];
  timeBars: TimeBarResult[];
  limitation: LimitationResult;
  /** every rule id the result relied on, for the sources panel */
  ruleIds: string[];
}

/** Days before a deadline at which we start warning. A UI setting, not law. */
export const SOON_DAYS = 90;
/** Show "abandon the excess" if the excess is at most this share of the limit. */
export const EXCESS_SHOW_RATIO = 0.5;

export const sgd = (n: number) =>
  `S$${n.toLocaleString("en-SG", { maximumFractionDigits: 2 })}`;

const num = (id: string): number => {
  const v = rule(id).value;
  if (typeof v !== "number") throw new Error(`Rule ${id} is not a number`);
  return v;
};
const list = (id: string): string[] => {
  const v = rule(id).value;
  if (!Array.isArray(v)) throw new Error(`Rule ${id} is not a list`);
  return v;
};

type PeriodUnit = "days" | "weeks" | "months" | "years";
function periodOf(r: Rule): { n: number; unit: PeriodUnit } {
  if (typeof r.value !== "number") throw new Error(`Rule ${r.id} has no period`);
  if (!["days", "weeks", "months", "years"].includes(r.unit)) {
    throw new Error(`Rule ${r.id} has unit ${r.unit}, expected a period`);
  }
  return { n: r.value, unit: r.unit as PeriodUnit };
}
const periodText = (r: Rule) => {
  const { n, unit } = periodOf(r);
  return `${n} ${n === 1 ? unit.replace(/s$/, "") : unit}`;
};

/** Order in which open forums are preferred as the primary recommendation. */
const PREFERENCE = ["fjc", "ect", "cdrt", "phc", "sct", "mc", "dc", "gd"];

export function findForum(input: ForumInput): ForumResult {
  const steps: ReasonStep[] = [];
  const open: ForumOption[] = [];
  const excessOptions: ExcessOption[] = [];
  const timeBars: TimeBarResult[] = [];
  const { amount, nature } = input;
  const hasDate = !!input.accrualDate && isISODate(input.accrualDate);

  const step = (forumId: string, outcome: StepOutcome, text: string, ...ruleIds: string[]) =>
    steps.push({ forumId, outcome, text, ruleIds });

  const timeBar = (forumId: string, ruleId: string, label: string): TimeBarResult => {
    const r = rule(ruleId);
    const { n, unit } = periodOf(r);
    let deadline: ISODate | null = null;
    let expired: boolean | null = null;
    if (hasDate) {
      deadline = addPeriod(input.accrualDate!, n, unit);
      expired = input.today > deadline;
    }
    const tb = { forumId, ruleId, label, deadline, expired };
    timeBars.push(tb);
    return tb;
  };

  /* ---- Family matters: signpost and stop ---- */
  if (nature === "family" || list("fjc.claimTypes").includes(nature)) {
    step("fjc", "yes", "This is a family matter, which is heard in the Family Justice Courts.", "fjc.claimTypes");
    step("mc", "no", "The State Courts' civil jurisdiction excludes matters vested exclusively in a Family Court.", "mc.excluded.family", "dc.excluded.family");
    open.push({ forumId: "fjc", basis: "Family matter", conditional: false, conditions: [], ruleIds: ["fjc.claimTypes"] });
    return finish();
  }

  /* ---- Employment Claims Tribunals ---- */
  if (list("ect.claimTypes").includes(nature)) {
    const mediated = input.mediation === "tmf_union";
    const limitId = mediated ? "ect.limit.mediated" : "ect.limit.default";
    const limit = num(limitId);
    const conditions: string[] = [];
    const ids = ["ect.claimTypes", limitId, "ect.precondition.tadm"];

    if (input.claimant === "company") {
      step("ect", "warn", "Employers can bring only a claim for salary in lieu of notice of termination at the ECT.", "ect.claimTypes");
      conditions.push("As an employer, only a claim for salary in lieu of notice qualifies.");
    }
    if (input.mediation === "none") {
      step("ect", "warn", "You must first request mediation at TADM and obtain a Claim Referral Certificate before filing.", "ect.precondition.tadm");
      conditions.push("Request mediation at TADM first. You can file only with a Claim Referral Certificate.");
    } else {
      step("ect", "info", "Mediation has been attempted. You need the Claim Referral Certificate issued by TADM to file.", "ect.precondition.tadm");
    }
    step("ect", "info", mediated
      ? `The dispute went through TMF or union-assisted mediation, so the higher limit of ${sgd(limit)} applies.`
      : `The ECT limit is ${sgd(limit)}. It is higher only after TMF or union-assisted mediation.`, limitId);

    // TADM deadline
    const tadmId =
      input.employmentStatus === "dismissed" ? "ect.timeBar.tadm.wrongfulDismissal"
      : input.employmentStatus === "left" ? "ect.timeBar.tadm.left"
      : "ect.timeBar.tadm.employed";
    const tb = timeBar("ect", tadmId, rule(tadmId).title);
    timeBar("ect", "ect.timeBar.file", rule("ect.timeBar.file").title);
    ids.push(tadmId, "ect.timeBar.file");

    if (tb.expired) {
      step("ect", "no", `The time to request TADM mediation (${periodText(rule(tadmId))}) appears to have passed on ${formatDate(tb.deadline!)}.`, tadmId);
    } else if (amount <= limit) {
      step("ect", "yes", `${sgd(amount)} is within the ECT limit of ${sgd(limit)}.`, limitId);
      open.push({ forumId: "ect", basis: `Within the ${sgd(limit)} ECT limit`, conditional: false, conditions, ruleIds: ids });
    } else {
      step("ect", "no", `${sgd(amount)} is over the ECT limit of ${sgd(limit)}.`, limitId);
      excessOptions.push({ forumId: "ect", limit, amount, excess: amount - limit, ruleIds: [limitId, "ect.abandonExcess"] });
    }
  }

  /* ---- Community Disputes Resolution Tribunals ---- */
  if (list("cdrt.claimTypes").includes(nature)) {
    const limit = num("cdrt.limit.default");
    const ids = ["cdrt.claimTypes", "cdrt.limit.default", "cdrt.parties", "cdrt.timeBar"];
    const tb = timeBar("cdrt", "cdrt.timeBar", rule("cdrt.timeBar").title);
    if (input.claimant !== "individual" || input.respondent !== "individual") {
      step("cdrt", "no", "The CDRT is for disputes between individual neighbours.", "cdrt.parties");
    } else if (tb.expired) {
      step("cdrt", "no", `The CDRT time bar (${periodText(rule("cdrt.timeBar"))}) appears to have passed on ${formatDate(tb.deadline!)}.`, "cdrt.timeBar");
    } else if (amount <= limit) {
      step("cdrt", "yes", `A neighbour dispute claiming ${sgd(amount)} is within the CDRT limit of ${sgd(limit)}.`, "cdrt.claimTypes", "cdrt.limit.default");
      open.push({ forumId: "cdrt", basis: `Neighbour dispute within ${sgd(limit)}`, conditional: false, conditions: [], ruleIds: ids });
    } else {
      step("cdrt", "no", `${sgd(amount)} is over the CDRT maximum of ${sgd(limit)}, so the claim must go to court.`, "cdrt.limit.default");
    }
  }

  /* ---- Protection from Harassment Court ---- */
  const isHarassment = list("phc.claimTypes").includes(nature);
  if (isHarassment) {
    const simplified = num("phc.limit.simplified");
    const ids = ["phc.claimTypes", "phc.limit.simplified"];
    const tb = timeBar("phc", "phc.timeBar.simplified", rule("phc.timeBar.simplified").title);
    const simple = amount <= simplified && !tb.expired;
    step("phc", "yes", "Harassment claims under the Protection from Harassment Act are heard in the Protection from Harassment Court.", "phc.claimTypes");
    step("phc", "info", simple
      ? `A damages claim of ${sgd(amount)} is within ${sgd(simplified)}, so the simplified track may be available (single claimant, up to 5 respondents).`
      : `The simplified track is not available here (it requires a claim of ${sgd(simplified)} or less filed within ${periodText(rule("phc.timeBar.simplified"))}), so standard proceedings apply.`,
      "phc.limit.simplified", "phc.timeBar.simplified");
    open.push({ forumId: "phc", basis: simple ? "Harassment claim, simplified track" : "Harassment claim, standard track", conditional: false, conditions: [], ruleIds: ids });
  }

  /* ---- Small Claims Tribunals ---- */
  const sctTypes = list("sct.claimTypes");
  const sctExcluded = list("sct.excluded.motorVehicleDamage");
  if (sctExcluded.includes(nature)) {
    step("sct", "no", "The SCT cannot hear claims for property damage from a motor vehicle accident.", "sct.excluded.motorVehicleDamage");
  } else if (sctTypes.includes(nature)) {
    const base = num("sct.limit.default");
    const ext = num("sct.limit.consent");
    const tb = timeBar("sct", "sct.timeBar", rule("sct.timeBar").title);
    step("sct", "info", "This type of claim is a 'specified claim' that the SCT can hear, subject to the caveats on the claim-type rule.", "sct.claimTypes");
    if (!input.moneyClaim) {
      step("sct", "no", "The SCT is for claims with a monetary value. A claim for no sum of money is outside this tool's SCT check.", "sct.claimTypes");
    } else if (tb.expired) {
      step("sct", "no", `The SCT time bar (${periodText(rule("sct.timeBar"))} from accrual) appears to have passed on ${formatDate(tb.deadline!)}.`, "sct.timeBar");
    } else if (amount <= base) {
      step("sct", "yes", `${sgd(amount)} does not exceed the SCT limit of ${sgd(base)}.`, "sct.limit.default");
      open.push({ forumId: "sct", basis: `Within the ${sgd(base)} SCT limit`, conditional: false, conditions: [], ruleIds: ["sct.claimTypes", "sct.limit.default", "sct.timeBar"] });
    } else if (amount <= ext) {
      if (input.consent === "no") {
        step("sct", "no", `${sgd(amount)} is over ${sgd(base)}, and the other side will not sign a Memorandum of Consent for the ${sgd(ext)} limit.`, "sct.limit.default", "sct.limit.consent");
        excessOptions.push({ forumId: "sct", limit: base, amount, excess: amount - base, ruleIds: ["sct.limit.default", "sct.abandonExcess"] });
      } else {
        const unsure = input.consent === "unsure";
        step("sct", unsure ? "warn" : "yes", `${sgd(amount)} is over ${sgd(base)} but within ${sgd(ext)}, which the SCT can hear if all parties sign a Memorandum of Consent.`, "sct.limit.consent");
        open.push({
          forumId: "sct",
          basis: `By Memorandum of Consent (up to ${sgd(ext)})`,
          conditional: unsure,
          conditions: ["All parties must sign a Memorandum of Consent."],
          ruleIds: ["sct.claimTypes", "sct.limit.consent", "sct.timeBar"],
        });
        excessOptions.push({ forumId: "sct", limit: base, amount, excess: amount - base, ruleIds: ["sct.limit.default", "sct.abandonExcess"] });
      }
    } else {
      step("sct", "no", `${sgd(amount)} is over the SCT's highest limit of ${sgd(ext)} (with consent).`, "sct.limit.consent");
      excessOptions.push({ forumId: "sct", limit: base, amount, excess: amount - base, ruleIds: ["sct.limit.default", "sct.abandonExcess"] });
    }
  } else if (!isHarassment) {
    step("sct", "no", "This type of claim is not one of the 'specified claims' listed in the SCT Schedule.", "sct.claimTypes");
  }

  /* ---- The courts ---- */
  if (isHarassment) {
    step("mc", "info", "This tool routes Protection from Harassment Act claims to the PHC only, and does not assess the general civil courts for them.", "phc.claimTypes");
  } else {
    const passingOff =
      list("mc.excluded.passingOff").includes(nature) || list("dc.excluded.passingOff").includes(nature);

    // Magistrate's Court
    const mcLimit = num("mc.limit.default");
    if (list("mc.excluded.passingOff").includes(nature)) {
      step("mc", "no", "The Magistrate's Court cannot hear passing off actions.", "mc.excluded.passingOff");
    } else if (!input.moneyClaim) {
      step("mc", "no", "The Magistrate's Court cannot hear an action where no sum of money is claimed.", "mc.excluded.noMoneyClaim");
    } else if (amount <= mcLimit) {
      step("mc", "yes", `${sgd(amount)} does not exceed the Magistrate's Court limit of ${sgd(mcLimit)}.`, "mc.limit.default");
      open.push({ forumId: "mc", basis: `Within the ${sgd(mcLimit)} MC limit`, conditional: false, conditions: [], ruleIds: ["mc.limit.default"] });
    } else {
      step("mc", "no", `${sgd(amount)} is over the Magistrate's Court limit of ${sgd(mcLimit)}.`, "mc.limit.default");
      excessOptions.push({ forumId: "mc", limit: mcLimit, amount, excess: amount - mcLimit, ruleIds: ["mc.limit.default", "mc.abandonExcess"] });
    }

    // District Court
    const higher = list("dc.limit.rtaIndustrial.natures").includes(nature);
    const dcLimitId = higher ? "dc.limit.rtaIndustrial" : "dc.limit.default";
    const dcLimit = num(dcLimitId);
    const dcIds = [dcLimitId, ...(higher ? ["dc.limit.rtaIndustrial.natures"] : [])];
    const mcOpen = open.some((o) => o.forumId === "mc");
    if (list("dc.excluded.passingOff").includes(nature)) {
      step("dc", "no", "The District Court cannot hear passing off actions.", "dc.excluded.passingOff");
    } else if (amount <= dcLimit) {
      if (higher) step("dc", "info", `Road accident and industrial accident injury claims have a higher District Court limit of ${sgd(dcLimit)}.`, ...dcIds);
      if (!mcOpen) {
        step("dc", "yes", `${sgd(amount)} does not exceed the District Court limit of ${sgd(dcLimit)}.`, ...dcIds);
        open.push({ forumId: "dc", basis: `Within the ${sgd(dcLimit)} DC limit`, conditional: false, conditions: [], ruleIds: dcIds });
      } else {
        step("dc", "info", "The District Court also has jurisdiction, but the claim fits within the lower Magistrate's Court limit.", ...dcIds);
      }
    } else {
      step("dc", "no", `${sgd(amount)} is over the District Court limit of ${sgd(dcLimit)}.`, ...dcIds);
      excessOptions.push({ forumId: "dc", limit: dcLimit, amount, excess: amount - dcLimit, ruleIds: [dcLimitId, "dc.abandonExcess"] });
      if (input.consent !== "no") {
        step("dc", input.consent === "yes" ? "yes" : "warn", "The parties can agree by signed memorandum that the District Court hears the claim despite the limit.", "dc.consent");
        open.push({
          forumId: "dc",
          basis: "By signed memorandum (s 23)",
          conditional: input.consent === "unsure",
          conditions: ["The parties or their solicitors must sign a memorandum agreeing to District Court jurisdiction."],
          ruleIds: ["dc.consent"],
        });
      }
    }

    // General Division
    if (passingOff) {
      step("gd", "yes", "Passing off is excluded from the State Courts, so it starts in the General Division of the High Court.", "gd.passingOff");
      open.push({ forumId: "gd", basis: "Passing off is outside the State Courts", conditional: false, conditions: [], ruleIds: ["gd.passingOff"] });
    } else if (amount > dcLimit) {
      step("gd", "yes", `Claims above ${sgd(dcLimit)} start in the General Division of the High Court, which has no upper limit.`, "gd.limit.default", dcLimitId);
      open.push({ forumId: "gd", basis: `Above the ${sgd(dcLimit)} DC limit`, conditional: false, conditions: [], ruleIds: ["gd.limit.default"] });
    }
  }

  return finish();

  function finish(): ForumResult {
    const rank = (o: ForumOption) =>
      (o.conditional ? 100 : 0) + PREFERENCE.indexOf(o.forumId);
    const sorted = [...open].sort((a, b) => rank(a) - rank(b));
    const [primary = null, ...alternatives] = sorted;

    const shownExcess = excessOptions.filter(
      (e) => e.excess > 0 && e.excess <= e.limit * EXCESS_SHOW_RATIO &&
        // do not suggest abandoning to a forum that is already open
        !open.some((o) => o.forumId === e.forumId && !o.conditional),
    );

    const fees = [primary, ...alternatives]
      .filter((o): o is ForumOption => !!o)
      .map((o) => feeFor(o.forumId, amount, input.claimant))
      .filter((f): f is FeeResult => !!f);

    const limitation = limitationCheck(input);

    const ruleIds = Array.from(
      new Set([
        ...steps.flatMap((s) => s.ruleIds),
        ...shownExcess.flatMap((e) => e.ruleIds),
        ...fees.map((f) => f.ruleId),
        ...timeBars.map((t) => t.ruleId),
        ...(limitation.ruleId ? [limitation.ruleId] : []),
      ]),
    );

    return { primary, alternatives, steps, excessOptions: shownExcess, fees, timeBars, limitation, ruleIds };
  }
}

/** Filing fee for a forum, only where fees.json has a schedule. */
export function feeFor(forumId: string, amount: number, claimant: PartyType): FeeResult | null {
  const sched = feesFile.schedules.find((s) => s.forumId === forumId);
  if (!sched) return null;
  if (!sched.bands) {
    return { forumId, amount: null, text: sched.rule.explanation, ruleId: sched.rule.id };
  }
  const band = sched.bands.find((b) => b.upTo === null || amount <= b.upTo);
  if (!band) return { forumId, amount: null, text: sched.rule.explanation, ruleId: sched.rule.id };
  const f = claimant === "individual" ? band.individual : band.other;
  const fee = f.type === "flat" ? f.amount : Math.round(amount * f.amount) / 100;
  const who = claimant === "individual" ? "an individual" : "a company or other entity";
  const how = f.type === "percent" ? ` (${f.amount}% of ${sgd(amount)})` : "";
  return { forumId, amount: fee, text: `${sgd(fee)} for ${who}${how}`, ruleId: sched.rule.id };
}

/** Limitation Act check from the accrual date. */
export function limitationCheck(input: Pick<ForumInput, "nature" | "accrualDate" | "today">): LimitationResult {
  const ruleId = limitationFile.natureMap[input.nature] ?? null;
  if (!ruleId) {
    return {
      ruleId: null,
      deadline: null,
      status: "unmapped",
      text: "This tool does not map this claim type to a limitation period. Check the Limitation Act 1959 directly.",
    };
  }
  const r = rule(ruleId);
  if (!input.accrualDate || !isISODate(input.accrualDate)) {
    return { ruleId, deadline: null, status: "no_date", text: `${r.title}: ${periodText(r)} (${r.source.provision}). Enter the accrual date to check it.` };
  }
  const { n, unit } = periodOf(r);
  const deadline = addPeriod(input.accrualDate, n, unit);
  const left = daysBetween(input.today, deadline);
  const base = `${periodText(r)} from ${formatDate(input.accrualDate)} is ${formatDate(deadline)} (${r.source.instrument}, ${r.source.provision}).`;
  if (left < 0) return { ruleId, deadline, status: "expired", text: `The claim may be time-barred. ${base}` };
  if (left <= SOON_DAYS) return { ruleId, deadline, status: "soon", text: `The limitation period ends soon, in ${left} day${left === 1 ? "" : "s"}. ${base}` };
  return { ruleId, deadline, status: "ok", text: `Within time on these facts. ${base}` };
}

/** Exposed for the UI's dropdown. */
export const claimNatures = forumsFile.claimNatures;

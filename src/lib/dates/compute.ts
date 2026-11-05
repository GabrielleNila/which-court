/**
 * ROC 2021 time computation and timeline builder.
 *
 * All counting settings come from rules/time-computation.json and all
 * periods from rules/roc2021-steps.json. Every computed date carries a
 * plain-English "working" so the user can check it by hand.
 */
import { holidayFiles, stepsFile, timeFile } from "@/lib/rules";
import type { Rule, Stage, Step } from "@/lib/rules/schema";
import { addDays, addPeriod, formatDate, isISODate, toUTC, type ISODate } from "./calendar";

const S = timeFile.settings;

type PeriodUnit = "days" | "weeks" | "months" | "years";

const holidayMap = new Map<string, string>();
for (const f of holidayFiles) for (const h of f.holidays) holidayMap.set(h.date, h.name);
const coveredYears = new Set(holidayFiles.map((f) => f.year));

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function weekday(d: ISODate): string {
  return WEEKDAY[toUTC(d).getUTCDay()];
}

export function fmt(d: ISODate): string {
  return `${weekday(d).slice(0, 3)} ${formatDate(d)}`;
}

/** Why a day is a non-court day, or null if it is a court day. */
export function nonCourtReason(d: ISODate): string | null {
  const h = holidayMap.get(d);
  if (h) return `a public holiday (${h})`;
  const wd = toUTC(d).getUTCDay();
  if (S.nonCourtWeekdays.includes(wd)) return `a ${WEEKDAY[wd]}`;
  return null;
}

export function isHolidayYearCovered(d: ISODate): boolean {
  return coveredYears.has(toUTC(d).getUTCFullYear());
}

export interface Computation {
  date: ISODate;
  working: string[];
  ruleIds: string[];
  /** true if any date touched falls in a year with no holiday file */
  holidaysMissing: boolean;
}

function unitLabel(n: number, unit: string) {
  return `${n} ${n === 1 ? unit.replace(/s$/, "") : unit}`;
}

/**
 * Compute the last day for an act required "within N <unit> after" a date
 * (or, with inclusive, a period "beginning with" the date).
 */
export function computeDeadline(
  trigger: ISODate,
  n: number,
  unit: PeriodUnit,
  opts: { inclusive?: boolean; rollForward?: boolean } = {},
): Computation {
  const working: string[] = [];
  const ruleIds: string[] = [];
  let holidaysMissing = !isHolidayYearCovered(trigger);
  const rollForward = opts.rollForward ?? S.rollForwardFromNonCourtDay;
  let date: ISODate;

  if (unit === "days" && n <= S.shortPeriodMaxDays) {
    // O 3 r 3(6): count court days only
    let d = trigger;
    let counted = 0;
    const skipped: string[] = [];
    while (counted < n) {
      d = addDays(d, 1);
      if (!isHolidayYearCovered(d)) holidaysMissing = true;
      const why = nonCourtReason(d);
      if (why) skipped.push(`${fmt(d)} (${why})`);
      else counted++;
    }
    date = d;
    working.push(
      `${unitLabel(n, unit)} is ${S.shortPeriodMaxDays} days or less, so non-court days are left out of the count.` +
        (skipped.length ? ` Skipped: ${skipped.join(", ")}.` : ""),
    );
    working.push(`Counting ${n} court days after ${fmt(trigger)} gives ${fmt(date)}.`);
    ruleIds.push("time.shortPeriod", "time.excludeFirstDay");
  } else if (opts.inclusive) {
    date = addDays(addPeriod(trigger, n, unit), -1);
    working.push(
      `${unitLabel(n, unit)} beginning with ${fmt(trigger)} (the start date counts as day one) ends on ${fmt(date)}.`,
    );
    if (unit === "months") ruleIds.push("time.month");
  } else {
    date = addPeriod(trigger, n, unit);
    const first = addDays(trigger, 1);
    working.push(
      `${unitLabel(n, unit)} from ${fmt(trigger)} = ${fmt(date)}. The count starts on ${fmt(first)}, the day after.`,
    );
    ruleIds.push("time.excludeFirstDay");
    if (unit === "months") ruleIds.push("time.month");
  }

  if (!isHolidayYearCovered(date)) holidaysMissing = true;

  if (rollForward) {
    let why = nonCourtReason(date);
    if (why) {
      const reasons: string[] = [];
      while (why) {
        reasons.push(`${fmt(date)} is ${why}`);
        date = addDays(date, 1);
        if (!isHolidayYearCovered(date)) holidaysMissing = true;
        why = nonCourtReason(date);
      }
      working.push(`${reasons.join("; ")}. The deadline moves to the next court day: ${fmt(date)}.`);
      ruleIds.push("time.nonCourtDay", "time.nonCourtDayDefinition");
    }
  }
  return { date, working, ruleIds, holidaysMissing };
}

/** O 7 r 8: service after the cut-off hour is deemed effected the next day. */
export function deemedServiceDate(served: ISODate, afterCutoff: boolean): Computation {
  if (!afterCutoff) {
    return { date: served, working: [], ruleIds: [], holidaysMissing: !isHolidayYearCovered(served) };
  }
  const date = addDays(served, 1);
  const h = S.serviceCutoffHour;
  const hour = h > 12 ? `${h - 12} p.m.` : `${h} a.m.`;
  return {
    date,
    working: [`Served after ${hour} on ${fmt(served)}, so service is treated as effected on ${fmt(date)}.`],
    ruleIds: ["time.serviceAfter5pm"],
    holidaysMissing: !isHolidayYearCovered(date),
  };
}

/* ---------------- Timeline ---------------- */

export type Side = "claimant" | "defendant";
export type CourtLevel = "state" | "gd";

export interface TimelineInput {
  stageId: string;
  date: ISODate;
  servedAfter5pm?: boolean;
  outOfSingapore?: boolean;
  court?: CourtLevel;
}

export interface TimelineItem {
  step: Step;
  rule: Rule;
  date: ISODate | null;
  working: string[];
  ruleIds: string[];
}

export interface Timeline {
  stage: Stage;
  trigger: ISODate;
  triggerWorking: string[];
  items: TimelineItem[];
  holidaysMissing: boolean;
  ruleIds: string[];
}

export function getStage(id: string): Stage {
  const s = stepsFile.stages.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown stage ${id}`);
  return s;
}

export function buildTimeline(input: TimelineInput): Timeline {
  if (!isISODate(input.date)) throw new Error(`Bad date ${input.date}`);
  const stage = getStage(input.stageId);
  const deemed = deemedServiceDate(input.date, stage.timeOfService && !!input.servedAfter5pm);
  const trigger = deemed.date;
  let holidaysMissing = deemed.holidaysMissing;

  const steps = stepsFile.steps.filter(
    (s) => s.stage === stage.id && (!s.court || s.court === (input.court ?? "state")),
  );
  const byId = new Map<string, TimelineItem>();
  const items: TimelineItem[] = [];

  for (const step of steps) {
    const r = input.outOfSingapore && step.ruleOutOfSingapore ? step.ruleOutOfSingapore : step.rule;
    let item: TimelineItem;
    if (step.kind === "info") {
      item = { step, rule: r, date: null, working: [], ruleIds: [r.id] };
    } else if (step.kind === "available") {
      const prior = step.afterStep ? byId.get(step.afterStep) : undefined;
      if (!prior?.date) {
        item = { step, rule: r, date: null, working: [], ruleIds: [r.id] };
      } else {
        const date = addDays(prior.date, 1);
        item = {
          step,
          rule: r,
          date,
          working: [`Available from the day after the deadline for "${prior.step.title}" (${fmt(prior.date)}): ${fmt(date)}, if the step was not taken.`],
          ruleIds: [r.id],
        };
      }
    } else {
      if (typeof r.value !== "number") throw new Error(`Step ${step.id} has no period`);
      const c = computeDeadline(trigger, r.value, r.unit as PeriodUnit, {
        inclusive: step.countFrom === "inclusive",
        rollForward: step.kind === "deadline",
      });
      holidaysMissing ||= c.holidaysMissing;
      const working =
        step.kind === "expected"
          ? [...c.working, "The Court fixes the actual date and may hold it earlier or later."]
          : c.working;
      item = { step, rule: r, date: c.date, working, ruleIds: [r.id, ...c.ruleIds] };
    }
    byId.set(step.id, item);
    items.push(item);
  }

  items.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
  });

  const ruleIds = Array.from(new Set([...deemed.ruleIds, ...items.flatMap((i) => i.ruleIds)]));
  return { stage, trigger, triggerWorking: deemed.working, items, holidaysMissing, ruleIds };
}

/** Whether a step is for the side the user acts for. */
export function isOurs(step: Step, side: Side): boolean {
  return step.actor === side || step.actor === "both";
}

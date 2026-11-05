/**
 * Loads and validates every rule file in /rules.
 *
 * If any file breaks the schema, this throws at build time, so a bad rule
 * edit cannot reach production.
 */
import forumsJson from "../../../rules/forums.json";
import limitationJson from "../../../rules/limitation.json";
import feesJson from "../../../rules/fees.json";
import timeJson from "../../../rules/time-computation.json";
import stepsJson from "../../../rules/roc2021-steps.json";
import holidays2026Json from "../../../rules/public-holidays-2026.json";
import holidays2027Json from "../../../rules/public-holidays-2027.json";
import {
  FeesFile,
  ForumsFile,
  HolidaysFile,
  LimitationFile,
  StepsFile,
  TimeComputationFile,
  type Forum,
  type Rule,
} from "./schema";

export const forumsFile = ForumsFile.parse(forumsJson);
export const limitationFile = LimitationFile.parse(limitationJson);
export const feesFile = FeesFile.parse(feesJson);
export const timeFile = TimeComputationFile.parse(timeJson);
export const stepsFile = StepsFile.parse(stepsJson);
/** Add each new year's file here. */
export const holidayFiles = [holidays2026Json, holidays2027Json].map((h) => HolidaysFile.parse(h));

export type RuleWithOrigin = Rule & { file: string; group: string };

/** Every rule in every file, tagged with where it came from. */
export function allRules(): RuleWithOrigin[] {
  const out: RuleWithOrigin[] = [];
  for (const f of forumsFile.forums) {
    for (const r of f.rules) out.push({ ...r, file: "forums.json", group: f.name });
  }
  for (const r of limitationFile.rules) {
    out.push({ ...r, file: "limitation.json", group: "Limitation periods" });
  }
  for (const s of feesFile.schedules) {
    out.push({ ...s.rule, file: "fees.json", group: "Filing fees" });
  }
  for (const r of timeFile.rules) {
    out.push({ ...r, file: "time-computation.json", group: "Counting time (ROC 2021)" });
  }
  for (const s of stepsFile.steps) {
    out.push({ ...s.rule, file: "roc2021-steps.json", group: "Procedural steps (ROC 2021)" });
    if (s.ruleOutOfSingapore) {
      out.push({ ...s.ruleOutOfSingapore, file: "roc2021-steps.json", group: "Procedural steps (ROC 2021)" });
    }
  }
  for (const h of holidayFiles) {
    out.push({ ...h.rule, file: `public-holidays-${h.year}.json`, group: "Public holidays" });
  }
  return out;
}

const ruleIndex = new Map<string, Rule>(allRules().map((r) => [r.id, r]));

/** Look up a rule by id. Throws if missing, so typos fail loudly in tests. */
export function rule(id: string): Rule {
  const r = ruleIndex.get(id);
  if (!r) throw new Error(`Rule not found: ${id}`);
  return r;
}

export function maybeRule(id: string): Rule | undefined {
  return ruleIndex.get(id);
}

export function forum(id: string): Forum {
  const f = forumsFile.forums.find((x) => x.id === id);
  if (!f) throw new Error(`Forum not found: ${id}`);
  return f;
}

export function natureLabel(id: string): string {
  return forumsFile.claimNatures.find((n) => n.id === id)?.label ?? id;
}

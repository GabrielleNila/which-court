/**
 * Loads and validates every rule file in /rules.
 *
 * If any file breaks the schema, this throws at build time, so a bad rule
 * edit cannot reach production.
 */
import forumsJson from "../../../rules/forums.json";
import limitationJson from "../../../rules/limitation.json";
import feesJson from "../../../rules/fees.json";
import {
  FeesFile,
  ForumsFile,
  LimitationFile,
  type Forum,
  type Rule,
} from "./schema";

export const forumsFile = ForumsFile.parse(forumsJson);
export const limitationFile = LimitationFile.parse(limitationJson);
export const feesFile = FeesFile.parse(feesJson);

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

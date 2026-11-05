/**
 * Schema for every rule file in /rules.
 *
 * The app never hard-codes a legal value. Every limit, period, fee and
 * forum rule lives in a JSON file under /rules and is validated against
 * these schemas, both at build time (via the loader) and in CI (via tests).
 */
import { z } from "zod";

export const SCHEMA_VERSION = "1.0";

/** How far a rule has been checked. Only a human sets VERIFIED. */
export const RuleStatus = z.enum(["UNVERIFIED", "SOURCE_CHECKED", "VERIFIED"]);
export type RuleStatus = z.infer<typeof RuleStatus>;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const Source = z.object({
  /** e.g. "Small Claims Tribunals Act 1984" or "Rules of Court 2021" */
  instrument: z.string().min(1),
  /** e.g. "s 5(3)(b)" or "O 6 r 6(1)" */
  provision: z.string().min(1),
  /** Link to SSO, judiciary.gov.sg or eLitigation where possible */
  url: z.url().nullable(),
});
export type Source = z.infer<typeof Source>;

export const Unit = z.enum([
  "SGD",
  "days",
  "weeks",
  "months",
  "years",
  "percent",
  "list",
  "boolean",
  "text",
]);

/** The core shape shared by every rule entry in every file. */
export const Rule = z
  .object({
    id: z.string().regex(/^[a-z][a-zA-Z0-9_.-]*$/, "id: letters, digits, dots"),
    title: z.string().min(1),
    value: z.union([
      z.number(),
      z.string(),
      z.boolean(),
      z.array(z.string()),
      z.null(),
    ]),
    unit: Unit,
    source: Source,
    lastVerified: isoDate,
    status: RuleStatus,
    /** Who matched the rule against its source (e.g. "Claude") */
    checkedBy: z.string().nullable(),
    /** Who signed it off. Must be set when status is VERIFIED. */
    verifiedBy: z.string().nullable(),
    explanation: z.string().min(1),
    learnMore: z.string().optional(),
    caveats: z.array(z.string()).optional(),
    /** Notes about what still needs checking. Shown only when SHOW_RULE_STATUS is on. */
    verificationNotes: z.array(z.string()).optional(),
  })
  .refine((r) => r.status !== "VERIFIED" || !!r.verifiedBy, {
    message: "A VERIFIED rule must name verifiedBy",
    path: ["verifiedBy"],
  });
export type Rule = z.infer<typeof Rule>;

const fileEnvelope = {
  schemaVersion: z.literal(SCHEMA_VERSION),
  rulesVersion: isoDate,
  description: z.string(),
};

/* ---------- forums.json ---------- */

export const ClaimNature = z.object({
  id: z.string(),
  label: z.string(),
  hint: z.string().optional(),
});
export type ClaimNature = z.infer<typeof ClaimNature>;

export const Forum = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  /** Which court system it sits in, for display */
  system: z.string(),
  summary: z.string(),
  learnMore: z.string(),
  rules: z.array(Rule).min(1),
});
export type Forum = z.infer<typeof Forum>;

export const ForumsFile = z.object({
  ...fileEnvelope,
  claimNatures: z.array(ClaimNature),
  forums: z.array(Forum),
});
export type ForumsFile = z.infer<typeof ForumsFile>;

/* ---------- limitation.json ---------- */

export const LimitationFile = z.object({
  ...fileEnvelope,
  /** Map from claim nature id -> rule id in `rules` */
  natureMap: z.record(z.string(), z.string().nullable()),
  rules: z.array(Rule),
});
export type LimitationFile = z.infer<typeof LimitationFile>;

/* ---------- fees.json ---------- */

export const FeeBand = z.object({
  /** inclusive upper bound of the claim amount for this band; null = no cap */
  upTo: z.number().nullable(),
  individual: z.object({ type: z.enum(["flat", "percent"]), amount: z.number() }),
  other: z.object({ type: z.enum(["flat", "percent"]), amount: z.number() }),
});

export const FeeSchedule = z.object({
  forumId: z.string(),
  rule: Rule,
  bands: z.array(FeeBand).optional(),
});

export const FeesFile = z.object({
  ...fileEnvelope,
  schedules: z.array(FeeSchedule),
});
export type FeesFile = z.infer<typeof FeesFile>;
export type FeeSchedule = z.infer<typeof FeeSchedule>;

/* ---------- time-computation.json ---------- */

export const TimeComputationFile = z.object({
  ...fileEnvelope,
  settings: z.object({
    excludeTriggerDay: z.boolean(),
    monthIsCalendarMonth: z.boolean(),
    shortPeriodMaxDays: z.number().int().nonnegative(),
    rollForwardFromNonCourtDay: z.boolean(),
    /** 0 = Sunday ... 6 = Saturday */
    nonCourtWeekdays: z.array(z.number().int().min(0).max(6)),
    serviceCutoffHour: z.number().int().min(0).max(23),
  }),
  rules: z.array(Rule),
});
export type TimeComputationFile = z.infer<typeof TimeComputationFile>;

/* ---------- public-holidays-YYYY.json ---------- */

export const HolidaysFile = z.object({
  ...fileEnvelope,
  year: z.number().int(),
  rule: Rule,
  holidays: z.array(z.object({ date: isoDate, name: z.string() })),
});
export type HolidaysFile = z.infer<typeof HolidaysFile>;

/* ---------- roc2021-steps.json ---------- */

export const Stage = z.object({
  id: z.string(),
  label: z.string(),
  dateLabel: z.string(),
  description: z.string(),
  /** whether the trigger is a service, so the 5 p.m. rule can apply */
  timeOfService: z.boolean(),
});
export type Stage = z.infer<typeof Stage>;

export const Step = z.object({
  id: z.string(),
  stage: z.string(),
  actor: z.enum(["claimant", "defendant", "court", "both"]),
  /**
   * deadline: last day to act (rolled forward off non-court days)
   * available: from the day after another step's deadline
   * expected: an approximate date the Court fixes (not rolled)
   * info: a rule with no date
   */
  kind: z.enum(["deadline", "available", "expected", "info"]),
  title: z.string(),
  /** "inclusive" for periods that begin WITH the trigger date */
  countFrom: z.enum(["after", "inclusive"]).optional(),
  afterStep: z.string().optional(),
  /** limit to judgments of a particular court */
  court: z.enum(["state", "gd"]).optional(),
  rule: Rule,
  ruleOutOfSingapore: Rule.optional(),
});
export type Step = z.infer<typeof Step>;

export const StepsFile = z.object({
  ...fileEnvelope,
  scopeNote: z.string(),
  stages: z.array(Stage),
  steps: z.array(Step),
});
export type StepsFile = z.infer<typeof StepsFile>;

import { describe, expect, it } from "vitest";
import { feeFor, findForum, limitationCheck, type ForumInput } from "@/lib/forum/engine";

const base: ForumInput = {
  amount: 10000,
  nature: "debt_goods_services",
  claimant: "company",
  respondent: "company",
  consent: "no",
  mediation: "none",
  moneyClaim: true,
  today: "2026-11-05",
};
const run = (over: Partial<ForumInput>) => findForum({ ...base, ...over });
const ids = (r: ReturnType<typeof findForum>) =>
  [r.primary, ...r.alternatives].filter(Boolean).map((o) => o!.forumId);

describe("Forum Finder: monetary limits at the boundary", () => {
  it("S$20,000 exactly stays in the SCT (limit is inclusive)", () => {
    const r = run({ amount: 20000 });
    expect(r.primary?.forumId).toBe("sct");
    expect(ids(r)).toContain("mc");
  });

  it("S$20,000.01 needs a Memorandum of Consent for the SCT", () => {
    const r = run({ amount: 20000.01, consent: "no" });
    expect(ids(r)).not.toContain("sct");
    expect(r.primary?.forumId).toBe("mc");
    expect(r.excessOptions.find((e) => e.forumId === "sct")?.excess).toBeCloseTo(0.01);
  });

  it("S$25,000 with consent goes to the SCT under the extended limit", () => {
    const r = run({ amount: 25000, consent: "yes" });
    expect(r.primary?.forumId).toBe("sct");
    expect(r.primary?.basis).toMatch(/Memorandum of Consent/);
  });

  it("S$25,000 with consent unsure prefers the MC, with the SCT as a conditional alternative", () => {
    const r = run({ amount: 25000, consent: "unsure" });
    expect(r.primary?.forumId).toBe("mc");
    expect(r.alternatives.find((a) => a.forumId === "sct")?.conditional).toBe(true);
  });

  it("S$60,000 exactly stays in the Magistrate's Court", () => {
    const r = run({ amount: 60000 });
    expect(r.primary?.forumId).toBe("mc");
  });

  it("S$60,000.01 moves to the District Court and offers abandoning the excess to the MC", () => {
    const r = run({ amount: 60000.01 });
    expect(r.primary?.forumId).toBe("dc");
    expect(r.excessOptions.find((e) => e.forumId === "mc")).toBeTruthy();
  });

  it("S$250,000 exactly stays in the District Court", () => {
    const r = run({ amount: 250000 });
    expect(r.primary?.forumId).toBe("dc");
    expect(ids(r)).not.toContain("gd");
  });

  it("S$250,000.01 goes to the General Division, with DC by s 23 memorandum if consent", () => {
    const noConsent = run({ amount: 250000.01, consent: "no" });
    expect(noConsent.primary?.forumId).toBe("gd");
    expect(ids(noConsent)).not.toContain("dc");

    const consent = run({ amount: 250000.01, consent: "yes" });
    expect(consent.primary?.forumId).toBe("dc");
    expect(consent.primary?.ruleIds).toContain("dc.consent");
    expect(ids(consent)).toContain("gd");
  });

  it("a S$400,000 road accident injury claim stays in the DC under the higher limit", () => {
    const r = run({ amount: 400000, nature: "pi_road" });
    expect(r.primary?.forumId).toBe("dc");
  });

  it("a S$400,000 contract claim goes to the General Division", () => {
    expect(run({ amount: 400000, nature: "contract" }).primary?.forumId).toBe("gd");
  });
});

describe("Forum Finder: subject-matter rules", () => {
  it("passing off goes to the General Division whatever the amount", () => {
    const r = run({ amount: 5000, nature: "passing_off" });
    expect(r.primary?.forumId).toBe("gd");
    expect(ids(r)).not.toContain("mc");
    expect(ids(r)).not.toContain("dc");
  });

  it("a claim for no sum of money cannot be in the MC", () => {
    const r = run({ amount: 10000, moneyClaim: false, nature: "contract" });
    expect(ids(r)).not.toContain("mc");
    expect(r.primary?.forumId).toBe("dc");
  });

  it("defamation is not an SCT claim", () => {
    const r = run({ amount: 5000, nature: "defamation" });
    expect(ids(r)).not.toContain("sct");
    expect(r.primary?.forumId).toBe("mc");
  });

  it("road accident property damage is excluded from the SCT", () => {
    const r = run({ amount: 5000, nature: "road_accident_damage" });
    expect(ids(r)).not.toContain("sct");
  });

  it("family matters are signposted to the FJC only", () => {
    const r = run({ nature: "family" });
    expect(r.primary?.forumId).toBe("fjc");
    expect(r.alternatives).toHaveLength(0);
  });

  it("harassment goes to the PHC", () => {
    expect(run({ nature: "harassment", amount: 5000 }).primary?.forumId).toBe("phc");
  });

  it("a neighbour dispute between individuals goes to the CDRT", () => {
    const r = run({ nature: "neighbour", amount: 3000, claimant: "individual", respondent: "individual" });
    expect(r.primary?.forumId).toBe("cdrt");
  });
});

describe("Forum Finder: Employment Claims Tribunals", () => {
  const emp = { nature: "employment_salary", claimant: "individual" as const };

  it("S$20,000 salary claim fits the ECT", () => {
    expect(run({ ...emp, amount: 20000 }).primary?.forumId).toBe("ect");
  });

  it("S$25,000 needs TMF or union mediation for the ECT", () => {
    expect(run({ ...emp, amount: 25000, mediation: "tadm" }).primary?.forumId).toBe("mc");
    expect(run({ ...emp, amount: 25000, mediation: "tmf_union" }).primary?.forumId).toBe("ect");
  });

  it("flags that TADM mediation is needed first", () => {
    const r = run({ ...emp, amount: 5000, mediation: "none" });
    expect(r.primary?.conditions.join(" ")).toMatch(/TADM/);
  });
});

describe("Forum Finder: time bars and limitation", () => {
  it("SCT is closed once 2 years have passed since accrual", () => {
    const r = run({ amount: 5000, accrualDate: "2024-11-04" });
    expect(ids(r)).not.toContain("sct");
    expect(r.primary?.forumId).toBe("mc");
  });

  it("SCT is still open on the last day of the 2 years", () => {
    const r = run({ amount: 5000, accrualDate: "2024-11-05" });
    expect(r.primary?.forumId).toBe("sct");
  });

  it("flags a contract claim older than 6 years as possibly time-barred", () => {
    const l = limitationCheck({ nature: "contract", accrualDate: "2020-11-04", today: "2026-11-05" });
    expect(l.status).toBe("expired");
    expect(l.ruleId).toBe("la.s6.contractTort");
  });

  it("uses the 3-year period for personal injury", () => {
    const l = limitationCheck({ nature: "pi_road", accrualDate: "2024-06-01", today: "2026-11-05" });
    expect(l.deadline).toBe("2027-06-01");
    expect(l.status).toBe("ok");
  });

  it("warns when the period ends within 90 days", () => {
    const l = limitationCheck({ nature: "contract", accrualDate: "2020-12-01", today: "2026-11-05" });
    expect(l.status).toBe("soon");
  });

  it("does not guess for unmapped claim types", () => {
    expect(limitationCheck({ nature: "other", accrualDate: "2020-01-01", today: "2026-11-05" }).status).toBe("unmapped");
  });
});

describe("Filing fees", () => {
  it("SCT individual up to S$5,000 is S$10", () => {
    expect(feeFor("sct", 5000, "individual")?.amount).toBe(10);
  });
  it("SCT company claim of S$20,000 is 3%", () => {
    expect(feeFor("sct", 20000, "company")?.amount).toBe(600);
  });
  it("no fee is invented for forums without a sourced schedule", () => {
    expect(feeFor("mc", 20000, "individual")).toBeNull();
  });
});

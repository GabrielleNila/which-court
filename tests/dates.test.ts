import { describe, expect, it } from "vitest";
import { buildTimeline, computeDeadline, deemedServiceDate, nonCourtReason } from "@/lib/dates/compute";

const item = (t: ReturnType<typeof buildTimeline>, id: string) => t.items.find((i) => i.step.id === id)!;

describe("O 3 r 3 time computation", () => {
  it("excludes the day of service: 21 days from Thu 5 Nov 2026 is Thu 26 Nov 2026", () => {
    const c = computeDeadline("2026-11-05", 21, "days");
    expect(c.date).toBe("2026-11-26");
    expect(c.working[0]).toMatch(/21 days from Thu 5 Nov 2026 = Thu 26 Nov 2026/);
  });

  it("moves a deadline landing on a Sunday to the Monday", () => {
    // 14 days after Sun 1 Nov 2026 = Sun 15 Nov 2026
    const c = computeDeadline("2026-11-01", 14, "days");
    expect(c.date).toBe("2026-11-16");
    expect(c.ruleIds).toContain("time.nonCourtDay");
    expect(c.working.join(" ")).toMatch(/Sunday/);
  });

  it("moves a deadline landing on a public holiday to the next court day", () => {
    // 14 days after Mon 26 Oct 2026 = Mon 9 Nov 2026 (Deepavali observed)
    const c = computeDeadline("2026-10-26", 14, "days");
    expect(c.date).toBe("2026-11-10");
    expect(c.working.join(" ")).toMatch(/Deepavali/);
  });

  it("skips a run of non-court days (Sat, National Day Sun, observed Mon)", () => {
    // 14 days after Sat 25 Jul 2026 = Sat 8 Aug 2026 -> Sun 9 (PH) -> Mon 10 (PH) -> Tue 11 Aug
    expect(computeDeadline("2026-07-25", 14, "days").date).toBe("2026-08-11");
  });

  it("handles service on a Friday", () => {
    const t = buildTimeline({ stageId: "soc_served", date: "2026-11-06" });
    expect(item(t, "noic").date).toBe("2026-11-20");
    expect(item(t, "defence").date).toBe("2026-11-27");
  });

  it("treats service after 5 p.m. on a Friday as served on Saturday", () => {
    const d = deemedServiceDate("2026-11-06", true);
    expect(d.date).toBe("2026-11-07");
    const t = buildTimeline({ stageId: "soc_served", date: "2026-11-06", servedAfter5pm: true });
    // 14 days after Sat 7 Nov = Sat 21 Nov -> Mon 23 Nov
    expect(item(t, "noic").date).toBe("2026-11-23");
    expect(t.triggerWorking[0]).toMatch(/5 p\.m\./);
  });

  it("excludes non-court days for periods of 6 days or less", () => {
    // 3 court days after Fri 6 Nov 2026: Mon 9 is a PH, so Tue 10, Wed 11, Thu 12
    const c = computeDeadline("2026-11-06", 3, "days");
    expect(c.date).toBe("2026-11-12");
  });

  it("counts calendar months and clamps to the month end", () => {
    // 6 months after 31 Aug 2026 = 28 Feb 2027 (no 31 Feb), a Sunday, so Mon 1 Mar 2027
    expect(computeDeadline("2026-08-31", 6, "months").date).toBe("2027-03-01");
  });

  it("knows the non-court days", () => {
    expect(nonCourtReason("2026-11-07")).toMatch(/Saturday/);
    expect(nonCourtReason("2026-11-09")).toMatch(/public holiday/);
    expect(nonCourtReason("2026-11-10")).toBeNull();
  });

  it("flags dates in years with no holiday file", () => {
    expect(computeDeadline("2027-12-20", 21, "days").holidaysMissing).toBe(true);
    expect(computeDeadline("2026-11-05", 21, "days").holidaysMissing).toBe(false);
  });
});

describe("Timelines", () => {
  it("Statement of Claim served in Singapore: notice 14 days, Defence 21 days, default judgment the day after", () => {
    const t = buildTimeline({ stageId: "soc_served", date: "2026-11-05" });
    expect(item(t, "noic").date).toBe("2026-11-19");
    expect(item(t, "dj_noic").date).toBe("2026-11-20");
    expect(item(t, "defence").date).toBe("2026-11-26");
    expect(item(t, "dj_defence").date).toBe("2026-11-27");
    expect(item(t, "noic").rule.source.provision).toBe("O 6 r 6(1)");
  });

  it("uses the out-of-Singapore periods when selected", () => {
    const t = buildTimeline({ stageId: "soc_served", date: "2026-11-05", outOfSingapore: true });
    expect(item(t, "noic").date).toBe("2026-11-26"); // 21 days
    expect(item(t, "defence").date).toBe("2026-12-10"); // 5 weeks
  });

  it("Originating Claim issued: service, validity and case conference", () => {
    const t = buildTimeline({ stageId: "oc_issued", date: "2026-11-05" });
    expect(item(t, "serve_oc").date).toBe("2026-11-19");
    expect(item(t, "oc_validity").date).toBe("2027-02-04"); // 3 months beginning with 5 Nov
    expect(item(t, "case_conference").date).toBe("2026-12-31"); // 8 weeks, not rolled
  });

  it("does not roll an expected case-conference date", () => {
    // 8 weeks after Sat 3 Oct 2026 = Sat 28 Nov 2026, left as is
    const t = buildTimeline({ stageId: "oc_issued", date: "2026-10-03" });
    expect(item(t, "case_conference").date).toBe("2026-11-28");
  });

  it("Defence served: Defence to Counterclaim in 14 days, further pleadings info has no date", () => {
    const t = buildTimeline({ stageId: "defence_served", date: "2026-11-05" });
    expect(item(t, "defence_to_cc").date).toBe("2026-11-19");
    expect(item(t, "further_pleadings").date).toBeNull();
  });

  it("Judgment: 14 days to appeal from the State Courts, 28 days from the General Division", () => {
    expect(item(buildTimeline({ stageId: "judgment", date: "2026-11-05", court: "state" }), "appeal_state").date).toBe("2026-11-19");
    expect(item(buildTimeline({ stageId: "judgment", date: "2026-11-05", court: "gd" }), "appeal_gd").date).toBe("2026-12-03");
  });

  it("does not apply the 5 p.m. rule to an issue or judgment date", () => {
    const t = buildTimeline({ stageId: "judgment", date: "2026-11-06", servedAfter5pm: true, court: "state" });
    expect(t.trigger).toBe("2026-11-06");
  });
});

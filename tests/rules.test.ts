/**
 * Guards on the rule files themselves. These run in CI on every pull
 * request, so a rule edit without a source or date cannot be merged.
 */
import { describe, expect, it } from "vitest";
import { allRules, forumsFile, limitationFile, rule } from "@/lib/rules";

describe("rule files", () => {
  const rules = allRules();

  it("parse against the schema and are not empty", () => {
    expect(rules.length).toBeGreaterThan(20);
  });

  it("have unique ids", () => {
    const ids = rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(rules.map((r) => [r.id, r] as const))("%s has a source, date and explanation", (_id, r) => {
    expect(r.source.instrument.length).toBeGreaterThan(0);
    expect(r.source.provision.length).toBeGreaterThan(0);
    expect(r.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.explanation.length).toBeGreaterThan(10);
  });

  it("only uses claim-nature ids that exist", () => {
    const natures = new Set(forumsFile.claimNatures.map((n) => n.id));
    for (const r of rules) {
      if (r.file === "forums.json" && r.unit === "list" && Array.isArray(r.value)) {
        for (const v of r.value) expect(natures, `${r.id} -> ${v}`).toContain(v);
      }
    }
  });

  it("maps every claim nature in limitation.json to an existing rule or null", () => {
    for (const n of forumsFile.claimNatures) {
      expect(limitationFile.natureMap, n.id).toHaveProperty(n.id);
      const id = limitationFile.natureMap[n.id];
      if (id) expect(() => rule(id)).not.toThrow();
    }
  });
});

import type { Metadata } from "next";
import { allRules, forumsFile, feesFile, limitationFile, natureLabel } from "@/lib/rules";
import { StatusBadge } from "@/components/RuleBits";
import { formatDate } from "@/lib/dates/calendar";
import { SHOW_RULE_STATUS } from "@/lib/config";

export const metadata: Metadata = { title: "Sources & last verified" };

function valueText(v: unknown, unit: string): string {
  if (v === null) return "—";
  if (Array.isArray(v)) return v.map(natureLabel).join(", ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number" && unit === "SGD") return `S$${v.toLocaleString("en-SG")}`;
  if (typeof v === "number") return `${v} ${unit}`;
  return String(v);
}

export default function SourcesPage() {
  const rules = allRules();
  const groups = Array.from(new Set(rules.map((r) => r.group)));
  const counts = {
    UNVERIFIED: rules.filter((r) => r.status === "UNVERIFIED").length,
    SOURCE_CHECKED: rules.filter((r) => r.status === "SOURCE_CHECKED").length,
    VERIFIED: rules.filter((r) => r.status === "VERIFIED").length,
  };

  return (
    <div className="space-y-6">
      <header className="card p-6">
        <h1 className="font-display text-3xl font-semibold text-navy">Sources &amp; last verified</h1>
        <p className="mt-2 text-ink-soft">
          Every rule the app uses, read straight from the files in <code>/rules</code>. To change a rule,
          edit its JSON file and open a pull request, so the GitHub history records who changed what and why.
        </p>
        {SHOW_RULE_STATUS && <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="flex items-center gap-2"><StatusBadge status="UNVERIFIED" /> {counts.UNVERIFIED}</span>
          <span className="flex items-center gap-2"><StatusBadge status="SOURCE_CHECKED" /> {counts.SOURCE_CHECKED}</span>
          <span className="flex items-center gap-2"><StatusBadge status="VERIFIED" /> {counts.VERIFIED}</span>
        </div>}
        <p className="mt-3 text-xs text-ink-soft">
          Rule file versions: forums.json {forumsFile.rulesVersion} · limitation.json {limitationFile.rulesVersion} ·
          fees.json {feesFile.rulesVersion}
        </p>
      </header>

      {groups.map((g) => (
        <section key={g} className="card overflow-hidden">
          <h2 className="bg-navy-soft/60 px-5 py-3 font-display text-xl font-semibold text-navy">{g}</h2>
          <ul className="divide-y divide-line">
            {rules
              .filter((r) => r.group === g)
              .map((r) => (
                <li key={r.id} id={r.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-semibold text-ink">{r.title}</h3>
                    <StatusBadge status={r.status} verifiedBy={r.verifiedBy} />
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{r.explanation}</p>
                  <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs text-ink-soft sm:grid-cols-[auto_1fr]">
                    <dt className="font-semibold">Value</dt>
                    <dd>{valueText(r.value, r.unit)}</dd>
                    <dt className="font-semibold">Source</dt>
                    <dd>
                      {r.source.url ? (
                        <a className="underline decoration-navy-line" href={r.source.url} target="_blank" rel="noopener noreferrer">
                          {r.source.instrument}, {r.source.provision}
                        </a>
                      ) : (
                        `${r.source.instrument}, ${r.source.provision}`
                      )}
                    </dd>
                    <dt className="font-semibold">Last verified</dt>
                    <dd>
                      {formatDate(r.lastVerified)}
                      {SHOW_RULE_STATUS && r.checkedBy ? ` · checked by ${r.checkedBy}` : ""}
                      {SHOW_RULE_STATUS && r.verifiedBy ? ` · signed off by ${r.verifiedBy}` : ""}
                    </dd>
                    <dt className="font-semibold">File / id</dt>
                    <dd><code>{r.file}</code> · <code>{r.id}</code></dd>
                  </dl>
                  {r.caveats && r.caveats.length > 0 && (
                    <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-amber-ink">
                      {r.caveats.map((c) => <li key={c}>{c}</li>)}
                    </ul>
                  )}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

import type { Rule, RuleStatus } from "@/lib/rules/schema";
import { formatDate } from "@/lib/dates/calendar";

const STATUS: Record<RuleStatus, { label: string; cls: string; icon: string; title: string }> = {
  UNVERIFIED: {
    label: "UNVERIFIED",
    icon: "⚠",
    cls: "bg-danger-bg text-danger-ink border-danger-ink/30",
    title: "Not confirmed against a primary source. Check it yourself before relying on it.",
  },
  SOURCE_CHECKED: {
    label: "Pending review",
    icon: "◔",
    cls: "bg-amber-bg text-amber-ink border-amber-ink/20",
    title: "Matched against the cited source, but not yet signed off by a human reviewer.",
  },
  VERIFIED: {
    label: "Verified",
    icon: "✓",
    cls: "bg-ok-bg text-ok-ink border-ok-ink/20",
    title: "Reviewed and signed off.",
  },
};

export function StatusBadge({ status, verifiedBy }: { status: RuleStatus; verifiedBy?: string | null }) {
  const s = STATUS[status];
  return (
    <span
      title={s.title}
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[0.68rem] font-semibold tracking-wide whitespace-nowrap ${s.cls}`}
    >
      <span aria-hidden="true">{s.icon}</span>
      {s.label}
      {status === "VERIFIED" && verifiedBy ? ` · ${verifiedBy}` : ""}
    </span>
  );
}

/** Compact citation line for a rule: provision, link, status, date. */
export function SourceCite({ rule, compact = false }: { rule: Rule; compact?: boolean }) {
  const { source } = rule;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
      <span>
        {source.url ? (
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline decoration-navy-line underline-offset-2 hover:text-navy">
            {source.instrument}, {source.provision}
          </a>
        ) : (
          <>
            {source.instrument}, {source.provision}
          </>
        )}
      </span>
      <StatusBadge status={rule.status} verifiedBy={rule.verifiedBy} />
      {!compact && <span>Last verified {formatDate(rule.lastVerified)}</span>}
    </span>
  );
}

/** Expandable plain-English panel for law students. */
export function LearnMore({ title = "Learn more", children }: { title?: string; children: React.ReactNode }) {
  return (
    <details className="group mt-2 rounded-md bg-navy-soft/50 px-4 py-3 text-sm">
      <summary className="flex items-center gap-2 font-semibold text-navy">
        <span className="transition-transform group-open:rotate-90" aria-hidden="true">▸</span>
        {title}
      </summary>
      <div className="mt-2 space-y-2 leading-relaxed text-ink">{children}</div>
    </details>
  );
}

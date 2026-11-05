"use client";

import { useMemo, useState } from "react";
import {
  claimNatures,
  findForum,
  sgd,
  type Consent,
  type EmploymentStatus,
  type ForumInput,
  type ForumOption,
  type ForumResult,
  type Mediation,
  type PartyType,
  type StepOutcome,
} from "@/lib/forum/engine";
import { forum, maybeRule, rule } from "@/lib/rules";
import { formatDate, todaySG } from "@/lib/dates/calendar";
import { LearnMore, SourceCite, StatusBadge } from "@/components/RuleBits";
import { Mascot } from "@/components/Mascot";

function Chips<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: string }[];
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o.v} type="button" className="chip" aria-pressed={value === o.v} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const PARTY: { v: PartyType; label: string }[] = [
  { v: "individual", label: "Individual" },
  { v: "company", label: "Company / business" },
];

export function ForumFinder() {
  const [amountText, setAmountText] = useState("");
  const [nature, setNature] = useState("debt_goods_services");
  const [claimant, setClaimant] = useState<PartyType>("individual");
  const [respondent, setRespondent] = useState<PartyType>("company");
  const [consent, setConsent] = useState<Consent>("unsure");
  const [mediation, setMediation] = useState<Mediation>("none");
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>("left");
  const [moneyClaim, setMoneyClaim] = useState(true);
  const [accrualDate, setAccrualDate] = useState("");

  const amount = Number(amountText.replace(/[,\s]/g, ""));
  const valid = amountText.trim() !== "" && Number.isFinite(amount) && amount >= 0;
  const isEmployment = nature === "employment_salary";

  const result = useMemo<ForumResult | null>(() => {
    if (!valid) return null;
    const input: ForumInput = {
      amount,
      nature,
      claimant,
      respondent,
      consent,
      mediation,
      moneyClaim,
      employmentStatus: isEmployment ? employmentStatus : undefined,
      accrualDate: accrualDate || undefined,
      today: todaySG(),
    };
    return findForum(input);
  }, [valid, amount, nature, claimant, respondent, consent, mediation, moneyClaim, employmentStatus, isEmployment, accrualDate]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* ---------- Inputs ---------- */}
      <form className="card h-fit space-y-5 p-5 lg:sticky lg:top-20" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="amount" className="mb-1 block font-semibold">Claim amount (S$)</label>
          <input
            id="amount"
            inputMode="decimal"
            className="field text-lg"
            placeholder="e.g. 45000"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
          />
          <label className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={moneyClaim} onChange={(e) => setMoneyClaim(e.target.checked)} />
            This is a claim for a sum of money
          </label>
          {!moneyClaim && (
            <p className="mt-1 text-xs text-ink-soft">Enter the value of the property or subject matter instead.</p>
          )}
        </div>

        <div>
          <label htmlFor="nature" className="mb-1 block font-semibold">Nature of claim</label>
          <select id="nature" className="field" value={nature} onChange={(e) => setNature(e.target.value)}>
            {claimNatures.map((n) => (
              <option key={n.id} value={n.id}>{n.label}</option>
            ))}
          </select>
          {claimNatures.find((n) => n.id === nature)?.hint && (
            <p className="mt-1 text-xs text-ink-soft">{claimNatures.find((n) => n.id === nature)?.hint}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div>
            <p className="mb-1 font-semibold">Claimant</p>
            <Chips label="Claimant type" value={claimant} onChange={setClaimant} options={PARTY} />
          </div>
          <div>
            <p className="mb-1 font-semibold">Other side</p>
            <Chips label="Respondent type" value={respondent} onChange={setRespondent} options={PARTY} />
          </div>
        </div>

        <div>
          <p className="mb-1 font-semibold">Would the other side consent to a higher limit?</p>
          <Chips
            label="Consent"
            value={consent}
            onChange={setConsent}
            options={[
              { v: "yes", label: "Yes" },
              { v: "no", label: "No" },
              { v: "unsure", label: "Not sure" },
            ]}
          />
        </div>

        {isEmployment && (
          <>
            <div>
              <p className="mb-1 font-semibold">Mediation so far</p>
              <Chips
                label="Mediation"
                value={mediation}
                onChange={setMediation}
                options={[
                  { v: "none", label: "None yet" },
                  { v: "tadm", label: "TADM mediation" },
                  { v: "tmf_union", label: "TMF or union-assisted" },
                ]}
              />
            </div>
            <div>
              <p className="mb-1 font-semibold">Employment status</p>
              <Chips
                label="Employment status"
                value={employmentStatus}
                onChange={setEmploymentStatus}
                options={[
                  { v: "employed", label: "Still employed" },
                  { v: "left", label: "Left the job" },
                  { v: "dismissed", label: "Wrongfully dismissed" },
                ]}
              />
            </div>
          </>
        )}

        <div>
          <label htmlFor="accrual" className="mb-1 block font-semibold">
            {isEmployment
              ? employmentStatus === "employed" ? "Date the dispute arose" : "Last day of work"
              : "Date the cause of action accrued"}{" "}
            <span className="font-normal text-ink-soft">(optional)</span>
          </label>
          <input id="accrual" type="date" className="field" value={accrualDate} onChange={(e) => setAccrualDate(e.target.value)} />
          <p className="mt-1 text-xs text-ink-soft">Used for the time bars and the Limitation Act check.</p>
        </div>
      </form>

      {/* ---------- Results ---------- */}
      <div className="space-y-5" aria-live="polite">
        {!result ? (
          <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
            <Mascot size={100} />
            <p className="font-display text-xl text-plum">Enter a claim amount to begin</p>
            <p className="text-sm text-ink-soft">Results update as you type.</p>
          </div>
        ) : (
          <Results result={result} amount={amount} />
        )}
      </div>
    </div>
  );
}

function ForumCard({ option, result, primary }: { option: ForumOption; result: ForumResult; primary?: boolean }) {
  const f = forum(option.forumId);
  const lawyers = maybeRule(`${f.id}.lawyers`);
  const fee = result.fees.find((x) => x.forumId === f.id);
  const bars = result.timeBars.filter((t) => t.forumId === f.id);
  return (
    <article className={`card p-5 ${primary ? "border-mint-deep bg-mint/40" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${primary ? "bg-mint-deep text-ink" : "bg-lavender text-plum"}`}>
          {primary ? "Likely forum" : "Also open"}
        </span>
        <span className="text-xs text-ink-soft">{f.system}</span>
        {option.conditional && (
          <span className="rounded-full bg-amber-bg px-2.5 py-0.5 text-xs font-bold text-amber-ink">Only if…</span>
        )}
      </div>
      <h3 className={`mt-2 font-display font-semibold text-ink ${primary ? "text-3xl" : "text-xl"}`}>
        {f.name} <span className="text-ink-soft">({f.shortName})</span>
      </h3>
      <p className="mt-1 text-ink-soft">{option.basis}</p>

      {option.conditions.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-2xl bg-amber-bg/70 p-3 text-sm text-amber-ink">
          {option.conditions.map((c) => <li key={c}>⚠ {c}</li>)}
        </ul>
      )}

      <div className="mt-3 flex flex-col gap-1">
        {option.ruleIds.map((id) => <SourceCite key={id} rule={rule(id)} compact />)}
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-[9rem_1fr]">
        {lawyers && (
          <>
            <dt className="font-semibold">Lawyers?</dt>
            <dd>
              {lawyers.value ? "Yes, lawyers may act." : "No. " + lawyers.explanation}
              <div className="mt-0.5"><SourceCite rule={lawyers} compact /></div>
            </dd>
          </>
        )}
        <dt className="font-semibold">Filing fee</dt>
        <dd>
          {fee ? (
            <>
              {fee.text}
              <div className="mt-0.5"><SourceCite rule={rule(fee.ruleId)} compact /></div>
            </>
          ) : (
            <span className="text-ink-soft">Not shown: no official fee source in this app yet.</span>
          )}
        </dd>
        {bars.map((b) => {
          const r = rule(b.ruleId);
          return (
            <div key={b.ruleId} className="contents">
              <dt className="font-semibold">Time bar</dt>
              <dd>
                {r.title}: {typeof r.value === "number" ? `${r.value} ${r.unit}` : ""}
                {b.deadline && (
                  <span className={b.expired ? "font-semibold text-danger-ink" : ""}>
                    {" "}→ {b.expired ? "passed on" : "ends"} {formatDate(b.deadline)}
                  </span>
                )}
                <div className="mt-0.5"><SourceCite rule={r} compact /></div>
              </dd>
            </div>
          );
        })}
      </dl>

      <LearnMore title={`Learn more about the ${f.shortName}`}>
        <p>{f.learnMore}</p>
      </LearnMore>
    </article>
  );
}

const OUTCOME: Record<StepOutcome, { icon: string; cls: string }> = {
  yes: { icon: "✓", cls: "bg-ok-bg text-ok-ink" },
  no: { icon: "✕", cls: "bg-danger-bg text-danger-ink" },
  warn: { icon: "!", cls: "bg-amber-bg text-amber-ink" },
  info: { icon: "i", cls: "bg-lavender text-plum" },
};

function Results({ result, amount }: { result: ForumResult; amount: number }) {
  const unverifiedUsed = result.ruleIds.map((id) => rule(id)).filter((r) => r.status === "UNVERIFIED");

  return (
    <>
      {unverifiedUsed.length > 0 && (
        <div className="rounded-2xl border border-danger-ink/30 bg-danger-bg px-4 py-3 text-sm text-danger-ink">
          <strong>⚠ This result relies on {unverifiedUsed.length} UNVERIFIED rule{unverifiedUsed.length > 1 ? "s" : ""}:</strong>{" "}
          {unverifiedUsed.map((r) => r.title).join("; ")}. Check these against the source before relying on them.
        </div>
      )}

      {result.primary ? (
        <ForumCard option={result.primary} result={result} primary />
      ) : (
        <div className="card p-5">No forum matched these facts. Check the reasoning below.</div>
      )}

      {result.alternatives.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-plum">Also open</h2>
          {result.alternatives.map((a) => (
            <ForumCard key={a.forumId + a.basis} option={a} result={result} />
          ))}
        </section>
      )}

      {result.excessOptions.length > 0 && (
        <section className="card border-blush-deep p-5">
          <h2 className="font-display text-xl font-semibold text-berry">Abandon the excess?</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Your claim is a little over a lower forum&apos;s limit. You could give up the excess to stay in that forum.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[22rem] text-sm">
              <thead>
                <tr className="text-left text-ink-soft">
                  <th className="py-1 pr-3 font-semibold">To stay in</th>
                  <th className="py-1 pr-3 font-semibold">You can recover at most</th>
                  <th className="py-1 font-semibold">You give up</th>
                </tr>
              </thead>
              <tbody>
                {result.excessOptions.map((e) => (
                  <tr key={e.forumId} className="border-t border-line">
                    <td className="py-2 pr-3 font-semibold">{forum(e.forumId).shortName}</td>
                    <td className="py-2 pr-3">{sgd(e.limit)}</td>
                    <td className="py-2 font-bold text-berry">
                      {sgd(e.excess)} <span className="font-normal text-ink-soft">({((e.excess / amount) * 100).toFixed(1)}%)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-2xl bg-blush/60 p-3 text-sm font-semibold text-berry">
            ⚠ The abandoned amount is lost permanently. You cannot sue for it later in any court.
          </p>
          <div className="mt-2 flex flex-col gap-1">
            {Array.from(new Set(result.excessOptions.flatMap((e) => e.ruleIds)))
              .filter((id) => id.endsWith("abandonExcess"))
              .map((id) => <SourceCite key={id} rule={rule(id)} />)}
          </div>
        </section>
      )}

      <section
        className={`card p-5 ${
          result.limitation.status === "expired" ? "border-danger-ink/40 bg-danger-bg/50"
          : result.limitation.status === "soon" ? "border-amber-ink/30 bg-amber-bg/50" : ""
        }`}
      >
        <h2 className="font-display text-xl font-semibold text-plum">Limitation check</h2>
        <p className="mt-1 text-sm">{result.limitation.text}</p>
        {result.limitation.ruleId && (
          <>
            <div className="mt-2"><SourceCite rule={rule(result.limitation.ruleId)} /></div>
            {rule(result.limitation.ruleId).caveats?.map((c) => (
              <p key={c} className="mt-1 text-xs text-amber-ink">⚠ {c}</p>
            ))}
            {rule(result.limitation.ruleId).learnMore && (
              <LearnMore title="How limitation works">
                <p>{rule(result.limitation.ruleId).learnMore}</p>
              </LearnMore>
            )}
          </>
        )}
      </section>

      <section className="card p-5">
        <h2 className="font-display text-xl font-semibold text-plum">Step-by-step reasoning</h2>
        <ol className="mt-3 space-y-3">
          {result.steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${OUTCOME[s.outcome].cls}`} aria-label={s.outcome}>
                {OUTCOME[s.outcome].icon}
              </span>
              <div>
                <p className="text-sm">
                  <span className="mr-1 rounded-md bg-lavender/70 px-1.5 py-0.5 text-[0.7rem] font-bold text-plum">
                    {forum(s.forumId).shortName}
                  </span>
                  {s.text}
                </p>
                <div className="mt-1 flex flex-col gap-0.5">
                  {s.ruleIds.map((id) => <SourceCite key={id} rule={rule(id)} compact />)}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="card p-5 text-sm">
        <h2 className="font-display text-xl font-semibold text-plum">Rules this result used</h2>
        <ul className="mt-2 space-y-2">
          {result.ruleIds.map((id) => {
            const r = rule(id);
            return (
              <li key={id} className="flex flex-wrap items-center gap-2">
                <StatusBadge status={r.status} verifiedBy={r.verifiedBy} />
                <a href={`/sources#${id}`} className="font-semibold underline decoration-lavender-deep">{r.title}</a>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 rounded-2xl bg-blush/50 p-3 text-xs text-berry">
          Guidance only. These results come from the rule files as last verified. Always verify against the
          current legislation and rules before acting. Not legal advice.
        </p>
      </section>
    </>
  );
}

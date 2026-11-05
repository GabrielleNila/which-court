"use client";

import { useMemo, useState } from "react";
import { stepsFile, timeFile } from "@/lib/rules";
import {
  buildTimeline,
  fmt,
  isOurs,
  type CourtLevel,
  type Side,
  type Timeline,
  type TimelineItem,
} from "@/lib/dates/compute";
import { isISODate, todaySG } from "@/lib/dates/calendar";
import { rule } from "@/lib/rules";
import { LearnMore, SourceCite } from "@/components/RuleBits";
import { Emblem } from "@/components/Emblem";

const KIND_LABEL: Record<string, string> = {
  deadline: "Deadline",
  available: "Available from",
  expected: "Expected around",
  info: "Rule to note",
};

function Toggle<T extends string>({
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

export function DeadlineNavigator() {
  const [stageId, setStageId] = useState(stepsFile.stages[2].id);
  const [date, setDate] = useState("");
  const [after5, setAfter5] = useState(false);
  const [outOfSg, setOutOfSg] = useState(false);
  const [court, setCourt] = useState<CourtLevel>("state");
  const [side, setSide] = useState<Side>("defendant");

  const stage = stepsFile.stages.find((s) => s.id === stageId)!;
  const hasOutRules = stepsFile.steps.some((s) => s.stage === stageId && s.ruleOutOfSingapore);

  const timeline = useMemo<Timeline | null>(() => {
    if (!isISODate(date)) return null;
    return buildTimeline({
      stageId,
      date,
      servedAfter5pm: stage.timeOfService && after5,
      outOfSingapore: hasOutRules && outOfSg,
      court,
    });
  }, [stageId, date, after5, outOfSg, court, stage.timeOfService, hasOutRules]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <form className="card h-fit space-y-5 p-5 lg:sticky lg:top-20" onSubmit={(e) => e.preventDefault()}>
        <div>
          <p className="mb-1 font-semibold">I am acting for the</p>
          <Toggle
            label="Side"
            value={side}
            onChange={setSide}
            options={[
              { v: "claimant", label: "Claimant" },
              { v: "defendant", label: "Defendant" },
            ]}
          />
        </div>

        <fieldset>
          <legend className="mb-2 font-semibold">Where is the case now?</legend>
          <div className="space-y-2">
            {stepsFile.stages.map((s) => (
              <label
                key={s.id}
                className={`flex cursor-pointer gap-3 rounded-md border p-3 text-sm ${
                  s.id === stageId ? "border-navy bg-navy-soft/60" : "border-line bg-surface hover:border-navy-line"
                }`}
              >
                <input
                  type="radio"
                  name="stage"
                  className="mt-1"
                  checked={s.id === stageId}
                  onChange={() => setStageId(s.id)}
                />
                <span>
                  <span className="block font-semibold text-ink">{s.label}</span>
                  <span className="text-ink-soft">{s.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="trigger" className="mb-1 block font-semibold">{stage.dateLabel}</label>
          <div className="flex gap-2">
            <input id="trigger" type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
            <button type="button" className="chip whitespace-nowrap" onClick={() => setDate(todaySG())}>Today</button>
          </div>
          {stage.timeOfService && (
            <label className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={after5} onChange={(e) => setAfter5(e.target.checked)} />
              Served after 5 p.m.
            </label>
          )}
          {hasOutRules && (
            <label className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={outOfSg} onChange={(e) => setOutOfSg(e.target.checked)} />
              Served (or to be served) out of Singapore
            </label>
          )}
        </div>

        {stageId === "judgment" && (
          <div>
            <p className="mb-1 font-semibold">Which court gave judgment?</p>
            <Toggle
              label="Court"
              value={court}
              onChange={setCourt}
              options={[
                { v: "state", label: "Magistrate's or District Court" },
                { v: "gd", label: "General Division" },
              ]}
            />
          </div>
        )}

        <p className="text-xs text-ink-soft">{stepsFile.scopeNote}</p>
      </form>

      <div className="space-y-5" aria-live="polite">
        {!timeline ? (
          <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
            <Emblem size={56} className="text-navy-line" />
            <p className="font-display text-xl text-navy">Enter a date to see the timeline</p>
          </div>
        ) : (
          <TimelineView timeline={timeline} side={side} />
        )}
      </div>
    </div>
  );
}

function TimelineView({ timeline, side }: { timeline: Timeline; side: Side }) {
  return (
    <>
      {timeline.holidaysMissing && (
        <div className="rounded-md border border-amber-ink/30 bg-amber-bg px-4 py-3 text-sm text-amber-ink">
          Some dates fall in a year with no public holiday file loaded, so a public holiday may have been missed.
          Check those dates against the gazetted holidays.
        </div>
      )}

      <section className="card p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">{timeline.stage.label}</p>
        <p className="mt-1 font-display text-2xl font-semibold text-ink">{fmt(timeline.trigger)}</p>
        {timeline.triggerWorking.map((w) => (
          <p key={w} className="mt-1 text-sm text-ink-soft">{w}</p>
        ))}
        {timeline.triggerWorking.length > 0 && (
          <div className="mt-1"><SourceCite rule={rule("time.serviceAfter5pm")} compact /></div>
        )}
      </section>

      <ol className="relative space-y-4 border-l-2 border-navy-line/60 pl-5">
        {timeline.items.map((it) => (
          <TimelineRow key={it.step.id} item={it} side={side} />
        ))}
      </ol>

      <section className="card p-5 text-sm">
        <h2 className="font-display text-xl font-semibold text-navy">How time is counted</h2>
        <ul className="mt-3 space-y-3">
          {timeFile.rules.map((r) => (
            <li key={r.id}>
              <p className="font-semibold">{r.title}</p>
              <p className="text-ink-soft">{r.explanation}</p>
              <SourceCite rule={r} compact />
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-md bg-navy-soft/60 p-3 text-xs text-ink">
          Guidance only. Deadlines can be changed by court order, consent or practice directions. Always verify
          against the current Rules of Court 2021 and any directions in your case. Not legal advice.
        </p>
      </section>
    </>
  );
}

function TimelineRow({ item, side }: { item: TimelineItem; side: Side }) {
  const { step, rule: r } = item;
  const ours = isOurs(step, side);
  const who = step.actor === "court" ? "Court" : step.actor === "both" ? "Either party" : ours ? "Your step" : "Other side";
  const whoCls =
    step.actor === "court" ? "bg-gold-soft text-gold" : ours ? "bg-navy text-white" : "bg-line/70 text-ink-soft";
  const emphasis = step.kind === "deadline" && ours;

  return (
    <li className="relative">
      <span
        className={`absolute -left-[1.72rem] top-5 h-3 w-3 rounded-full border-2 ${
          emphasis ? "border-navy bg-navy" : "border-navy-line bg-surface"
        }`}
        aria-hidden="true"
      />
      <article className={`card p-4 ${emphasis ? "border-l-4 border-l-navy" : ""} ${!ours && step.actor !== "court" && step.actor !== "both" ? "opacity-90" : ""}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wider ${whoCls}`}>{who}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{KIND_LABEL[step.kind]}</span>
        </div>
        {item.date && <p className="mt-2 font-display text-xl font-semibold text-ink">{fmt(item.date)}</p>}
        <h3 className="mt-1 font-semibold text-ink">{step.title}</h3>
        <p className="mt-1 text-sm text-ink-soft">{r.explanation}</p>
        <div className="mt-2"><SourceCite rule={r} compact /></div>

        {item.working.length > 0 && (
          <div className="mt-3 rounded-md bg-paper p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Working</p>
            <ul className="mt-1 space-y-1">
              {item.working.map((w) => <li key={w}>{w}</li>)}
            </ul>
            <div className="mt-1 flex flex-col gap-0.5">
              {item.ruleIds.filter((id) => id !== r.id).map((id) => <SourceCite key={id} rule={rule(id)} compact />)}
            </div>
          </div>
        )}

        {r.caveats?.map((c) => (
          <p key={c} className="mt-2 text-xs text-amber-ink">Note: {c}</p>
        ))}

        {r.learnMore && (
          <LearnMore>
            <p>{r.learnMore}</p>
          </LearnMore>
        )}
      </article>
    </li>
  );
}

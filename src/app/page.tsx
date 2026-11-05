import Link from "next/link";
import { Mascot } from "@/components/Mascot";
import { allRules } from "@/lib/rules";

export default function Home() {
  const rules = allRules();
  const unverified = rules.filter((r) => r.status === "UNVERIFIED").length;

  return (
    <div className="space-y-8">
      <section className="card flex flex-col items-center gap-6 px-6 py-10 text-center sm:flex-row sm:text-left">
        <Mascot size={132} className="shrink-0 drop-shadow-sm" />
        <div>
          <h1 className="font-display text-4xl font-semibold text-plum sm:text-5xl">Which Court?</h1>
          <p className="mt-3 max-w-xl text-lg text-ink-soft">
            A friendly guide for Singapore law students and junior lawyers. Find the likely civil forum
            for a claim, and see the reasoning, with the legal source for every step.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link href="/forum-finder" className="card group block p-6 transition hover:-translate-y-0.5">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-mint text-2xl">🧭</div>
          <h2 className="font-display text-2xl font-semibold text-ink">Forum Finder</h2>
          <p className="mt-1 text-ink-soft">
            Enter the amount and type of claim. Get the likely forum, the alternatives, an abandon-the-excess
            calculator and a limitation check.
          </p>
          <span className="mt-3 inline-block font-semibold text-plum group-hover:underline">Find a forum →</span>
        </Link>
        <Link href="/deadlines" className="card group block p-6 transition hover:-translate-y-0.5">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-butter text-2xl">🗓️</div>
          <h2 className="font-display text-2xl font-semibold text-ink">Deadline Navigator</h2>
          <p className="mt-1 text-ink-soft">
            Map the next ROC 2021 steps from a key date, with the working shown for every deadline.
          </p>
          <span className="mt-3 inline-block font-semibold text-plum">Coming in Phase 2 ✨</span>
        </Link>
      </section>

      <section className="card p-6 text-sm text-ink-soft">
        <p>
          Every rule in this app lives in a versioned data file with its source and a last-verified date.{" "}
          <Link href="/sources" className="font-semibold text-plum underline">
            See all {rules.length} rules
          </Link>
          {unverified > 0 && <> ({unverified} still marked UNVERIFIED)</>}.
        </p>
      </section>
    </div>
  );
}

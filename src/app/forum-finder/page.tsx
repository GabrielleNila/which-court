import type { Metadata } from "next";
import { ForumFinder } from "./ForumFinder";

export const metadata: Metadata = { title: "Forum Finder" };

export default function ForumFinderPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-plum sm:text-4xl">Forum Finder 🧭</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">
          Tell us about the claim. We&apos;ll suggest the likely forum, the other options, and show the rule behind
          every step.
        </p>
      </header>
      <ForumFinder />
    </div>
  );
}

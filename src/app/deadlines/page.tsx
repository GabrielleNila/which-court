import type { Metadata } from "next";
import { Emblem } from "@/components/Emblem";

export const metadata: Metadata = { title: "Deadline Navigator" };

export default function DeadlinesPage() {
  return (
    <div className="card flex flex-col items-center gap-4 px-6 py-12 text-center">
      <Emblem size={56} className="text-navy-line" />
      <h1 className="font-display text-3xl font-semibold text-navy">Deadline Navigator</h1>
      <p className="max-w-md text-ink-soft">
        Coming in Phase 2: pick the stage your case is at, enter the date, and see the next ROC 2021 steps
        with each deadline worked out and its rule cited.
      </p>
    </div>
  );
}

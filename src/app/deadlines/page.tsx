import type { Metadata } from "next";
import { DeadlineNavigator } from "./DeadlineNavigator";

export const metadata: Metadata = { title: "Deadline Navigator" };

export default function DeadlinesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-navy sm:text-4xl">Deadline Navigator</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">
          Choose the stage the case has reached and enter the date. The next steps under the Rules of Court 2021
          are shown in order, each with its deadline, the rule it comes from and the working behind the date.
        </p>
      </header>
      <DeadlineNavigator />
    </div>
  );
}

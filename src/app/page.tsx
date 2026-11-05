import { Mascot } from "@/components/Mascot";

export default function Home() {
  return (
    <section className="card flex flex-col items-center gap-4 px-6 py-12 text-center">
      <Mascot size={120} />
      <h1 className="font-display text-4xl font-semibold text-plum">Which Court?</h1>
      <p className="text-ink-soft">Under construction. The Forum Finder arrives in Phase 1.</p>
    </section>
  );
}

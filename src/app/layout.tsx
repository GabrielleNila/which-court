import type { Metadata, Viewport } from "next";
import "@fontsource-variable/nunito";
import "@fontsource-variable/fredoka";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Which Court?", template: "%s · Which Court?" },
  description:
    "A learning tool for Singapore law students and junior lawyers: find the likely civil forum and map ROC 2021 deadlines, with sources for every rule.",
};

export const viewport: Viewport = { themeColor: "#ffd6e0" };

const NAV = [
  { href: "/forum-finder", label: "Forum Finder" },
  { href: "/deadlines", label: "Deadlines" },
  { href: "/sources", label: "Sources" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-SG" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="no-print sticky top-0 z-20 border-b border-line bg-cream/85 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
            <Link href="/" className="mr-auto font-display text-xl font-semibold text-plum">
              Which Court? <span aria-hidden="true">⚖️</span>
            </Link>
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-full px-3 py-1.5 text-sm font-semibold text-ink-soft hover:bg-lavender hover:text-plum"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6">{children}</main>

        <footer
          role="contentinfo"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-blush-deep/40 bg-blush/95 px-4 py-2.5 text-center text-sm font-semibold text-berry backdrop-blur print:static"
        >
          <span aria-hidden="true">💗 </span>
          Guidance only. Verify against current legislation. Not legal advice.
        </footer>
      </body>
    </html>
  );
}

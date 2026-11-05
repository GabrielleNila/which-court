import type { Metadata, Viewport } from "next";
import "@fontsource-variable/source-serif-4";
import "@fontsource-variable/inter";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Which Court?", template: "%s · Which Court?" },
  description:
    "A learning tool for Singapore law students and junior lawyers: find the likely civil forum and map ROC 2021 deadlines, with sources for every rule.",
};

export const viewport: Viewport = { themeColor: "#1f3a5f" };

const NAV = [
  { href: "/forum-finder", label: "Forums" },
  { href: "/deadlines", label: "Deadlines" },
  { href: "/sources", label: "Sources" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-SG" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="no-print sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl items-center gap-1 px-4 py-3 sm:gap-2">
            <Link href="/" className="mr-auto whitespace-nowrap font-display text-lg font-semibold tracking-tight text-navy sm:text-xl">
              Which Court?
            </Link>
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium text-ink-soft hover:bg-navy-soft hover:text-navy sm:px-3 sm:text-sm"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6">{children}</main>

        <footer
          role="contentinfo"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-navy bg-navy px-4 py-2.5 text-center text-sm font-medium tracking-wide text-white print:static"
        >
          Guidance only. Verify against current legislation. Not legal advice.
        </footer>
      </body>
    </html>
  );
}

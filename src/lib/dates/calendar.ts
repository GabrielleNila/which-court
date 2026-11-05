/**
 * Plain calendar-date helpers. Dates are handled as "YYYY-MM-DD" strings and
 * computed in UTC so that a user's time zone can never shift a date by a day.
 */

export type ISODate = string;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isISODate(s: string): boolean {
  const m = ISO_RE.exec(s);
  if (!m) return false;
  const d = toUTC(s);
  return toISO(d) === s;
}

export function toUTC(s: ISODate): Date {
  const m = ISO_RE.exec(s);
  if (!m) throw new Error(`Not a YYYY-MM-DD date: ${s}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

export function toISO(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

/**
 * Same calendar date N months later. If that date does not exist
 * (e.g. 31 Jan + 1 month), the last day of the target month is used.
 */
export function addMonths(s: ISODate, months: number): ISODate {
  const d = toUTC(s);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + months;
  const ty = y + Math.floor(m / 12);
  const tm = ((m % 12) + 12) % 12;
  const day = Math.min(d.getUTCDate(), daysInMonth(ty, tm));
  return toISO(new Date(Date.UTC(ty, tm, day)));
}

export function addYears(s: ISODate, years: number): ISODate {
  return addMonths(s, years * 12);
}

export function addDays(s: ISODate, days: number): ISODate {
  const d = toUTC(s);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

/** Add a period expressed in one of the rule units. */
export function addPeriod(
  s: ISODate,
  amount: number,
  unit: "days" | "weeks" | "months" | "years",
): ISODate {
  switch (unit) {
    case "days":
      return addDays(s, amount);
    case "weeks":
      return addDays(s, amount * 7);
    case "months":
      return addMonths(s, amount);
    case "years":
      return addYears(s, amount);
  }
}

/** Whole days from a to b (positive if b is later). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b).getTime() - toUTC(a).getTime()) / 86_400_000);
}

export function formatDate(s: ISODate): string {
  return toUTC(s).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Today's date in Singapore, as YYYY-MM-DD. */
export function todaySG(): ISODate {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

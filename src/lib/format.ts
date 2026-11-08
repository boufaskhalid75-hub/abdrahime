import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

export const TIME_ZONE = "Africa/Casablanca";

/** Parse a `YYYY-MM-DD` date (no timezone shift) or an ISO timestamp. */
export function toDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T12:00:00Z`);
  return new Date(value);
}

export function makeFormatters(locale: Locale, t: Dictionary) {
  // Latin digits in both languages (Moroccan convention).
  const intl = locale === "ar" ? "ar-MA-u-nu-latn" : "fr-MA";
  const money = new Intl.NumberFormat(intl, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const kg = new Intl.NumberFormat(intl, { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  const int = new Intl.NumberFormat(intl, { maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat(intl, { style: "percent", maximumFractionDigits: 1 });
  const date = new Intl.DateTimeFormat(intl, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
  const dateTz = new Intl.DateTimeFormat(intl, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TIME_ZONE });
  const dateLong = new Intl.DateTimeFormat(intl, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const dateTime = new Intl.DateTimeFormat(intl, {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE,
  });
  const time = new Intl.DateTimeFormat(intl, { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });
  const short = new Intl.DateTimeFormat(intl, { day: "2-digit", month: "short", timeZone: "UTC" });
  const month = new Intl.DateTimeFormat(intl, { month: "short", year: "2-digit", timeZone: "UTC" });

  const num = (v: unknown) => (v === null || v === undefined || v === "" ? 0 : Number(v));
  const isTs = (v: string) => !/^\d{4}-\d{2}-\d{2}$/.test(v);

  return {
    money: (v: unknown) => `${money.format(num(v))} ${t.common.currency}`,
    amount: (v: unknown) => money.format(num(v)),
    kg: (v: unknown) => `${kg.format(num(v))} ${t.common.kg}`,
    qty: (v: unknown) => kg.format(num(v)),
    int: (v: unknown) => int.format(num(v)),
    pct: (v: unknown) => pct.format(num(v)),
    date: (v: string | Date | null | undefined) =>
      v ? (typeof v === "string" && !isTs(v) ? date.format(toDate(v)) : dateTz.format(toDate(v))) : "—",
    dateLong: (v: string | Date | null | undefined) => (v ? dateLong.format(toDate(v)) : "—"),
    dateTime: (v: string | Date | null | undefined) => (v ? dateTime.format(toDate(v)) : "—"),
    time: (v: string | Date | null | undefined) => (v ? time.format(toDate(v)) : "—"),
    short: (v: string) => short.format(toDate(v)),
    month: (v: string) => month.format(toDate(v)),
  };
}
export type Formatters = ReturnType<typeof makeFormatters>;

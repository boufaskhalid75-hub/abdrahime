import { TIME_ZONE } from "@/lib/format";

/** Today's date in Morocco as YYYY-MM-DD. */
export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function startOfMonth(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}

export function addMonths(iso: string, months: number) {
  const d = new Date(`${iso.slice(0, 7)}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

export const PRESETS = ["today", "yesterday", "last7", "last30", "thisMonth", "custom"] as const;
export type Preset = (typeof PRESETS)[number];

export function isIsoDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
}

/** Resolve the period from URL search params (?period=last7 or ?from=&to=). */
export function resolvePeriod(sp: { period?: string; from?: string; to?: string }, fallback: Preset = "thisMonth") {
  const t = today();
  const preset = (PRESETS as readonly string[]).includes(sp.period ?? "") ? (sp.period as Preset) : fallback;
  switch (preset) {
    case "today":
      return { preset, from: t, to: t };
    case "yesterday":
      return { preset, from: addDays(t, -1), to: addDays(t, -1) };
    case "last7":
      return { preset, from: addDays(t, -6), to: t };
    case "last30":
      return { preset, from: addDays(t, -29), to: t };
    case "custom": {
      const from = isIsoDate(sp.from) ? sp.from : startOfMonth(t);
      const to = isIsoDate(sp.to) ? sp.to : t;
      return from <= to ? { preset, from, to } : { preset, from: to, to: from };
    }
    default:
      return { preset: "thisMonth" as Preset, from: startOfMonth(t), to: t };
  }
}

export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

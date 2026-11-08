import type { Dictionary } from "@/lib/i18n/dictionaries";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

type PgLikeError = { message?: string; details?: string | null; code?: string; hint?: string | null };

/** Translate a database / PostgREST error to a user-facing message. Never leaks internals. */
export function translateError(err: PgLikeError | null | undefined, t: Dictionary): string {
  if (!err) return t.errors.generic;
  const msg = err.message ?? "";
  const m = msg.match(/VM:([a-z_]+)/);
  if (m) {
    const key = m[1] as keyof Dictionary["errors"];
    let text = (t.errors[key] as string | undefined) ?? t.errors.generic;
    if (err.details) {
      try {
        const d = JSON.parse(err.details) as Record<string, unknown>;
        text = text.replace(/\{(\w+)\}/g, (_, k: string) => (d[k] !== undefined ? String(d[k]) : ""));
      } catch {
        /* details is plain text */
      }
    }
    return text.replace(/\{\w+\}/g, "").trim();
  }
  if (err.code === "23505") return t.errors.duplicate;
  if (err.code === "42501" || /permission denied|row-level security/i.test(msg)) return t.errors.permission;
  if (err.code === "28000" || /JWT|not authenticated/i.test(msg)) return t.errors.not_authenticated;
  return t.errors.generic;
}

import type { Dictionary } from "@/lib/i18n/dictionaries";

/** System categories are translated by code; custom categories keep the owner's name. */
export function categoryLabel(c: { code: string | null; name: string }, t: Dictionary) {
  return c.code ? (t.expenses.categories[c.code as keyof Dictionary["expenses"]["categories"]] ?? c.name) : c.name;
}

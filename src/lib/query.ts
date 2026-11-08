/** Sanitize a free-text search term for PostgREST `or=(...ilike...)` filters. */
export function term(q: string | undefined) {
  if (!q) return null;
  const s = q.replace(/[%,()*\\:"']/g, " ").trim().slice(0, 60);
  return s ? `%${s}%` : null;
}

export const PAGE_SIZE = 50;
export function pageRange(page: string | undefined) {
  const p = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  return { page: p, from: (p - 1) * PAGE_SIZE, to: p * PAGE_SIZE - 1 };
}

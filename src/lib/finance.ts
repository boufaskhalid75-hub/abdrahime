/**
 * Pure financial helpers used by the UI for live previews.
 * The database engine (supabase/migrations/*_engine.sql) is the source of truth and
 * applies the SAME rules; unit tests (tests/unit/finance.test.ts) pin both behaviours.
 *
 * Rounding: money is rounded to 2 decimals, half away from zero (PostgreSQL `round`).
 * Quantities are rounded to 3 decimals (grams). Calculations use integer arithmetic
 * on scaled values to avoid binary floating point drift.
 */

const pow = (d: number) => 10 ** d;

/** Round half away from zero, like PostgreSQL round(numeric, d). */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return NaN;
  const f = pow(decimals);
  // toPrecision guards against values like 1.005 being stored as 1.00499999
  const scaled = Number((Math.abs(value) * f).toPrecision(15));
  return (Math.sign(value) * Math.round(scaled)) / f;
}
export const roundMoney = (v: number) => roundTo(v, 2);
export const roundKg = (v: number) => roundTo(v, 3);

/** quantity (kg, 3 dp) × unit price (2 dp) → line total (2 dp), computed in integers. */
export function lineTotal(quantityKg: number, unitPrice: number): number {
  const g = Math.round(roundKg(quantityKg) * 1000); // grams
  const c = Math.round(roundMoney(unitPrice) * 100); // centimes
  // g * c is in 1e-5 DH; round to centimes (1e-3 of that), half away from zero
  const raw = g * c; // exact integer while < 2^53 (≈ 9e15) — far above realistic amounts
  const centimes = Math.sign(raw) * Math.round(Math.abs(raw) / 1000);
  return centimes / 100;
}

export function sumMoney(values: number[]): number {
  return values.reduce((acc, v) => acc + Math.round(roundMoney(v) * 100), 0) / 100;
}

export type Line = { quantityKg: number; unitPrice: number };

export function documentTotals(lines: Line[], discount = 0) {
  const totals = lines.map((l) => lineTotal(l.quantityKg, l.unitPrice));
  const subtotal = sumMoney(totals);
  const d = roundMoney(discount || 0);
  return {
    lines: totals,
    subtotal,
    discount: d,
    total: sumMoney([subtotal, -d]),
    totalKg: roundKg(lines.reduce((a, l) => a + roundKg(l.quantityKg), 0)),
  };
}

export type LineIssue = "invalid_quantity" | "invalid_price" | "insufficient_stock";

export function validateLine(line: Line, availableKg?: number): LineIssue | null {
  if (!Number.isFinite(line.quantityKg) || roundKg(line.quantityKg) <= 0) return "invalid_quantity";
  if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) return "invalid_price";
  if (availableKg !== undefined && roundKg(line.quantityKg) > availableKg) return "insufficient_stock";
  return null;
}

export function validateDiscount(discount: number, subtotal: number) {
  return Number.isFinite(discount) && discount >= 0 && roundMoney(discount) <= subtotal;
}

/** Total stock requested per product across lines (a product can appear on several lines). */
export function requestedByProduct(lines: { productId: string; quantityKg: number }[]) {
  const m = new Map<string, number>();
  for (const l of lines) m.set(l.productId, roundKg((m.get(l.productId) ?? 0) + roundKg(l.quantityKg)));
  return m;
}

// ---------------------------------------------------------------- payments
export type PayableInvoice = { id: string; customerId: string; total: number; status: "unpaid" | "paid" | "cancelled" };

/** Mirrors record_payment(): full invoices only, same customer, exact amount. */
export function checkPayment(customerId: string, invoices: PayableInvoice[], amount: number) {
  if (invoices.length === 0) return { ok: false as const, error: "no_invoices" };
  if (new Set(invoices.map((i) => i.id)).size !== invoices.length) return { ok: false as const, error: "duplicate_invoice_in_payment" };
  if (invoices.some((i) => i.customerId !== customerId)) return { ok: false as const, error: "invoice_other_customer" };
  if (invoices.some((i) => i.status !== "unpaid")) return { ok: false as const, error: "invoice_not_payable" };
  const expected = sumMoney(invoices.map((i) => i.total));
  if (roundMoney(amount) !== expected) return { ok: false as const, error: "amount_mismatch", expected };
  return { ok: true as const, total: expected };
}

// ---------------------------------------------------------------- valuation
/** Weighted average cost after an inflow (CUMP). */
export function cumpAfterInflow(stockKg: number, avgCost: number, inKg: number, inUnitCost: number) {
  const newStock = roundKg(stockKg + inKg);
  if (newStock <= 0) return { stockKg: newStock, avgCost };
  return { stockKg: newStock, avgCost: roundTo((stockKg * avgCost + inKg * inUnitCost) / newStock, 4) };
}

export type Lot = { remainingKg: number; unitCost: number };
/** FIFO cost of an outflow, consuming the oldest lots first. Returns null if stock is insufficient. */
export function fifoCost(lots: Lot[], qtyKg: number) {
  let left = roundKg(qtyKg);
  let cost = 0;
  const remaining = lots.map((l) => ({ ...l }));
  for (const lot of remaining) {
    if (left <= 0) break;
    const take = Math.min(lot.remainingKg, left);
    cost += take * lot.unitCost;
    lot.remainingKg = roundKg(lot.remainingKg - take);
    left = roundKg(left - take);
  }
  if (left > 0) return null;
  return { cost: roundMoney(cost), lots: remaining };
}

// ---------------------------------------------------------------- results
export type PeriodFigures = { revenue: number; cogs: number; expenses: number; stockLosses: number };
export function computeResults(p: PeriodFigures) {
  const grossMargin = sumMoney([p.revenue, -p.cogs]);
  const netResult = sumMoney([grossMargin, -p.expenses, -p.stockLosses]);
  const marginRate = p.revenue > 0 ? grossMargin / p.revenue : 0;
  return { grossMargin, netResult, marginRate };
}

/** Outstanding invoice amount = total − active allocations (never a duplicated total). */
export function outstanding(total: number, allocations: { amount: number; active: boolean }[], cancelled = false) {
  if (cancelled) return 0;
  return sumMoney([total, ...allocations.filter((a) => a.active).map((a) => -a.amount)]);
}

export function agingBucket(ageDays: number): "recent" | "d3" | "d7" | "d30" {
  if (ageDays > 30) return "d30";
  if (ageDays > 7) return "d7";
  if (ageDays > 3) return "d3";
  return "recent";
}

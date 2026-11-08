import { describe, expect, it } from "vitest";
import {
  agingBucket, checkPayment, computeResults, cumpAfterInflow, documentTotals, fifoCost,
  lineTotal, outstanding, requestedByProduct, roundMoney, sumMoney, validateDiscount, validateLine,
} from "@/lib/finance";
import { translateError } from "@/lib/errors";
import { fr } from "@/lib/i18n/fr";
import { ar } from "@/lib/i18n/ar";
import { resolvePeriod, addDays } from "@/lib/dates";

describe("rounding & totals", () => {
  it("rounds half away from zero like PostgreSQL", () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(2.675)).toBe(2.68);
    expect(roundMoney(-1.005)).toBe(-1.01);
  });
  it("computes line totals without floating point drift", () => {
    expect(lineTotal(12.345, 26)).toBe(320.97);
    expect(lineTotal(0.1, 0.3)).toBe(0.03);
    expect(lineTotal(100.5, 20)).toBe(2010);
    expect(lineTotal(3.333, 33.33)).toBe(111.09); // 111.08889
    expect(lineTotal(1.5, 19.99)).toBe(29.99); // 29.985 -> 29.99
  });
  it("computes document totals with discount (same as SQL test)", () => {
    const r = documentTotals([{ quantityKg: 12.345, unitPrice: 26 }, { quantityKg: 3, unitPrice: 25.5 }], 5);
    expect(r.subtotal).toBe(397.47);
    expect(r.total).toBe(392.47);
    expect(r.totalKg).toBe(15.345);
  });
  it("sums money exactly", () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
    expect(sumMoney([1500, 2000, 1000])).toBe(4500);
  });
});

describe("sales validation", () => {
  it("rejects invalid quantities and prices", () => {
    expect(validateLine({ quantityKg: 0, unitPrice: 10 })).toBe("invalid_quantity");
    expect(validateLine({ quantityKg: -2, unitPrice: 10 })).toBe("invalid_quantity");
    expect(validateLine({ quantityKg: 0.0004, unitPrice: 10 })).toBe("invalid_quantity");
    expect(validateLine({ quantityKg: NaN, unitPrice: 10 })).toBe("invalid_quantity");
    expect(validateLine({ quantityKg: 2, unitPrice: -1 })).toBe("invalid_price");
    expect(validateLine({ quantityKg: 2, unitPrice: 10 }, 1.5)).toBe("insufficient_stock");
    expect(validateLine({ quantityKg: 2, unitPrice: 10 }, 2)).toBeNull();
  });
  it("validates discount bounds", () => {
    expect(validateDiscount(0, 100)).toBe(true);
    expect(validateDiscount(100, 100)).toBe(true);
    expect(validateDiscount(100.01, 100)).toBe(false);
    expect(validateDiscount(-1, 100)).toBe(false);
  });
  it("aggregates requested stock per product", () => {
    const m = requestedByProduct([{ productId: "a", quantityKg: 1.1 }, { productId: "a", quantityKg: 2.2 }, { productId: "b", quantityKg: 1 }]);
    expect(m.get("a")).toBe(3.3);
    expect(m.get("b")).toBe(1);
  });
});

describe("payments: full invoices only", () => {
  const inv = [
    { id: "1", customerId: "c", total: 1500, status: "unpaid" as const },
    { id: "2", customerId: "c", total: 2000, status: "unpaid" as const },
    { id: "3", customerId: "c", total: 1000, status: "unpaid" as const },
  ];
  it("accepts one, several or all invoices for the exact amount", () => {
    expect(checkPayment("c", [inv[0]], 1500)).toEqual({ ok: true, total: 1500 });
    expect(checkPayment("c", [inv[0], inv[1]], 3500)).toEqual({ ok: true, total: 3500 });
    expect(checkPayment("c", inv, 4500)).toEqual({ ok: true, total: 4500 });
  });
  it("rejects partial and over payments", () => {
    expect(checkPayment("c", [inv[0]], 1000)).toMatchObject({ ok: false, error: "amount_mismatch" });
    expect(checkPayment("c", [inv[0]], 1600)).toMatchObject({ ok: false, error: "amount_mismatch" });
  });
  it("rejects paid invoices, duplicates and other customers", () => {
    expect(checkPayment("c", [{ ...inv[0], status: "paid" }], 1500)).toMatchObject({ error: "invoice_not_payable" });
    expect(checkPayment("c", [inv[0], inv[0]], 3000)).toMatchObject({ error: "duplicate_invoice_in_payment" });
    expect(checkPayment("x", [inv[0]], 1500)).toMatchObject({ error: "invoice_other_customer" });
    expect(checkPayment("c", [], 0)).toMatchObject({ error: "no_invoices" });
  });
  it("derives outstanding balances from allocations", () => {
    expect(outstanding(1500, [])).toBe(1500);
    expect(outstanding(1500, [{ amount: 1500, active: true }])).toBe(0);
    expect(outstanding(1500, [{ amount: 1500, active: false }])).toBe(1500);
    expect(outstanding(1500, [], true)).toBe(0);
  });
  it("buckets invoice age", () => {
    expect(agingBucket(0)).toBe("recent");
    expect(agingBucket(4)).toBe("d3");
    expect(agingBucket(8)).toBe("d7");
    expect(agingBucket(31)).toBe("d30");
  });
});

describe("valuation", () => {
  it("computes CUMP after inflows (same as SQL test)", () => {
    const a = cumpAfterInflow(0, 0, 100, 20);
    expect(a).toEqual({ stockKg: 100, avgCost: 20 });
    expect(cumpAfterInflow(a.stockKg, a.avgCost, 50, 23)).toEqual({ stockKg: 150, avgCost: 21 });
  });
  it("computes FIFO cost from oldest lots (same as SQL test)", () => {
    const r = fifoCost([{ remainingKg: 10, unitCost: 20 }, { remainingKg: 10, unitCost: 26 }], 15);
    expect(r?.cost).toBe(330);
    expect(r?.lots.map((l) => l.remainingKg)).toEqual([0, 5]);
    expect(fifoCost([{ remainingKg: 1, unitCost: 20 }], 2)).toBeNull();
  });
});

describe("results", () => {
  it("computes gross margin and estimated net result (same as SQL test)", () => {
    const r = computeResults({ revenue: 2100, cogs: 1470, expenses: 150, stockLosses: 21 });
    expect(r.grossMargin).toBe(630);
    expect(r.netResult).toBe(459);
    expect(r.marginRate).toBeCloseTo(0.3);
    expect(computeResults({ revenue: 0, cogs: 0, expenses: 10, stockLosses: 0 }).netResult).toBe(-10);
  });
});

describe("i18n & errors", () => {
  it("has identical keys in French and Arabic", () => {
    const keys = (o: object, p = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
    expect(keys(ar).sort()).toEqual(keys(fr).sort());
    expect(ar.meta.dir).toBe("rtl");
    expect(fr.meta.dir).toBe("ltr");
  });
  it("translates engine errors with details", () => {
    const msg = translateError(
      { message: "VM:insufficient_stock", details: JSON.stringify({ product: "X", available: 2, requested: 5 }) }, fr);
    expect(msg).toBe("Stock insuffisant pour X : disponible 2 kg, demandé 5 kg.");
    expect(translateError({ message: "duplicate key", code: "23505" }, fr)).toBe(fr.errors.duplicate);
    expect(translateError({ message: "boom internal detail" }, fr)).toBe(fr.errors.generic);
  });
});

describe("dates", () => {
  it("resolves period presets", () => {
    const p = resolvePeriod({ period: "last7" });
    expect(addDays(p.from, 6)).toBe(p.to);
    const c = resolvePeriod({ period: "custom", from: "2026-11-05", to: "2026-11-01" });
    expect(c).toMatchObject({ from: "2026-11-01", to: "2026-11-05" });
    expect(resolvePeriod({ period: "bogus" }).preset).toBe("thisMonth");
  });
});

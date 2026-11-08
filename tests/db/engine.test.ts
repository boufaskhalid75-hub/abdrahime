import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { TestDb, dbAvailable, n } from "./harness";

const db = new TestDb();
const D = "2026-11-02";

async function product(u: string, name: string, purchase = 20, sale = 25, extra: Record<string, unknown> = {}) {
  const r = await db.one(
    u,
    `insert into public.products (name, purchase_price, sale_price, min_stock_kg, reference)
     values ($1, $2, $3, $4, $5) returning id`,
    [name, purchase, sale, extra.min ?? 10, extra.reference ?? null],
  );
  return r.id as string;
}
async function supplier(u: string, name = `Fournisseur ${randomUUID().slice(0, 6)}`) {
  return (await db.one(u, "insert into public.suppliers (name) values ($1) returning id", [name])).id as string;
}
async function customer(u: string, name = `Boucherie ${randomUUID().slice(0, 6)}`) {
  return (await db.one(u, "insert into public.customers (name) values ($1) returning id", [name])).id as string;
}
type Line = { product_id: string; quantity_kg: number; unit_price?: number | null };
async function purchase(u: string, sup: string, items: Line[], date = D, opts: { paid?: boolean; key?: string } = {}) {
  const r = await db.one(
    u,
    "select public.create_purchase($1, $2, $3::jsonb, null, $4, $5, false, $6) as id",
    [sup, date, JSON.stringify(items), opts.paid ?? false, opts.paid ? "cash" : null, opts.key ?? null],
  );
  return r.id as string;
}
async function order(u: string, cust: string, items: Line[], opts: { deliver?: boolean; discount?: number; date?: string; key?: string } = {}) {
  const r = await db.one(u, "select public.create_order($1, $2, $3::jsonb, $4, null, $5, $6) as r", [
    cust,
    opts.date ?? D,
    JSON.stringify(items),
    opts.discount ?? 0,
    opts.deliver ?? false,
    opts.key ?? null,
  ]);
  return r.r as { order_id: string; delivery_id: string | null; invoice_id: string | null; duplicate?: boolean };
}
async function stock(u: string, p: string) {
  const r = await db.one(u, "select stock_kg, avg_cost from public.products where id = $1", [p]);
  return { kg: n(r.stock_kg), avg: n(r.avg_cost) };
}
async function lotsSum(p: string) {
  const r = await db.admin("select coalesce(sum(remaining_kg),0) s from public.stock_lots where product_id = $1", [p]);
  return n(r[0].s);
}
async function expectVmError(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toThrow(new RegExp(`VM:${code}`));
}

describe.skipIf(!dbAvailable())("database engine", () => {
  let A: string; // owner
  let B: string; // another, unrelated account (isolation tests)

  beforeAll(async () => {
    await db.setup();
    A = await db.createUser("owner@test.local");
    B = await db.createUser("intruder@test.local");
  }, 60_000);
  afterAll(async () => db.teardown());

  // ------------------------------------------------------------------ PRODUCTS
  describe("products", () => {
    it("creates, edits and archives a product, recording price history", async () => {
      const p = await product(A, "Produit Test 1", 18.5, 24);
      await db.as(A, "update public.products set sale_price = 26, name = 'Produit Test 1b' where id = $1", [p]);
      await db.as(A, "update public.products set is_active = false where id = $1", [p]);
      const row = await db.one(A, "select name, sale_price, is_active, unit from public.products where id = $1", [p]);
      expect(row).toMatchObject({ name: "Produit Test 1b", is_active: false, unit: "KG" });
      expect(n(row.sale_price)).toBe(26);
      const hist = await db.as(A, "select sale_price from public.product_price_history where product_id = $1 order by changed_at", [p]);
      expect(hist.rows.map((r) => n(r.sale_price))).toEqual([24, 26]);
      const audit = await db.as(A, "select action from public.audit_logs where entity_id = $1", [p]);
      expect(audit.rowCount).toBeGreaterThanOrEqual(2);
    });

    it("forbids writing stock columns and deleting products", async () => {
      const p = await product(A, "Produit Test 2");
      await expect(db.as(A, "update public.products set stock_kg = 999 where id = $1", [p])).rejects.toThrow(/permission denied/);
      await expect(db.as(A, "delete from public.products where id = $1", [p])).rejects.toThrow(/permission denied/);
    });

    it("rejects duplicate product names for the same owner", async () => {
      await product(A, "Doublon");
      await expect(product(A, "doublon ")).rejects.toThrow(/duplicate key/);
      // another owner may use the same name
      await expect(product(B, "Doublon")).resolves.toBeTypeOf("string");
    });
  });

  // ------------------------------------------------------------------ PURCHASES
  describe("purchases & inventory", () => {
    it("creates a purchase, lots and movements, and increases stock", async () => {
      const p1 = await product(A, "P-achat-1", 20, 26);
      const p2 = await product(A, "P-achat-2", 30, 38);
      const s = await supplier(A);
      const id = await purchase(A, s, [
        { product_id: p1, quantity_kg: 100.5, unit_price: 20 },
        { product_id: p2, quantity_kg: 40, unit_price: 31.25 },
      ]);
      const pu = await db.one(A, "select total_amount, reference, payment_status from public.purchases where id = $1", [id]);
      expect(n(pu.total_amount)).toBe(100.5 * 20 + 40 * 31.25); // 2010 + 1250
      expect(pu.reference).toMatch(/^ACH-2026-\d{5}$/);
      expect(pu.payment_status).toBe("unpaid");
      expect(await stock(A, p1)).toEqual({ kg: 100.5, avg: 20 });
      expect(await stock(A, p2)).toEqual({ kg: 40, avg: 31.25 });
      const mv = await db.as(A, "select movement_type, quantity_kg from public.stock_movements where purchase_id = $1", [id]);
      expect(mv.rowCount).toBe(2);
      expect(await lotsSum(p1)).toBe(100.5);
    });

    it("preserves historical purchase prices when the indicative price changes", async () => {
      const p = await product(A, "P-hist", 20, 26);
      const s = await supplier(A);
      const id = await purchase(A, s, [{ product_id: p, quantity_kg: 10, unit_price: 21 }]);
      await db.as(A, "update public.products set purchase_price = 99 where id = $1", [p]);
      const it = await db.one(A, "select unit_price, line_total from public.purchase_items where purchase_id = $1", [id]);
      expect(n(it.unit_price)).toBe(21);
      expect(n(it.line_total)).toBe(210);
    });

    it("computes the weighted average cost (CUMP) across purchases", async () => {
      const p = await product(A, "P-cump", 20, 26);
      const s = await supplier(A);
      await purchase(A, s, [{ product_id: p, quantity_kg: 100, unit_price: 20 }]);
      await purchase(A, s, [{ product_id: p, quantity_kg: 50, unit_price: 23 }]);
      // (100*20 + 50*23) / 150 = 21
      expect(await stock(A, p)).toEqual({ kg: 150, avg: 21 });
    });

    it("is idempotent for duplicate purchase submissions", async () => {
      const p = await product(A, "P-idem", 20, 26);
      const s = await supplier(A);
      const key = randomUUID();
      const a = await purchase(A, s, [{ product_id: p, quantity_kg: 10, unit_price: 20 }], D, { key });
      const b = await purchase(A, s, [{ product_id: p, quantity_kg: 10, unit_price: 20 }], D, { key });
      expect(a).toBe(b);
      expect((await stock(A, p)).kg).toBe(10);
    });

    it("rejects invalid purchase lines atomically (no partial write)", async () => {
      const p = await product(A, "P-atomic", 20, 26);
      const s = await supplier(A);
      await expectVmError(
        purchase(A, s, [
          { product_id: p, quantity_kg: 10, unit_price: 20 },
          { product_id: p, quantity_kg: -1, unit_price: 20 },
        ]),
        "invalid_quantity",
      );
      expect((await stock(A, p)).kg).toBe(0);
      const c = await db.admin("select count(*) c from public.purchase_items where product_id = $1", [p]);
      expect(n(c[0].c)).toBe(0);
    });

    it("cancels an untouched purchase and refuses cancelling a consumed one", async () => {
      const p = await product(A, "P-cancel", 20, 26);
      const s = await supplier(A);
      const c = await customer(A);
      const id1 = await purchase(A, s, [{ product_id: p, quantity_kg: 30, unit_price: 20 }], D, { paid: true });
      await db.as(A, "select public.cancel_purchase($1, 'erreur de saisie')", [id1]);
      expect((await stock(A, p)).kg).toBe(0);
      const cash = await db.admin(
        "select direction, amount from public.cash_movements where purchase_id = $1 order by created_at", [id1]);
      expect(cash.map((r) => r.direction)).toEqual(["out", "in"]);

      const id2 = await purchase(A, s, [{ product_id: p, quantity_kg: 30, unit_price: 20 }]);
      await order(A, c, [{ product_id: p, quantity_kg: 5, unit_price: 26 }], { deliver: true });
      await expectVmError(db.as(A, "select public.cancel_purchase($1, 'x')", [id2]), "purchase_stock_used");
    });

    it("pays a supplier purchase later and records the cash outflow", async () => {
      const p = await product(A, "P-paylater", 20, 26);
      const s = await supplier(A);
      const id = await purchase(A, s, [{ product_id: p, quantity_kg: 10, unit_price: 20 }]);
      await db.as(A, "select public.pay_purchase($1, 'bank_transfer', $2)", [id, D]);
      await expectVmError(db.as(A, "select public.pay_purchase($1, 'cash', $2)", [id, D]), "purchase_already_paid");
      const cash = await db.admin("select account, amount from public.cash_movements where purchase_id = $1", [id]);
      expect(cash).toHaveLength(1);
      expect(cash[0].account).toBe("bank");
      expect(n(cash[0].amount)).toBe(200);
    });
  });

  // ------------------------------------------------------------------ SALES / DELIVERIES
  describe("sales, deliveries & stock", () => {
    let p: string, s: string, c: string;
    beforeAll(async () => {
      p = await product(A, "P-vente", 20, 26);
      s = await supplier(A);
      c = await customer(A);
      await purchase(A, s, [{ product_id: p, quantity_kg: 100, unit_price: 20 }]);
    });

    it("creates an order and computes totals with discount", async () => {
      const r = await order(A, c, [
        { product_id: p, quantity_kg: 12.345, unit_price: 26 },
        { product_id: p, quantity_kg: 3, unit_price: 25.5 },
      ], { discount: 5 });
      const o = await db.one(A, "select subtotal, discount_amount, total_amount, status, reference from public.orders where id = $1", [r.order_id]);
      // 12.345 * 26 = 320.97 ; 3 * 25.5 = 76.5
      expect(n(o.subtotal)).toBe(397.47);
      expect(n(o.total_amount)).toBe(392.47);
      expect(o.status).toBe("confirmed");
      expect(o.reference).toMatch(/^VTE-2026-\d{5}$/);
      expect((await stock(A, p)).kg).toBe(100); // not delivered yet => no stock movement
    });

    it("rejects invalid quantities and discounts", async () => {
      await expectVmError(order(A, c, [{ product_id: p, quantity_kg: 0, unit_price: 26 }]), "invalid_quantity");
      await expectVmError(order(A, c, [{ product_id: p, quantity_kg: -3, unit_price: 26 }]), "invalid_quantity");
      await expectVmError(order(A, c, [{ product_id: p, quantity_kg: 1, unit_price: 26 }], { discount: 100 }), "invalid_discount");
      await expectVmError(order(A, c, []), "no_items");
    });

    it("uses customer specific price, then default price, when no price is given", async () => {
      const c2 = await customer(A);
      await db.as(A, "insert into public.customer_product_prices (customer_id, product_id, sale_price) values ($1, $2, 24.5)", [c2, p]);
      const r1 = await order(A, c2, [{ product_id: p, quantity_kg: 2, unit_price: null }]);
      const r2 = await order(A, c, [{ product_id: p, quantity_kg: 2, unit_price: null }]);
      const l1 = await db.one(A, "select unit_price from public.order_items where order_id = $1", [r1.order_id]);
      const l2 = await db.one(A, "select unit_price from public.order_items where order_id = $1", [r2.order_id]);
      expect(n(l1.unit_price)).toBe(24.5);
      expect(n(l2.unit_price)).toBe(26);
    });

    it("decreases stock exactly once on delivery and issues one invoice", async () => {
      const before = (await stock(A, p)).kg;
      const r = await order(A, c, [{ product_id: p, quantity_kg: 10, unit_price: 26 }]);
      const d = await db.one(A, "select public.confirm_delivery($1, $2, null) as r", [r.order_id, D]);
      expect((await stock(A, p)).kg).toBe(before - 10);
      expect(await lotsSum(p)).toBe(before - 10);
      expect(d.r.invoice_id).toBeTruthy();
      // second confirmation must fail: no double deduction
      await expectVmError(db.as(A, "select public.confirm_delivery($1, $2, null)", [r.order_id, D]), "order_not_deliverable");
      await expectVmError(db.as(A, "select public.issue_invoice($1)", [r.order_id]), "invoice_exists");
      expect((await stock(A, p)).kg).toBe(before - 10);
      const item = await db.one(A, "select unit_cost, cost_total from public.order_items where order_id = $1", [r.order_id]);
      expect(n(item.cost_total)).toBe(200); // 10 kg * 20 CUMP
    });

    it("prevents negative stock", async () => {
      const cur = (await stock(A, p)).kg;
      const r = await order(A, c, [{ product_id: p, quantity_kg: cur + 1, unit_price: 26 }]);
      await expectVmError(db.as(A, "select public.confirm_delivery($1, $2, null)", [r.order_id, D]), "insufficient_stock");
      expect((await stock(A, p)).kg).toBe(cur);
      const o = await db.one(A, "select status from public.orders where id = $1", [r.order_id]);
      expect(o.status).toBe("confirmed");
    });

    it("reverses a cancelled delivery exactly once and cancels the unpaid invoice", async () => {
      const before = (await stock(A, p)).kg;
      const r = await order(A, c, [{ product_id: p, quantity_kg: 7.5, unit_price: 26 }], { deliver: true });
      expect((await stock(A, p)).kg).toBe(before - 7.5);
      await db.as(A, "select public.cancel_delivery($1, 'retour client')", [r.delivery_id]);
      expect((await stock(A, p)).kg).toBe(before);
      expect(await lotsSum(p)).toBe(before);
      await expectVmError(db.as(A, "select public.cancel_delivery($1, 'encore')", [r.delivery_id]), "delivery_cancelled");
      expect((await stock(A, p)).kg).toBe(before);
      const inv = await db.one(A, "select status from public.invoices where id = $1", [r.invoice_id]);
      expect(inv.status).toBe("cancelled");
      const o = await db.one(A, "select status from public.orders where id = $1", [r.order_id]);
      expect(o.status).toBe("confirmed");
      // re-delivery issues a NEW invoice number
      const d2 = await db.one(A, "select public.confirm_delivery($1, $2, null) as r", [r.order_id, D]);
      expect(d2.r.invoice_id).not.toBe(r.invoice_id);
      expect((await stock(A, p)).kg).toBe(before - 7.5);
    });

    it("edits a confirmed order, and replaces it when it has stock history", async () => {
      const r = await order(A, c, [{ product_id: p, quantity_kg: 2, unit_price: 26 }]);
      const same = await db.one(A, "select public.update_order($1, $2, $3::jsonb, 0, 'modifiée') as id",
        [r.order_id, D, JSON.stringify([{ product_id: p, quantity_kg: 3, unit_price: 27 }])]);
      expect(same.id).toBe(r.order_id);
      const o = await db.one(A, "select total_amount from public.orders where id = $1", [r.order_id]);
      expect(n(o.total_amount)).toBe(81);

      const r2 = await order(A, c, [{ product_id: p, quantity_kg: 1, unit_price: 26 }], { deliver: true });
      await db.as(A, "select public.cancel_delivery($1, 'correction')", [r2.delivery_id]);
      const repl = await db.one(A, "select public.update_order($1, $2, $3::jsonb, 0, null) as id",
        [r2.order_id, D, JSON.stringify([{ product_id: p, quantity_kg: 1, unit_price: 25 }])]);
      expect(repl.id).not.toBe(r2.order_id);
      const old = await db.one(A, "select status, cancel_reason from public.orders where id = $1", [r2.order_id]);
      expect(old.status).toBe("cancelled");
    });

    it("preserves historical selling prices when the default price changes", async () => {
      const r = await order(A, c, [{ product_id: p, quantity_kg: 1, unit_price: null }], { deliver: true });
      await db.as(A, "update public.products set sale_price = 99 where id = $1", [p]);
      const ii = await db.one(A, "select unit_price, product_name from public.invoice_items where invoice_id = $1", [r.invoice_id]);
      expect(n(ii.unit_price)).toBe(26);
      await db.as(A, "update public.products set name = 'P-vente renamed', sale_price = 26 where id = $1", [p]);
      const ii2 = await db.one(A, "select product_name from public.invoice_items where invoice_id = $1", [r.invoice_id]);
      expect(ii2.product_name).toBe("P-vente");
    });

    it("idempotent order creation does not double deliver", async () => {
      const before = (await stock(A, p)).kg;
      const key = randomUUID();
      const a = await order(A, c, [{ product_id: p, quantity_kg: 1, unit_price: 26 }], { deliver: true, key });
      const b = await order(A, c, [{ product_id: p, quantity_kg: 1, unit_price: 26 }], { deliver: true, key });
      expect(b.order_id).toBe(a.order_id);
      expect(b.duplicate).toBe(true);
      expect((await stock(A, p)).kg).toBe(before - 1);
    });

    it("records damage as a stock loss and refuses an adjustment without reason", async () => {
      const before = (await stock(A, p)).kg;
      await db.as(A, "select public.adjust_stock($1, 'damage_out', 2, $2, 'produit abîmé')", [p, D]);
      expect((await stock(A, p)).kg).toBe(before - 2);
      await expectVmError(db.as(A, "select public.adjust_stock($1, 'damage_out', 1, $2, '')", [p, D]), "reason_required");
    });
  });

  // ------------------------------------------------------------------ FIFO
  describe("FIFO valuation", () => {
    it("values outflows using the oldest lots and locks the method afterwards", async () => {
      const F = await db.createUser();
      await db.as(F, "select public.set_valuation_method('FIFO')");
      const p = await product(F, "P-fifo", 20, 30);
      const s = await supplier(F);
      const c = await customer(F);
      await purchase(F, s, [{ product_id: p, quantity_kg: 10, unit_price: 20 }], "2026-11-01");
      await purchase(F, s, [{ product_id: p, quantity_kg: 10, unit_price: 26 }], "2026-11-02");
      const r = await order(F, c, [{ product_id: p, quantity_kg: 15, unit_price: 30 }], { deliver: true });
      const it = await db.one(F, "select cost_total from public.order_items where order_id = $1", [r.order_id]);
      expect(n(it.cost_total)).toBe(10 * 20 + 5 * 26); // 330
      const st = await db.one(F, "select stock_value from public.v_product_stock where id = $1", [p]);
      expect(n(st.stock_value)).toBe(5 * 26);
      await expectVmError(db.as(F, "select public.set_valuation_method('CUMP')"), "valuation_locked");
      await expect(db.as(F, "update public.business_settings set valuation_method = 'CUMP'")).rejects.toThrow(/permission denied/);
    });
  });

  // ------------------------------------------------------------------ INVOICES & PAYMENTS
  describe("invoices & payments", () => {
    let p: string, c: string, other: string;
    let inv: string[] = [];
    beforeAll(async () => {
      p = await product(A, "P-pay", 20, 25);
      const s = await supplier(A);
      c = await customer(A, "Boucherie Paiement");
      other = await customer(A, "Boucherie Autre");
      await purchase(A, s, [{ product_id: p, quantity_kg: 500, unit_price: 20 }]);
      // invoices of 1500, 2000, 1000 DH
      for (const kg of [60, 80, 40]) {
        const r = await order(A, c, [{ product_id: p, quantity_kg: kg, unit_price: 25 }], { deliver: true });
        inv.push(r.invoice_id!);
      }
    });

    const pay = (ids: string[], amount: number, cust?: string, key: string | null = null) =>
      db.one(A, "select public.record_payment($1, $2::uuid[], $3, 'cash', $4, null, null, $5) as id", [cust ?? c, ids, amount, D, key]);

    it("issues unique sequential invoice numbers", async () => {
      const r = await db.as(A, "select invoice_number from public.invoices where id = any($1::uuid[]) order by invoice_number", [inv]);
      const nums = r.rows.map((x) => x.invoice_number);
      expect(new Set(nums).size).toBe(3);
      nums.forEach((x) => expect(x).toMatch(/^FAC-2026-\d{5}$/));
      const totals = await db.as(A, "select total_amount from public.invoices where id = any($1::uuid[])", [inv]);
      expect(totals.rows.map((x) => n(x.total_amount)).sort()).toEqual([1000, 1500, 2000]);
    });

    it("keeps invoices immutable", async () => {
      await expect(db.as(A, "update public.invoices set total_amount = 1 where id = $1", [inv[0]])).rejects.toThrow(/permission denied/);
      await expect(db.admin("update public.invoices set total_amount = 1 where id = $1", [inv[0]])).rejects.toThrow(/VM:invoice_immutable/);
      await expect(db.admin("delete from public.invoice_items where invoice_id = $1", [inv[0]])).rejects.toThrow(/VM:delete_forbidden/);
    });

    it("rejects partial payments and overpayments", async () => {
      await expectVmError(pay([inv[0]], 1000), "amount_mismatch");
      await expectVmError(pay([inv[0]], 1600), "amount_mismatch");
      await expectVmError(pay([inv[0], inv[1]], 3000), "amount_mismatch");
    });

    it("rejects invoices of another customer and duplicates in the same payment", async () => {
      await expectVmError(pay([inv[0]], 1500, other), "invoice_other_customer");
      await expectVmError(pay([inv[0], inv[0]], 3000), "duplicate_invoice_in_payment");
    });

    it("pays one invoice and recalculates the balance", async () => {
      const before = await db.one(A, "select outstanding, unpaid_count from public.v_customer_balances where id = $1", [c]);
      expect(n(before.outstanding)).toBe(4500);
      const r = await pay([inv[0]], 1500);
      expect(r.id).toBeTruthy();
      const after = await db.one(A, "select outstanding, unpaid_count, total_paid from public.v_customer_balances where id = $1", [c]);
      expect(n(after.outstanding)).toBe(3000);
      expect(after.unpaid_count).toBe(2);
      expect(n(after.total_paid)).toBe(1500);
    });

    it("rejects paying the same invoice twice", async () => {
      await expectVmError(pay([inv[0]], 1500), "invoice_not_payable");
      await expectVmError(pay([inv[0], inv[1]], 3500), "invoice_not_payable");
    });

    it("pays several invoices in one operation (idempotent)", async () => {
      const key = randomUUID();
      const r1 = await pay([inv[1], inv[2]], 3000, undefined, key);
      const r2 = await pay([inv[1], inv[2]], 3000, undefined, key);
      expect(r2.id).toBe(r1.id);
      const al = await db.as(A, "select amount from public.payment_allocations where payment_id = $1", [r1.id]);
      expect(al.rows.map((x) => n(x.amount)).sort()).toEqual([1000, 2000]);
      const bal = await db.one(A, "select outstanding from public.v_customer_balances where id = $1", [c]);
      expect(n(bal.outstanding)).toBe(0);
      const cash = await db.admin("select count(*) c from public.cash_movements where payment_id = $1", [r1.id]);
      expect(n(cash[0].c)).toBe(1);
    });

    it("concurrent duplicate submissions settle the invoice only once", async () => {
      const r = await order(A, c, [{ product_id: p, quantity_kg: 4, unit_price: 25 }], { deliver: true });
      const results = await Promise.allSettled([pay([r.invoice_id!], 100), pay([r.invoice_id!], 100)]);
      expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
      const al = await db.admin("select count(*) c from public.payment_allocations where invoice_id = $1 and is_active", [r.invoice_id]);
      expect(n(al[0].c)).toBe(1);
    });

    it("reverses a payment and restores invoice statuses", async () => {
      const r = await order(A, c, [{ product_id: p, quantity_kg: 2, unit_price: 25 }], { deliver: true });
      const pid = (await pay([r.invoice_id!], 50)).id;
      await expectVmError(db.as(A, "select public.cancel_invoice($1, 'x')", [r.invoice_id]), "invoice_paid_reverse_payment_first");
      await db.as(A, "select public.reverse_payment($1, 'chèque rejeté')", [pid]);
      const i = await db.one(A, "select status from public.invoices where id = $1", [r.invoice_id]);
      expect(i.status).toBe("unpaid");
      await expectVmError(db.as(A, "select public.reverse_payment($1, 'again')", [pid]), "payment_already_reversed");
      const cash = await db.admin("select direction from public.cash_movements where payment_id = $1 order by created_at", [pid]);
      expect(cash.map((x) => x.direction)).toEqual(["in", "out"]);
      // can be paid again after reversal
      await expect(pay([r.invoice_id!], 50)).resolves.toBeTruthy();
    });
  });

  // ------------------------------------------------------------------ FINANCE
  describe("financial engine", () => {
    it("computes revenue, COGS, margin, expenses, losses and net result", async () => {
      const U = await db.createUser();
      const p = await product(U, "P-fin", 20, 30);
      const s = await supplier(U);
      const c = await customer(U);
      await purchase(U, s, [{ product_id: p, quantity_kg: 100, unit_price: 20 }], "2026-10-01", { paid: true });
      await purchase(U, s, [{ product_id: p, quantity_kg: 100, unit_price: 22 }], "2026-10-01"); // avg 21
      const o1 = await order(U, c, [{ product_id: p, quantity_kg: 50, unit_price: 30 }], { deliver: true, date: "2026-10-02" });
      await order(U, c, [{ product_id: p, quantity_kg: 20, unit_price: 31 }], { deliver: true, date: "2026-10-02", discount: 20 });
      await order(U, c, [{ product_id: p, quantity_kg: 5, unit_price: 30 }], { deliver: false, date: "2026-10-02" }); // not delivered
      const cancelled = await order(U, c, [{ product_id: p, quantity_kg: 10, unit_price: 30 }], { deliver: true, date: "2026-10-02" });
      await db.as(U, "select public.cancel_invoice($1, 'annulée')", [cancelled.invoice_id]);
      await db.as(U, "select public.cancel_order($1, 'annulée')", [cancelled.order_id]);
      const cat = await db.one(U, "select id from public.expense_categories where code = 'fuel'");
      await db.as(U, "select public.create_expense($1, '2026-10-02', 150, 'cash', 'Gasoil')", [cat.id]);
      const e2 = await db.one(U, "select public.create_expense($1, '2026-10-02', 99, 'cash', 'Erreur') as id", [cat.id]);
      await db.as(U, "select public.cancel_expense($1, 'doublon')", [e2.id]);
      await db.as(U, "select public.adjust_stock($1, 'damage_out', 1, '2026-10-02', 'casse')", [p]);
      await db.as(U, "select public.record_payment($1, array[$2]::uuid[], 1500, 'cash', '2026-10-03')", [c, o1.invoice_id]);
      await db.as(U, "select public.record_cash_movement('2026-09-30', 'cash', 'in', 5000, 'opening_balance', 'Fonds de caisse')");

      const sum = (await db.one(U, "select public.period_summary('2026-10-01', '2026-10-31') as s")).s;
      // revenue: 1500 + (620 - 20) = 2100 ; cancelled invoice excluded
      expect(n(sum.revenue)).toBe(2100);
      expect(n(sum.invoices_count)).toBe(2);
      // COGS: 70 kg * 21 = 1470
      expect(n(sum.cogs)).toBe(1470);
      expect(n(sum.gross_margin)).toBe(630);
      expect(n(sum.expenses)).toBe(150);
      expect(n(sum.stock_losses)).toBe(21);
      expect(n(sum.net_result)).toBe(630 - 150 - 21);
      expect(n(sum.collections_total)).toBe(1500);
      expect(n(sum.receivables_total)).toBe(600);
      expect(n(sum.purchases_total)).toBe(4200);
      // cash at 31/10: 5000 opening - 2000 supplier paid - 150 - 99 expenses + 1500 collected.
      // The cancellation of the 99 DH expense is dated on the day it is cancelled (today), not retroactively.
      expect(n(sum.cash_balance.cash)).toBe(5000 - 2000 - 150 - 99 + 1500);
      const now = (await db.one(U, "select public.period_summary('2026-10-01', '2099-12-31') as s")).s;
      expect(n(now.cash_balance.cash)).toBe(5000 - 2000 - 150 + 1500);
      expect(n(sum.stock_kg)).toBe(200 - 70 - 1);
      expect(n(sum.stock_value)).toBe(129 * 21);

      // the day of sales: unpaid invoices are NOT counted as cash receipts
      const day = (await db.one(U, "select public.period_summary('2026-10-02', '2026-10-02') as s")).s;
      expect(n(day.revenue)).toBe(2100);
      expect(n(day.collections_total)).toBe(0);
      // invoices of that day still outstanding today (1500 was collected on 03/10)
      expect(n(day.period_unpaid_amount)).toBe(600);

      const series = await db.as(U, "select * from public.sales_series('2026-10-01', '2026-10-03', 'day')");
      expect(series.rows.map((r) => n(r.revenue))).toEqual([0, 2100, 0]);
      expect(series.rows.map((r) => n(r.collections))).toEqual([0, 0, 1500]);

      const pp = await db.one(U, "select * from public.product_performance('2026-10-01', '2026-10-31') where product_id = $1", [p]);
      expect(n(pp.quantity_kg)).toBe(70);
      expect(n(pp.cogs)).toBe(1470);
      const cp = await db.one(U, "select * from public.customer_performance('2026-10-01', '2026-10-31') where customer_id = $1", [c]);
      expect(n(cp.revenue)).toBe(2100);
      expect(n(cp.outstanding)).toBe(600);
      const sp = await db.one(U, "select * from public.supplier_performance('2026-10-01', '2026-10-31') where supplier_id = $1", [s]);
      expect(n(sp.amount)).toBe(4200);
      expect(n(sp.unpaid_amount)).toBe(2200);

      await db.as(U, "select public.save_daily_closing('2026-10-02', 'ok')");
      await db.as(U, "select public.save_daily_closing('2026-10-02', 'revu')");
      const cl = await db.as(U, "select notes from public.daily_closings");
      expect(cl.rows).toEqual([{ notes: "revu" }]);
    });
  });

  // ------------------------------------------------------------------ SECURITY
  describe("security (RLS & privileges)", () => {
    it("anonymous users cannot read or call anything", async () => {
      await expect(db.as(null, "select * from public.products")).rejects.toThrow(/permission denied/);
      await expect(db.as(null, "select * from public.invoices")).rejects.toThrow(/permission denied/);
      await expect(db.as(null, "select public.period_summary('2026-01-01','2026-12-31')")).rejects.toThrow(/permission denied/);
      await expect(db.as(null, "select public.record_payment(null, null, 1, 'cash', null)")).rejects.toThrow(/permission denied/);
    });

    it("an authenticated user only sees their own rows", async () => {
      const prodsB = await db.as(B, "select name from public.products");
      expect(prodsB.rows.every((r) => r.name === "Doublon")).toBe(true);
      const invB = await db.as(B, "select * from public.invoices");
      expect(invB.rowCount).toBe(0);
      const viewB = await db.as(B, "select * from public.v_invoice_balances");
      expect(viewB.rowCount).toBe(0);
      const sumB = (await db.one(B, "select public.period_summary('2026-01-01','2026-12-31') as s")).s;
      expect(n(sumB.revenue)).toBe(0);
    });

    it("cannot act on another owner's records through RPC", async () => {
      const pa = await db.one(A, "select id from public.products limit 1");
      const ca = await db.one(A, "select id from public.customers limit 1");
      const ia = await db.one(A, "select id, total_amount from public.invoices where status = 'unpaid' limit 1");
      await expectVmError(db.as(B, "select public.adjust_stock($1, 'damage_out', 1, $2, 'x')", [pa.id, D]), "product_not_found");
      await expectVmError(order(B, ca.id, [{ product_id: pa.id, quantity_kg: 1, unit_price: 1 }]), "customer_not_found");
      await expectVmError(
        db.as(B, "select public.record_payment($1, array[$2]::uuid[], $3, 'cash', $4)", [ca.id, ia.id, ia.total_amount, D]),
        "customer_not_found",
      );
      await expect(db.as(B, "update public.products set name = 'hack' where id = $1 returning id", [pa.id])).resolves.toMatchObject({ rowCount: 0 });
      await expect(db.as(B, "insert into public.customer_product_prices (customer_id, product_id, sale_price) values ($1, $2, 1)", [ca.id, pa.id])).rejects.toThrow(/row-level security/);
    });

    it("blocks direct writes to financial tables", async () => {
      const ca = await db.one(A, "select id from public.customers limit 1");
      await expect(db.as(A, "insert into public.payments (owner_id, reference, customer_id, payment_date, amount, method) values ($1, 'X', $2, now(), 1, 'cash')", [A, ca.id])).rejects.toThrow(/permission denied/);
      await expect(db.as(A, "update public.invoices set status = 'paid'")).rejects.toThrow(/permission denied/);
      await expect(db.as(A, "insert into public.stock_movements (owner_id) values ($1)", [A])).rejects.toThrow(/permission denied/);
      await expect(db.as(A, "delete from public.audit_logs")).rejects.toThrow(/permission denied/);
      await expect(db.as(A, "select app_private.require_owner()")).rejects.toThrow(/permission denied/);
    });

    it("rejects RPC calls without an authenticated subject", async () => {
      const client = await db.pool.connect();
      try {
        await client.query("begin; set local role authenticated");
        await expect(client.query("select public.ensure_owner_setup()")).rejects.toThrow(/VM:not_authenticated/);
      } finally {
        await client.query("rollback");
        client.release();
      }
    });

    it("keeps the stock invariant: product stock equals the sum of lots", async () => {
      const r = await db.admin(`
        select p.name, p.stock_kg, coalesce(sum(l.remaining_kg), 0) as lots
          from public.products p left join public.stock_lots l on l.product_id = p.id
         group by p.id having p.stock_kg <> coalesce(sum(l.remaining_kg), 0)`);
      expect(r).toEqual([]);
      const m = await db.admin(`
        select p.name from public.products p
         where p.stock_kg <> coalesce((select sum(quantity_kg) from public.stock_movements m where m.product_id = p.id), 0)`);
      expect(m).toEqual([]);
    });
  });
});

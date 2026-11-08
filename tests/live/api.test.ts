/**
 * LIVE integration test against a real Supabase project, through PostgREST + Auth,
 * with the same client library the application uses.
 *
 * Required env: LIVE_SUPABASE_URL, LIVE_SUPABASE_KEY (publishable key),
 *               LIVE_USER_A / LIVE_PASS_A, LIVE_USER_B / LIVE_PASS_B (two dedicated QA accounts).
 * It creates uniquely-named records; it never touches other accounts' data.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const URL_ = process.env.LIVE_SUPABASE_URL ?? "";
const KEY = process.env.LIVE_SUPABASE_KEY ?? "";
const enabled = Boolean(URL_ && KEY && process.env.LIVE_USER_A && process.env.LIVE_USER_B);
const tag = randomUUID().slice(0, 6);
const D = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Casablanca" }).format(new Date());
const n = (v: unknown) => Number(v);

async function signIn(email: string, password: string) {
  const c = createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const setup = await c.rpc("ensure_owner_setup");
  if (setup.error) throw setup.error;
  return c;
}
const ok = <T,>(r: { data: T; error: unknown }): NonNullable<T> => {
  if (r.error) throw r.error;
  if (r.data === null || r.data === undefined) throw new Error("empty result");
  return r.data as NonNullable<T>;
};
const done = (r: { error: unknown }) => {
  if (r.error) throw r.error;
};
const vm = async (p: PromiseLike<{ error: { message: string } | null }>, code: string) => {
  const r = await p;
  expect(r.error?.message ?? "no error").toContain(`VM:${code}`);
};

describe.skipIf(!enabled)("LIVE Supabase backend", () => {
  let A: SupabaseClient, B: SupabaseClient, anon: SupabaseClient;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    A = await signIn(process.env.LIVE_USER_A!, process.env.LIVE_PASS_A!);
    B = await signIn(process.env.LIVE_USER_B!, process.env.LIVE_PASS_B!);
    anon = createClient(URL_, KEY, { auth: { persistSession: false } });
  }, 60_000);

  it("creates master data (product, supplier, customers) through RLS-protected inserts", async () => {
    ids.p = ok(await A.from("products").insert({ name: `Poulet QA ${tag}`, purchase_price: 20, sale_price: 26, min_stock_kg: 10 }).select("id").single()).id;
    ids.s = ok(await A.from("suppliers").insert({ name: `Fournisseur QA ${tag}` }).select("id").single()).id;
    ids.c = ok(await A.from("customers").insert({ name: `Boucherie QA ${tag}` }).select("id").single()).id;
    ids.c2 = ok(await A.from("customers").insert({ name: `Boucherie QA2 ${tag}` }).select("id").single()).id;
    const hist = ok(await A.from("product_price_history").select("sale_price").eq("product_id", ids.p));
    expect(hist).toHaveLength(1);
  });

  it("purchase increases stock and keeps the historical purchase price", async () => {
    ids.pur = ok(await A.rpc("create_purchase", {
      p_supplier_id: ids.s, p_purchase_date: D, p_items: [{ product_id: ids.p, quantity_kg: 100, unit_price: 20 }],
      p_paid: true, p_payment_method: "bank_transfer", p_update_prices: false, p_idempotency_key: randomUUID(),
    })) as string;
    ok(await A.rpc("create_purchase", {
      p_supplier_id: ids.s, p_purchase_date: D, p_items: [{ product_id: ids.p, quantity_kg: 100, unit_price: 22 }],
      p_paid: false, p_idempotency_key: randomUUID(),
    }));
    const p = ok(await A.from("v_product_stock").select("stock_kg, avg_cost, stock_value").eq("id", ids.p).single());
    expect(n(p.stock_kg)).toBe(200);
    expect(n(p.avg_cost)).toBe(21); // CUMP (100×20 + 100×22) / 200
    expect(n(p.stock_value)).toBe(4200);
    done(await A.from("products").update({ purchase_price: 99 }).eq("id", ids.p));
    const line = ok(await A.from("purchase_items").select("unit_price").eq("purchase_id", ids.pur).single());
    expect(n(line.unit_price)).toBe(20);
  });

  it("sale + delivery deducts stock exactly once and generates one invoice", async () => {
    const r = ok(await A.rpc("create_order", {
      p_customer_id: ids.c, p_order_date: D, p_items: [{ product_id: ids.p, quantity_kg: 60, unit_price: 25 }],
      p_discount: 0, p_deliver_now: true, p_idempotency_key: randomUUID(),
    })) as { order_id: string; delivery_id: string; invoice_id: string };
    ids.o1 = r.order_id; ids.i1 = r.invoice_id;
    expect(r.invoice_id).toBeTruthy();
    await vm(A.rpc("confirm_delivery", { p_order_id: r.order_id, p_delivery_date: D }), "order_not_deliverable");
    await vm(A.rpc("issue_invoice", { p_order_id: r.order_id }), "invoice_exists");
    const p = ok(await A.from("products").select("stock_kg").eq("id", ids.p).single());
    expect(n(p.stock_kg)).toBe(140);
    const inv = ok(await A.from("invoices").select("invoice_number, total_amount, status").eq("id", r.invoice_id).single());
    expect(inv.invoice_number).toMatch(/^FAC-\d{4}-\d{5}$/);
    expect(n(inv.total_amount)).toBe(1500);
    expect(inv.status).toBe("unpaid");
    const item = ok(await A.from("order_items").select("cost_total").eq("order_id", r.order_id).single());
    expect(n(item.cost_total)).toBe(1260); // 60 kg × 21 historical CUMP cost, not the indicative 99
  });

  it("refuses negative stock", async () => {
    const r = ok(await A.rpc("create_order", {
      p_customer_id: ids.c, p_order_date: D, p_items: [{ product_id: ids.p, quantity_kg: 1000, unit_price: 25 }], p_deliver_now: false,
    })) as { order_id: string };
    const res = await A.rpc("confirm_delivery", { p_order_id: r.order_id, p_delivery_date: D });
    expect(res.error?.message).toContain("VM:insufficient_stock");
    expect(res.error?.details).toContain("available");
    const p = ok(await A.from("products").select("stock_kg").eq("id", ids.p).single());
    expect(n(p.stock_kg)).toBe(140);
    done(await A.rpc("cancel_order", { p_order_id: r.order_id, p_reason: "QA: test stock négatif" }));
  });

  it("cancelled delivery restores stock exactly once", async () => {
    const r = ok(await A.rpc("create_order", {
      p_customer_id: ids.c, p_order_date: D, p_items: [{ product_id: ids.p, quantity_kg: 5, unit_price: 25 }], p_deliver_now: true,
    })) as { order_id: string; delivery_id: string };
    done(await A.rpc("cancel_delivery", { p_delivery_id: r.delivery_id, p_reason: "QA: retour" }));
    await vm(A.rpc("cancel_delivery", { p_delivery_id: r.delivery_id, p_reason: "QA: retour bis" }), "delivery_cancelled");
    const p = ok(await A.from("products").select("stock_kg").eq("id", ids.p).single());
    expect(n(p.stock_kg)).toBe(140);
    done(await A.rpc("cancel_order", { p_order_id: r.order_id, p_reason: "QA: nettoyage" }));
  });

  it("refuses partial payment and settles several full invoices together", async () => {
    const mk = async (kg: number) => (ok(await A.rpc("create_order", {
      p_customer_id: ids.c, p_order_date: D, p_items: [{ product_id: ids.p, quantity_kg: kg, unit_price: 25 }], p_deliver_now: true,
    })) as { invoice_id: string }).invoice_id;
    ids.i2 = await mk(80); // 2000
    ids.i3 = await mk(40); // 1000
    await vm(A.rpc("record_payment", { p_customer_id: ids.c, p_invoice_ids: [ids.i1], p_amount: 1000, p_method: "cash", p_payment_date: D }), "amount_mismatch");
    await vm(A.rpc("record_payment", { p_customer_id: ids.c2, p_invoice_ids: [ids.i1], p_amount: 1500, p_method: "cash", p_payment_date: D }), "invoice_other_customer");
    const key = randomUUID();
    const pay = ok(await A.rpc("record_payment", {
      p_customer_id: ids.c, p_invoice_ids: [ids.i1, ids.i2], p_amount: 3500, p_method: "cash", p_payment_date: D, p_idempotency_key: key,
    })) as string;
    const again = ok(await A.rpc("record_payment", {
      p_customer_id: ids.c, p_invoice_ids: [ids.i1, ids.i2], p_amount: 3500, p_method: "cash", p_payment_date: D, p_idempotency_key: key,
    })) as string;
    expect(again).toBe(pay);
    await vm(A.rpc("record_payment", { p_customer_id: ids.c, p_invoice_ids: [ids.i1], p_amount: 1500, p_method: "cash", p_payment_date: D }), "invoice_not_payable");
    const bal = ok(await A.from("v_customer_balances").select("outstanding, unpaid_count, total_paid").eq("id", ids.c).single());
    expect(n(bal.outstanding)).toBe(1000);
    expect(bal.unpaid_count).toBe(1);
    expect(n(bal.total_paid)).toBe(3500);
  });

  it("computes cash/bank balances and profit from real records", async () => {
    const cat = ok(await A.from("expense_categories").select("id").eq("code", "fuel").single());
    ok(await A.rpc("create_expense", { p_category_id: cat.id, p_expense_date: D, p_amount: 150, p_payment_method: "cash", p_description: `QA gasoil ${tag}` }));
    const s = ok(await A.rpc("period_summary", { p_from: D, p_to: D })) as Record<string, number & Record<string, number>>;
    // This QA account may hold data from previous runs: compare deltas of this run's records via dedicated checks.
    const inv = ok(await A.from("invoices").select("total_amount").in("id", [ids.i1, ids.i2, ids.i3]));
    expect(inv.reduce((a, r) => a + n(r.total_amount), 0)).toBe(4500);
    const items = ok(await A.from("order_items").select("cost_total, orders!inner(customer_id, status)").eq("orders.customer_id", ids.c).eq("orders.status", "delivered"));
    expect(items.reduce((a, r) => a + n(r.cost_total), 0)).toBe(180 * 21); // 60+80+40 kg at CUMP 21
    expect(n(s.revenue) - n(s.cogs)).toBe(n(s.gross_margin));
    expect(n(s.gross_margin) - n(s.expenses) - n(s.stock_losses)).toBe(n(s.net_result));
    const cash = ok(await A.from("cash_movements").select("account, direction, amount, source_type").or(`purchase_id.eq.${ids.pur},description.eq.QA gasoil ${tag}`));
    expect(cash).toEqual(expect.arrayContaining([
      expect.objectContaining({ account: "bank", direction: "out", source_type: "supplier_payment" }),
      expect.objectContaining({ account: "cash", direction: "out", source_type: "expense" }),
    ]));
    expect(n(s.collections_total)).toBeGreaterThanOrEqual(3500);
    expect(Object.keys(s.cash_balance)).toEqual(expect.arrayContaining(["cash", "bank", "other"]));
  });

  it("daily closing snapshot is saved", async () => {
    ok(await A.rpc("save_daily_closing", { p_date: D, p_notes: `QA ${tag}` }));
    const c = ok(await A.from("daily_closings").select("snapshot, notes").eq("closing_date", D).single());
    expect(c.notes).toBe(`QA ${tag}`);
    expect(c.snapshot).toHaveProperty("revenue");
  });

  it("RLS: anonymous gets nothing, another account sees nothing and cannot act", async () => {
    for (const t of ["products", "invoices", "payments", "customers", "cash_movements", "audit_logs"]) {
      const r = await anon.from(t).select("id").limit(1);
      expect(r.error?.code, t).toBe("42501");
    }
    expect((await anon.rpc("period_summary", { p_from: D, p_to: D })).error).toBeTruthy();
    for (const t of ["products", "invoices", "payments", "customers", "stock_movements", "v_invoice_balances"]) {
      const r = ok(await B.from(t).select("id").in("id", [ids.p, ids.i1, ids.c].filter(Boolean)));
      expect(r, t).toEqual([]);
    }
    await vm(B.rpc("adjust_stock", { p_product_id: ids.p, p_type: "damage_out", p_quantity_kg: 1, p_date: D, p_notes: "intrusion" }), "product_not_found");
    await vm(B.rpc("record_payment", { p_customer_id: ids.c, p_invoice_ids: [ids.i3], p_amount: 1000, p_method: "cash", p_payment_date: D }), "customer_not_found");
    const upd = await B.from("products").update({ name: "hack" }).eq("id", ids.p).select("id");
    expect(upd.data ?? []).toEqual([]);
    const direct = await A.from("invoices").update({ total_amount: 1 }).eq("id", ids.i3);
    expect(direct.error?.code).toBe("42501");
    const stockHack = await A.from("products").update({ stock_kg: 9999 }).eq("id", ids.p);
    expect(stockHack.error?.code).toBe("42501");
    const p = ok(await A.from("products").select("stock_kg, name").eq("id", ids.p).single());
    expect(n(p.stock_kg)).toBe(140 - 120);
  });
});

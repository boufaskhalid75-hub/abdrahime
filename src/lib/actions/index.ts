"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { translateError, type ActionResult } from "@/lib/errors";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";
import { callRpc, validationError } from "./rpc";
import {
  adjustmentSchema, cashMovementSchema, customerSchema, expenseSchema, orderSchema, paymentSchema,
  productSchema, purchaseSchema, reasonSchema, settingsSchema, supplierSchema, isoDate,
} from "@/lib/schemas";

const uuid = z.string().uuid();

async function db() {
  const supabase = await createClient();
  const { t } = await getI18n();
  const { data } = await supabase.auth.getUser();
  return { supabase, t, user: data.user };
}

function refresh(...paths: string[]) {
  paths.forEach((p) => revalidatePath(p, "layout"));
}

// ------------------------------------------------------------------ auth & preferences
export async function signIn(_: unknown, form: FormData): Promise<ActionResult<null>> {
  const { t } = await getI18n();
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) return { ok: false, error: t.auth.invalid };
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { ok: false, error: t.auth.notConfigured };
  }
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: t.auth.invalid };
  await supabase.rpc("ensure_owner_setup");
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const { supabase, user } = await db();
  if (user) await supabase.from("profiles").update({ locale }).eq("id", user.id);
  refresh("/");
}

export async function updateProfile(input: { full_name: string; phone: string }): Promise<ActionResult<null>> {
  const { supabase, t, user } = await db();
  if (!user) return { ok: false, error: t.errors.not_authenticated };
  const p = z.object({ full_name: z.string().trim().max(120), phone: z.string().trim().max(40) }).safeParse(input);
  if (!p.success) return validationError();
  const { error } = await supabase.from("profiles").update({ full_name: p.data.full_name || null, phone: p.data.phone || null }).eq("id", user.id);
  if (error) return { ok: false, error: translateError(error, t) };
  refresh("/profile");
  return { ok: true, data: null };
}

export async function changePassword(password: string): Promise<ActionResult<null>> {
  const { supabase, t, user } = await db();
  if (!user) return { ok: false, error: t.errors.not_authenticated };
  if (typeof password !== "string" || password.length < 8) return { ok: false, error: t.profile.passwordMin };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: t.errors.generic };
  return { ok: true, data: null };
}

// ------------------------------------------------------------------ master data (direct writes, RLS protected)
async function upsertRow(
  table: "products" | "suppliers" | "customers",
  id: string | null,
  values: Record<string, unknown>,
  paths: string[],
): Promise<ActionResult<{ id: string }>> {
  const { supabase, t, user } = await db();
  if (!user) return { ok: false, error: t.errors.not_authenticated };
  const q = id
    ? supabase.from(table).update(values).eq("id", id).select("id").single()
    : supabase.from(table).insert(values).select("id").single();
  const { data, error } = await q;
  if (error) return { ok: false, error: translateError(error, t) };
  refresh(...paths);
  return { ok: true, data: { id: data.id as string } };
}

export async function saveProduct(id: string | null, input: unknown) {
  const p = productSchema.safeParse(input);
  if (!p.success || (id && !uuid.safeParse(id).success)) return validationError();
  return upsertRow("products", id, p.data, ["/products", "/stock"]);
}
export async function saveSupplier(id: string | null, input: unknown) {
  const p = supplierSchema.safeParse(input);
  if (!p.success || (id && !uuid.safeParse(id).success)) return validationError();
  return upsertRow("suppliers", id, p.data, ["/suppliers"]);
}
export async function saveCustomer(id: string | null, input: unknown) {
  const p = customerSchema.safeParse(input);
  if (!p.success || (id && !uuid.safeParse(id).success)) return validationError();
  return upsertRow("customers", id, p.data, ["/customers"]);
}

export async function setActive(table: "products" | "suppliers" | "customers" | "expense_categories", id: string, active: boolean) {
  if (!["products", "suppliers", "customers", "expense_categories"].includes(table) || !uuid.safeParse(id).success) return validationError();
  const { supabase, t, user } = await db();
  if (!user) return { ok: false as const, error: t.errors.not_authenticated };
  const { error } = await supabase.from(table).update({ is_active: Boolean(active) }).eq("id", id);
  if (error) return { ok: false as const, error: translateError(error, t) };
  refresh(`/${table === "expense_categories" ? "settings" : table}`);
  return { ok: true as const, data: null };
}

/** prices: { [productId]: number | null } — null/empty removes the specific price. */
export async function saveCustomerPrices(customerId: string, prices: Record<string, number | null>): Promise<ActionResult<null>> {
  if (!uuid.safeParse(customerId).success) return validationError();
  const { supabase, t, user } = await db();
  if (!user) return { ok: false, error: t.errors.not_authenticated };
  for (const [productId, price] of Object.entries(prices)) {
    if (!uuid.safeParse(productId).success) return validationError();
    if (price === null || Number.isNaN(price)) {
      const { error } = await supabase.from("customer_product_prices").delete().eq("customer_id", customerId).eq("product_id", productId);
      if (error) return { ok: false, error: translateError(error, t) };
    } else {
      if (price < 0) return validationError();
      const { data: existing } = await supabase.from("customer_product_prices").select("id").eq("customer_id", customerId).eq("product_id", productId).maybeSingle();
      const { error } = existing
        ? await supabase.from("customer_product_prices").update({ sale_price: price }).eq("id", existing.id)
        : await supabase.from("customer_product_prices").insert({ customer_id: customerId, product_id: productId, sale_price: price });
      if (error) return { ok: false, error: translateError(error, t) };
    }
  }
  refresh(`/customers/${customerId}`);
  return { ok: true, data: null };
}

export async function saveExpenseCategory(name: string): Promise<ActionResult<null>> {
  const p = z.string().trim().min(1).max(80).safeParse(name);
  if (!p.success) return validationError();
  const { supabase, t } = await db();
  const { error } = await supabase.from("expense_categories").insert({ name: p.data });
  if (error) return { ok: false, error: translateError(error, t) };
  refresh("/settings", "/expenses");
  return { ok: true, data: null };
}

export async function saveSettings(input: unknown): Promise<ActionResult<null>> {
  const p = settingsSchema.safeParse(input);
  if (!p.success) return validationError();
  const { supabase, t, user } = await db();
  if (!user) return { ok: false, error: t.errors.not_authenticated };
  const { error } = await supabase.from("business_settings").update(p.data).eq("owner_id", user.id);
  if (error) return { ok: false, error: translateError(error, t) };
  refresh("/settings");
  return { ok: true, data: null };
}

export async function setValuationMethod(method: string) {
  if (method !== "CUMP" && method !== "FIFO") return validationError();
  return callRpc<null>("set_valuation_method", { p_method: method }, ["/settings", "/stock"]);
}

// ------------------------------------------------------------------ purchases & stock
export async function createPurchase(input: unknown) {
  const p = purchaseSchema.safeParse(input);
  if (!p.success) return validationError();
  const d = p.data;
  return callRpc<string>(
    "create_purchase",
    {
      p_supplier_id: d.supplier_id,
      p_purchase_date: d.purchase_date,
      p_items: d.items,
      p_notes: d.notes,
      p_paid: d.paid,
      p_payment_method: d.paid ? d.payment_method : null,
      p_update_prices: d.update_prices,
      p_idempotency_key: d.idempotency_key,
    },
    ["/purchases", "/stock", "/dashboard", "/products", "/suppliers", "/cash"],
  );
}

export async function payPurchase(id: string, method: string, date: string) {
  if (!uuid.safeParse(id).success || !isoDate.safeParse(date).success) return validationError();
  return callRpc<null>("pay_purchase", { p_purchase_id: id, p_method: method, p_date: date }, ["/purchases", "/cash", "/suppliers"]);
}

export async function cancelPurchase(id: string, reason: string) {
  if (!uuid.safeParse(id).success || !reasonSchema.safeParse(reason).success) return validationError();
  return callRpc<null>("cancel_purchase", { p_purchase_id: id, p_reason: reason }, ["/purchases", "/stock", "/cash", "/dashboard"]);
}

export async function adjustStock(input: unknown) {
  const p = adjustmentSchema.safeParse(input);
  if (!p.success) return validationError();
  const d = p.data;
  return callRpc<string>(
    "adjust_stock",
    { p_product_id: d.product_id, p_type: d.type, p_quantity_kg: d.quantity_kg, p_date: d.movement_date, p_notes: d.notes, p_unit_cost: d.unit_cost },
    ["/stock", "/dashboard", "/products"],
  );
}

// ------------------------------------------------------------------ sales, deliveries, invoices
const salesPaths = ["/sales", "/deliveries", "/invoices", "/stock", "/dashboard", "/customers", "/receivables", "/payments"];

export async function createOrder(input: unknown) {
  const p = orderSchema.safeParse(input);
  if (!p.success) return validationError();
  const d = p.data;
  return callRpc<{ order_id: string; delivery_id: string | null; invoice_id: string | null }>(
    "create_order",
    {
      p_customer_id: d.customer_id,
      p_order_date: d.order_date,
      p_items: d.items,
      p_discount: d.discount,
      p_notes: d.notes,
      p_deliver_now: d.deliver_now,
      p_idempotency_key: d.idempotency_key,
    },
    salesPaths,
  );
}

export async function updateOrder(id: string, input: unknown) {
  const p = orderSchema.omit({ customer_id: true, deliver_now: true, idempotency_key: true }).safeParse(input);
  if (!uuid.safeParse(id).success || !p.success) return validationError();
  const d = p.data;
  return callRpc<string>(
    "update_order",
    { p_order_id: id, p_order_date: d.order_date, p_items: d.items, p_discount: d.discount, p_notes: d.notes },
    salesPaths,
  );
}

export async function cancelOrder(id: string, reason: string) {
  if (!uuid.safeParse(id).success || !reasonSchema.safeParse(reason).success) return validationError();
  return callRpc<null>("cancel_order", { p_order_id: id, p_reason: reason }, salesPaths);
}

export async function confirmDelivery(orderId: string, date: string, notes?: string) {
  if (!uuid.safeParse(orderId).success || !isoDate.safeParse(date).success) return validationError();
  return callRpc<{ delivery_id: string; invoice_id: string | null }>(
    "confirm_delivery",
    { p_order_id: orderId, p_delivery_date: date, p_notes: notes ?? null },
    salesPaths,
  );
}

export async function cancelDelivery(id: string, reason: string) {
  if (!uuid.safeParse(id).success || !reasonSchema.safeParse(reason).success) return validationError();
  return callRpc<null>("cancel_delivery", { p_delivery_id: id, p_reason: reason }, salesPaths);
}

export async function issueInvoice(orderId: string) {
  if (!uuid.safeParse(orderId).success) return validationError();
  return callRpc<string>("issue_invoice", { p_order_id: orderId }, salesPaths);
}

export async function cancelInvoice(id: string, reason: string) {
  if (!uuid.safeParse(id).success || !reasonSchema.safeParse(reason).success) return validationError();
  return callRpc<null>("cancel_invoice", { p_invoice_id: id, p_reason: reason }, salesPaths);
}

// ------------------------------------------------------------------ payments
export async function recordPayment(input: unknown) {
  const p = paymentSchema.safeParse(input);
  if (!p.success) return validationError();
  const d = p.data;
  return callRpc<string>(
    "record_payment",
    {
      p_customer_id: d.customer_id,
      p_invoice_ids: d.invoice_ids,
      p_amount: d.amount,
      p_method: d.method,
      p_payment_date: d.payment_date,
      p_external_reference: d.external_reference,
      p_notes: d.notes,
      p_idempotency_key: d.idempotency_key,
    },
    salesPaths.concat("/cash"),
  );
}

export async function reversePayment(id: string, reason: string) {
  if (!uuid.safeParse(id).success || !reasonSchema.safeParse(reason).success) return validationError();
  return callRpc<null>("reverse_payment", { p_payment_id: id, p_reason: reason }, salesPaths.concat("/cash"));
}

// ------------------------------------------------------------------ expenses & cash
export async function createExpense(input: unknown) {
  const p = expenseSchema.safeParse(input);
  if (!p.success) return validationError();
  const d = p.data;
  return callRpc<string>(
    "create_expense",
    {
      p_category_id: d.category_id, p_expense_date: d.expense_date, p_amount: d.amount,
      p_payment_method: d.payment_method, p_description: d.description, p_notes: d.notes,
    },
    ["/expenses", "/cash", "/dashboard"],
  );
}

export async function cancelExpense(id: string, reason: string) {
  if (!uuid.safeParse(id).success || !reasonSchema.safeParse(reason).success) return validationError();
  return callRpc<null>("cancel_expense", { p_expense_id: id, p_reason: reason }, ["/expenses", "/cash", "/dashboard"]);
}

export async function recordCashMovement(input: unknown) {
  const p = cashMovementSchema.safeParse(input);
  if (!p.success) return validationError();
  const d = p.data;
  return callRpc<string>(
    "record_cash_movement",
    { p_date: d.movement_date, p_account: d.account, p_direction: d.direction, p_amount: d.amount, p_kind: d.kind, p_description: d.description },
    ["/cash", "/dashboard"],
  );
}

export async function saveDailyClosing(date: string, notes: string) {
  if (!isoDate.safeParse(date).success) return validationError();
  return callRpc<string>("save_daily_closing", { p_date: date, p_notes: notes || null }, ["/cash"]);
}

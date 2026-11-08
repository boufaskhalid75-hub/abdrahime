import { z } from "zod";

/** Validation messages are dictionary keys of `t.validation`. */
const text = (max: number) => z.string().trim().max(max, "tooLong");
/** Optional text: "", null or undefined all become null. Idempotent, because the client sends
 *  already-parsed values that the server action validates again with the same schema. */
const optText = (max: number) =>
  z.union([z.string().trim().max(max, "tooLong"), z.null(), z.undefined()]).transform((v) => (v ? v : null));
const optEmail = (max: number) =>
  z.union([z.literal(""), z.string().trim().email("email").max(max, "tooLong"), z.null(), z.undefined()]).transform((v) => (v ? v : null));
const num = z.coerce.number({ message: "required" });
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "required");
const method = z.enum(["cash", "bank_transfer", "other"]);

export const productSchema = z.object({
  name: text(120).min(1, "required"),
  reference: optText(40),
  category: optText(80),
  purchase_price: num.min(0, "nonNegative"),
  sale_price: num.min(0, "nonNegative"),
  min_stock_kg: num.min(0, "nonNegative"),
  description: optText(1000),
});
export type ProductInput = z.input<typeof productSchema>;

export const supplierSchema = z.object({
  name: text(160).min(1, "required"),
  contact_name: optText(120),
  phone: optText(40),
  address: optText(300),
  email: optEmail(160),
  notes: optText(1000),
});
export type SupplierInput = z.input<typeof supplierSchema>;

export const customerSchema = z.object({
  name: text(160).min(1, "required"),
  contact_name: optText(120),
  phone: optText(40),
  address: optText(300),
  notes: optText(1000),
});
export type CustomerInput = z.input<typeof customerSchema>;

const line = z.object({
  product_id: z.string().uuid("required"),
  quantity_kg: num.gt(0, "positive"),
  unit_price: num.min(0, "nonNegative"),
});

export const purchaseSchema = z.object({
  supplier_id: z.string().uuid("required"),
  purchase_date: isoDate,
  items: z.array(line).min(1, "required"),
  paid: z.boolean(),
  payment_method: method,
  update_prices: z.boolean(),
  notes: optText(1000),
  idempotency_key: z.string().uuid(),
});
export type PurchaseInput = z.input<typeof purchaseSchema>;

export const orderSchema = z.object({
  customer_id: z.string().uuid("required"),
  order_date: isoDate,
  items: z.array(line).min(1, "required"),
  discount: num.min(0, "nonNegative"),
  deliver_now: z.boolean(),
  notes: optText(1000),
  idempotency_key: z.string().uuid(),
});
export type OrderInput = z.input<typeof orderSchema>;

export const paymentSchema = z.object({
  customer_id: z.string().uuid("required"),
  invoice_ids: z.array(z.string().uuid()).min(1, "required"),
  amount: num.gt(0, "positive"),
  method,
  payment_date: isoDate,
  external_reference: optText(120),
  notes: optText(1000),
  idempotency_key: z.string().uuid(),
});
export type PaymentInput = z.input<typeof paymentSchema>;

export const expenseSchema = z.object({
  category_id: z.string().uuid("required"),
  expense_date: isoDate,
  amount: num.gt(0, "positive"),
  payment_method: method,
  description: text(300).min(1, "required"),
  notes: optText(1000),
});
export type ExpenseInput = z.input<typeof expenseSchema>;

export const cashMovementSchema = z.object({
  movement_date: isoDate,
  account: z.enum(["cash", "bank", "other"]),
  direction: z.enum(["in", "out"]),
  amount: num.gt(0, "positive"),
  kind: z.enum(["opening_balance", "manual"]),
  description: text(300).min(1, "required"),
});
export type CashMovementInput = z.input<typeof cashMovementSchema>;

export const adjustmentSchema = z.object({
  product_id: z.string().uuid("required"),
  type: z.enum(["damage_out", "adjustment_in", "adjustment_out"]),
  quantity_kg: num.gt(0, "positive"),
  movement_date: isoDate,
  notes: text(500).min(1, "required"),
  unit_cost: z.union([z.literal(""), z.null(), z.undefined(), num.min(0, "nonNegative")]).transform((v) => (v === "" || v === undefined || v === null ? null : v)),
});
export type AdjustmentInput = z.input<typeof adjustmentSchema>;

const prefix = z.string().trim().regex(/^[A-Z0-9]{1,8}$/, "prefix");
export const settingsSchema = z.object({
  business_name: text(160).min(1, "required"),
  address: optText(300),
  city: optText(80),
  phone: optText(40),
  email: optEmail(160),
  ice: optText(40),
  rc: optText(40),
  if_number: optText(40),
  patente: optText(40),
  logo_url: z.union([z.literal(""), z.string().trim().url("required").max(500), z.null(), z.undefined()]).transform((v) => (v ? v : null)),
  invoice_footer: optText(500),
  invoice_prefix: prefix,
  order_prefix: prefix,
  purchase_prefix: prefix,
  payment_prefix: prefix,
  auto_invoice_on_delivery: z.boolean(),
  default_purchase_paid: z.boolean(),
  low_stock_alerts: z.boolean(),
});
export type SettingsInput = z.input<typeof settingsSchema>;

export const reasonSchema = z.string().trim().min(1, "required").max(500, "tooLong");

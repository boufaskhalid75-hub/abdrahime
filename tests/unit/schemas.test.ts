import { describe, expect, it } from "vitest";
import {
  adjustmentSchema, cashMovementSchema, customerSchema, expenseSchema, productSchema, settingsSchema, supplierSchema,
} from "@/lib/schemas";

/**
 * Forms validate on the client and the server action validates AGAIN with the same schema,
 * receiving the client's parsed output. Every schema must therefore accept its own output.
 */
const cases: [string, { safeParse: (v: unknown) => { success: boolean; data?: unknown } }, Record<string, unknown>][] = [
  ["product", productSchema, { name: "P", reference: "", category: "", purchase_price: "20", sale_price: "26", min_stock_kg: "0", description: "" }],
  ["supplier", supplierSchema, { name: "S", contact_name: "", phone: "", address: "", email: "", notes: "" }],
  ["customer", customerSchema, { name: "C", contact_name: "", phone: "", address: "", notes: "" }],
  ["expense", expenseSchema, { category_id: "8f2c1d3e-1b2a-4c5d-9e8f-0a1b2c3d4e5f", expense_date: "2026-11-08", amount: "10", payment_method: "cash", description: "x", notes: "" }],
  ["cash", cashMovementSchema, { movement_date: "2026-11-08", account: "cash", direction: "in", amount: "10", kind: "manual", description: "x" }],
  ["adjustment", adjustmentSchema, { product_id: "8f2c1d3e-1b2a-4c5d-9e8f-0a1b2c3d4e5f", type: "damage_out", quantity_kg: "1", movement_date: "2026-11-08", notes: "x", unit_cost: "" }],
  ["settings", settingsSchema, { business_name: "B", address: "", city: "", phone: "", email: "", ice: "", rc: "", if_number: "", patente: "", logo_url: "",
    invoice_footer: "", invoice_prefix: "FAC", order_prefix: "VTE", purchase_prefix: "ACH", payment_prefix: "ENC",
    auto_invoice_on_delivery: true, default_purchase_paid: false, low_stock_alerts: true }],
];

describe("schemas are idempotent (client output re-validated on the server)", () => {
  for (const [name, schema, raw] of cases) {
    it(name, () => {
      const first = schema.safeParse(raw);
      expect(first.success).toBe(true);
      const second = schema.safeParse(first.data);
      expect(second.success).toBe(true);
      expect(second.data).toEqual(first.data);
    });
  }
  it("still rejects invalid values", () => {
    expect(productSchema.safeParse({ name: "", purchase_price: 1, sale_price: 1, min_stock_kg: 0 }).success).toBe(false);
    expect(supplierSchema.safeParse({ name: "S", email: "not-an-email" }).success).toBe(false);
    expect(productSchema.safeParse({ name: "P", purchase_price: -1, sale_price: 1, min_stock_kg: 0 }).success).toBe(false);
  });
});

import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { routeContext, unauthorized } from "@/lib/api";
import { today } from "@/lib/dates";

/** Full data export (one sheet per table). Uses the owner's session: RLS limits it to their data. */
const TABLES = [
  "business_settings", "products", "product_price_history", "suppliers", "customers", "customer_product_prices",
  "purchases", "purchase_items", "stock_lots", "stock_movements", "stock_lot_allocations", "orders", "order_items",
  "deliveries", "invoices", "invoice_items", "payments", "payment_allocations", "expense_categories", "expenses",
  "cash_movements", "daily_closings", "audit_logs",
] as const;

export async function GET() {
  const { supabase, user } = await routeContext();
  if (!user) return unauthorized();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Volaille Manager";
  for (const table of TABLES) {
    const ws = wb.addWorksheet(table.slice(0, 31));
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from(table).select("*").range(from, from + 999);
      if (error) return NextResponse.json({ error: "export_failed", table }, { status: 500 });
      rows.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    if (!rows.length) continue;
    const keys = Object.keys(rows[0]);
    ws.addRow(keys).font = { bold: true };
    rows.forEach((r) => ws.addRow(keys.map((k) => (r[k] !== null && typeof r[k] === "object" ? JSON.stringify(r[k]) : r[k]))));
  }
  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="volaille-manager-sauvegarde-${today()}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { categoryLabel } from "@/lib/labels";

export const REPORT_TABS = ["sales", "profitability", "products", "customers", "suppliers", "inventory", "receivables", "payments", "expenses"] as const;
export type ReportTab = (typeof REPORT_TABS)[number];
export type ColType = "text" | "money" | "kg" | "int" | "date" | "pct";
export type Column = { key: string; label: string; type: ColType };
export type Report = { title: string; columns: Column[]; rows: Record<string, string | number | null>[]; totals?: Record<string, number> };

const sum = (rows: Record<string, unknown>[], k: string) => rows.reduce((a, r) => a + Number(r[k] ?? 0), 0);
function totalsFor(rows: Record<string, unknown>[], cols: Column[]) {
  return Object.fromEntries(cols.filter((c) => c.type === "money" || c.type === "kg" || c.type === "int").map((c) => [c.key, sum(rows, c.key)]));
}

/** One builder for the report page, the PDF export and the Excel export: identical figures everywhere. */
export async function buildReport(
  supabase: SupabaseClient, t: Dictionary, tab: ReportTab, from: string, to: string, granularity: "day" | "week" | "month" = "day",
): Promise<Report> {
  const L = t.reports.tabs;
  switch (tab) {
    case "sales":
    case "profitability": {
      const { data } = await supabase.rpc("sales_series", { p_from: from, p_to: to, p_granularity: granularity });
      const rows = (data ?? []) as Record<string, number | string>[];
      const columns: Column[] = tab === "sales"
        ? [
            { key: "period_start", label: t.reports.periodStart, type: "date" },
            { key: "invoices_count", label: t.reports.invoicesCount, type: "int" },
            { key: "revenue", label: t.dashboard.revenue, type: "money" },
            { key: "collections", label: t.dashboard.collections, type: "money" },
            { key: "purchases", label: t.dashboard.purchases, type: "money" },
          ]
        : [
            { key: "period_start", label: t.reports.periodStart, type: "date" },
            { key: "revenue", label: t.dashboard.revenue, type: "money" },
            { key: "cogs", label: t.dashboard.cogs, type: "money" },
            { key: "gross_margin", label: t.dashboard.margin, type: "money" },
            { key: "expenses", label: t.dashboard.expenses, type: "money" },
            { key: "stock_losses", label: t.dashboard.stockLosses, type: "money" },
            { key: "net_result", label: t.dashboard.netResult, type: "money" },
          ];
      return { title: L[tab], columns, rows, totals: totalsFor(rows, columns) };
    }
    case "products": {
      const { data } = await supabase.rpc("product_performance", { p_from: from, p_to: to });
      const rows = ((data ?? []) as Record<string, number | string>[]).map((r) => ({
        ...r, margin_rate: Number(r.revenue) > 0 ? Number(r.gross_margin) / Number(r.revenue) : 0,
      }));
      const columns: Column[] = [
        { key: "product_name", label: t.common.product, type: "text" },
        { key: "quantity_kg", label: t.stock.sold, type: "kg" },
        { key: "revenue", label: t.dashboard.revenue, type: "money" },
        { key: "cogs", label: t.dashboard.cogs, type: "money" },
        { key: "gross_margin", label: t.dashboard.margin, type: "money" },
        { key: "margin_rate", label: t.reports.marginRate, type: "pct" },
        { key: "purchased_kg", label: t.stock.purchased, type: "kg" },
        { key: "purchased_amount", label: t.dashboard.purchases, type: "money" },
      ];
      return { title: L.products, columns, rows, totals: totalsFor(rows, columns) };
    }
    case "customers": {
      const { data } = await supabase.rpc("customer_performance", { p_from: from, p_to: to });
      const rows = (data ?? []) as Record<string, number | string>[];
      const columns: Column[] = [
        { key: "customer_name", label: t.common.customer, type: "text" },
        { key: "invoices_count", label: t.reports.invoicesCount, type: "int" },
        { key: "quantity_kg", label: t.common.quantity, type: "kg" },
        { key: "revenue", label: t.dashboard.revenue, type: "money" },
        { key: "gross_margin", label: t.dashboard.margin, type: "money" },
        { key: "collected", label: t.dashboard.collections, type: "money" },
        { key: "outstanding", label: t.receivables.outstanding, type: "money" },
        { key: "last_invoice_date", label: t.customers.lastTransaction, type: "date" },
      ];
      return { title: L.customers, columns, rows, totals: totalsFor(rows, columns) };
    }
    case "suppliers": {
      const { data } = await supabase.rpc("supplier_performance", { p_from: from, p_to: to });
      const rows = (data ?? []) as Record<string, number | string>[];
      const columns: Column[] = [
        { key: "supplier_name", label: t.common.supplier, type: "text" },
        { key: "purchases_count", label: t.suppliers.purchasesCount, type: "int" },
        { key: "quantity_kg", label: t.common.quantity, type: "kg" },
        { key: "amount", label: t.suppliers.totalPurchases, type: "money" },
        { key: "unpaid_amount", label: t.suppliers.unpaid, type: "money" },
        { key: "last_purchase_date", label: t.suppliers.lastPurchase, type: "date" },
      ];
      return { title: L.suppliers, columns, rows, totals: totalsFor(rows, columns) };
    }
    case "inventory": {
      const { data } = await supabase.from("v_product_stock").select("*").order("name");
      const rows = (data ?? []) as Record<string, number | string>[];
      const columns: Column[] = [
        { key: "name", label: t.common.product, type: "text" },
        { key: "stock_kg", label: t.stock.available, type: "kg" },
        { key: "min_stock_kg", label: t.stock.minStock, type: "kg" },
        { key: "purchased_kg", label: t.stock.purchased, type: "kg" },
        { key: "sold_kg", label: t.stock.sold, type: "kg" },
        { key: "damaged_kg", label: t.stock.damaged, type: "kg" },
        { key: "avg_cost", label: t.stock.avgCost, type: "money" },
        { key: "stock_value", label: t.stock.value, type: "money" },
      ];
      const totals = totalsFor(rows, columns);
      delete totals.avg_cost;
      delete totals.min_stock_kg;
      return { title: L.inventory, columns, rows, totals };
    }
    case "receivables": {
      const { data } = await supabase.from("v_invoice_balances").select("*").eq("status", "unpaid").lte("invoice_date", to).order("invoice_date");
      const rows = (data ?? []) as Record<string, number | string>[];
      const columns: Column[] = [
        { key: "invoice_number", label: t.invoices.number, type: "text" },
        { key: "invoice_date", label: t.common.date, type: "date" },
        { key: "customer_name", label: t.common.customer, type: "text" },
        { key: "outstanding_amount", label: t.receivables.outstanding, type: "money" },
        { key: "age_days", label: `${t.invoices.age} (${t.invoices.days})`, type: "int" },
      ];
      const totals = totalsFor(rows, columns);
      delete totals.age_days;
      return { title: L.receivables, columns, rows, totals };
    }
    case "payments": {
      const { data } = await supabase.from("payments").select("reference, payment_date, paid_at, amount, method, status, external_reference, customers(name)")
        .gte("payment_date", from).lte("payment_date", to).order("payment_date").order("paid_at");
      const rows = (data ?? []).map((p) => ({
        reference: p.reference, payment_date: p.payment_date, customer: (p.customers as unknown as { name: string } | null)?.name ?? "",
        method: t.methods[p.method as "cash"], status: t.payments.status[p.status as "active"], external_reference: p.external_reference,
        amount: p.status === "active" ? Number(p.amount) : 0,
      }));
      const columns: Column[] = [
        { key: "payment_date", label: t.common.date, type: "date" },
        { key: "reference", label: t.common.reference, type: "text" },
        { key: "customer", label: t.common.customer, type: "text" },
        { key: "method", label: t.common.method, type: "text" },
        { key: "external_reference", label: t.payments.externalRef, type: "text" },
        { key: "status", label: t.common.status, type: "text" },
        { key: "amount", label: t.common.amount, type: "money" },
      ];
      return { title: L.payments, columns, rows, totals: totalsFor(rows, columns) };
    }
    case "expenses": {
      const { data } = await supabase.from("expenses").select("expense_date, amount, payment_method, description, status, expense_categories(code, name)")
        .eq("status", "active").gte("expense_date", from).lte("expense_date", to).order("expense_date");
      const rows = (data ?? []).map((e) => ({
        expense_date: e.expense_date, category: categoryLabel(e.expense_categories as unknown as { code: string | null; name: string }, t),
        description: e.description, method: t.methods[e.payment_method as "cash"], amount: Number(e.amount),
      }));
      const columns: Column[] = [
        { key: "expense_date", label: t.common.date, type: "date" },
        { key: "category", label: t.expenses.category, type: "text" },
        { key: "description", label: t.common.description, type: "text" },
        { key: "method", label: t.common.method, type: "text" },
        { key: "amount", label: t.common.amount, type: "money" },
      ];
      return { title: L.expenses, columns, rows, totals: totalsFor(rows, columns) };
    }
  }
}

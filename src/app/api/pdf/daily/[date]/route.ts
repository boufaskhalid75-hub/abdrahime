import { createElement } from "react";
import { NextResponse } from "next/server";
import { ReportPdf } from "@/lib/pdf/documents";
import { pdfResponse, pdfSafe, routeContext, unauthorized } from "@/lib/api";
import { isIsoDate } from "@/lib/dates";

export async function GET(_: Request, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isIsoDate(date)) return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  const { supabase, user, t, f } = await routeContext();
  if (!user) return unauthorized();
  const [{ data: s }, { data: settings }] = await Promise.all([
    supabase.rpc("period_summary", { p_from: date, p_to: date }),
    supabase.from("business_settings").select("*").maybeSingle(),
  ]);
  const cash = (s?.cash_balance ?? {}) as Record<string, number>;
  const summary: [string, string][] = [
    [t.closing.totalPurchases, f.money(s?.purchases_total)],
    [t.closing.totalSales, f.money(s?.revenue)],
    [t.closing.deliveries, `${f.int(s?.deliveries_count)} (${f.kg(s?.delivered_kg)})`],
    [t.closing.invoices, f.int(s?.invoices_count)],
    [t.closing.collected, f.money(s?.collections_total)],
    [`  dont ${t.methods.cash.toLowerCase()}`, f.money(s?.collections_cash)],
    [`  dont ${t.methods.bank_transfer.toLowerCase()}`, f.money(s?.collections_bank)],
    [t.closing.unpaidToday, f.money(s?.period_unpaid_amount)],
    [t.closing.expenses, f.money(s?.expenses)],
    [t.dashboard.cogs, f.money(s?.cogs)],
    [t.dashboard.grossMargin, f.money(s?.gross_margin)],
    [t.dashboard.netResult, f.money(s?.net_result)],
    [`${t.closing.cashBalance} — ${t.accounts.cash}`, f.money(cash.cash)],
    [`${t.closing.cashBalance} — ${t.accounts.bank}`, f.money(cash.bank)],
    [t.closing.stockRemaining, `${f.kg(s?.stock_kg)} — ${f.money(s?.stock_value)}`],
  ].map(([a, b]) => [a, pdfSafe(b)] as [string, string]);
  const doc = createElement(ReportPdf, { b: settings ?? {}, title: "RAPPORT JOURNALIER", subtitle: f.dateLong(date), summary, cols: [], rows: [] });
  return pdfResponse(doc, `rapport-journalier-${date}.pdf`);
}

import type { Metadata } from "next";
import { Download, Info } from "lucide-react";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/shared/print-button";
import { ClosingForm, DatePicker } from "./closing-form";
import { isIsoDate, today } from "@/lib/dates";

export const metadata: Metadata = { title: "Clôture journalière" };

export default async function ClosingPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { supabase, t, f } = await getContext();
  const sp = await searchParams;
  const date = isIsoDate(sp.date) ? sp.date : today();
  const [{ data: s }, { data: closing }] = await Promise.all([
    supabase.rpc("period_summary", { p_from: date, p_to: date }),
    supabase.from("daily_closings").select("*").eq("closing_date", date).maybeSingle(),
  ]);
  const cash = (s?.cash_balance ?? {}) as Record<string, number>;
  const rows: [string, string, string?][] = [
    [t.closing.totalPurchases, f.money(s?.purchases_total), `${f.int(s?.purchases_count)} · ${f.kg(s?.purchases_kg)}`],
    [t.closing.totalSales, f.money(s?.revenue), `${f.int(s?.invoices_count)} ${t.invoices.title.toLowerCase()}`],
    [t.closing.deliveries, f.int(s?.deliveries_count), f.kg(s?.delivered_kg)],
    [t.closing.invoices, f.int(s?.invoices_count)],
    [t.closing.collected, f.money(s?.collections_total), `${t.methods.cash}: ${f.amount(s?.collections_cash)} · ${t.methods.bank_transfer}: ${f.amount(s?.collections_bank)} · ${t.methods.other}: ${f.amount(s?.collections_other)}`],
    [t.closing.unpaidToday, f.money(s?.period_unpaid_amount), `${f.int(s?.period_unpaid_count)}`],
    [t.closing.expenses, f.money(s?.expenses)],
    [t.dashboard.grossMargin, f.money(s?.gross_margin), `${t.dashboard.cogs}: ${f.amount(s?.cogs)}`],
    [t.dashboard.netResult, f.money(s?.net_result), `${t.dashboard.stockLosses}: ${f.amount(s?.stock_losses)}`],
    [t.closing.cashBalance, f.money(Number(cash.cash ?? 0) + Number(cash.bank ?? 0) + Number(cash.other ?? 0)), `${t.accounts.cash}: ${f.amount(cash.cash)} · ${t.accounts.bank}: ${f.amount(cash.bank)}`],
    [t.closing.stockRemaining, f.kg(s?.stock_kg), f.money(s?.stock_value)],
  ];

  return (
    <>
      <PageHeader title={t.closing.title} subtitle={`${t.closing.subtitle} — ${f.dateLong(date)}`}
        actions={<>
          <DatePicker date={date} />
          <Button asChild variant="brand"><a href={`/api/pdf/daily/${date}`}><Download />{t.common.downloadPdf}</a></Button>
          <PrintButton />
        </>} />
      <p className="no-print mb-4 flex items-center gap-2 rounded-lg bg-brand-50 p-3 text-sm text-navy"><Info className="size-4 shrink-0" />{t.closing.notice}</p>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="print-area xl:col-span-2">
          <CardHeader><CardTitle>{t.closing.printTitle} — {f.date(date)}</CardTitle></CardHeader>
          <dl className="divide-y divide-line">
            {rows.map(([label, value, hint]) => (
              <div key={label} className="flex items-start justify-between gap-4 px-5 py-3">
                <dt><p className="text-sm font-medium">{label}</p>{hint && <p className="text-xs text-muted">{hint}</p>}</dt>
                <dd className="num ltr text-base font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="no-print">
          <CardHeader><CardTitle>{t.closing.save}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {closing && <p className="text-sm text-success">{t.closing.lastClosed}: {f.dateTime(closing.closed_at)}</p>}
            <ClosingForm date={date} notes={closing?.notes ?? ""} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

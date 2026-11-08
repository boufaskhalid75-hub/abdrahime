import Link from "next/link";
import type { Metadata } from "next";
import { Banknote, Landmark, CircleDollarSign, Wallet, ClipboardCheck, Info } from "lucide-react";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { Pager } from "@/components/shared/pager";
import { PeriodFilter } from "@/components/shared/period-filter";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { Button } from "@/components/ui/button";
import { CashMovementDialog } from "./cash-dialog";
import { pageRange } from "@/lib/query";
import { resolvePeriod, today } from "@/lib/dates";

export const metadata: Metadata = { title: "Caisse" };
type SP = { page?: string; period?: string; from?: string; to?: string; account?: string };
type Acc = "cash" | "bank" | "other";

export default async function CashPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { supabase, t, f } = await getContext();
  const sp = await searchParams;
  const period = resolvePeriod(sp, "last7");
  const { page, from, to } = pageRange(sp.page);
  let q = supabase.from("cash_movements").select("*", { count: "exact" })
    .gte("movement_date", period.from).lte("movement_date", period.to)
    .order("movement_date", { ascending: false }).order("created_at", { ascending: false }).range(from, to);
  if (sp.account) q = q.eq("account", sp.account);
  const [{ data: rows, count }, { data: now }, { data: per }, { data: daily }] = await Promise.all([
    q,
    supabase.rpc("period_summary", { p_from: today(), p_to: "2999-12-31" }),
    supabase.rpc("period_summary", { p_from: period.from, p_to: period.to }),
    supabase.from("cash_movements").select("movement_date, direction, amount, account").gte("movement_date", period.from).lte("movement_date", period.to),
  ]);
  const bal = (now?.cash_balance ?? {}) as Record<Acc, number>;
  const pc = (per?.cash_period ?? {}) as Record<Acc, { in: number; out: number }>;
  const total = Number(bal.cash ?? 0) + Number(bal.bank ?? 0) + Number(bal.other ?? 0);
  const days = new Map<string, { cin: number; cout: number; cashIn: number; bankIn: number }>();
  (daily ?? []).forEach((m) => {
    const d = days.get(m.movement_date) ?? { cin: 0, cout: 0, cashIn: 0, bankIn: 0 };
    if (m.direction === "in") { d.cin += Number(m.amount); if (m.account === "cash") d.cashIn += Number(m.amount); if (m.account === "bank") d.bankIn += Number(m.amount); }
    else d.cout += Number(m.amount);
    days.set(m.movement_date, d);
  });
  const dayRows = [...days.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <>
      <PageHeader title={t.cash.title} subtitle={t.cash.subtitle}
        actions={<>
          <CashMovementDialog today={today()} />
          <Button asChild><Link href="/cash/closing"><ClipboardCheck />{t.nav.closing}</Link></Button>
        </>} />
      <p className="mb-4 flex items-center gap-2 rounded-lg bg-brand-50 p-3 text-sm text-navy"><Info className="size-4 shrink-0" />{t.cash.notice}</p>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t.cash.balance} value={f.money(total)} icon={Wallet} tone="navy" />
        <StatCard label={t.accounts.cash} value={f.money(bal.cash)} icon={Banknote} tone="success" hint={`+${f.amount(pc.cash?.in)} / −${f.amount(pc.cash?.out)}`} />
        <StatCard label={t.accounts.bank} value={f.money(bal.bank)} icon={Landmark} tone="brand" hint={`+${f.amount(pc.bank?.in)} / −${f.amount(pc.bank?.out)}`} />
        <StatCard label={t.accounts.other} value={f.money(bal.other)} icon={CircleDollarSign} tone="brand" hint={`+${f.amount(pc.other?.in)} / −${f.amount(pc.other?.out)}`} />
      </div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <PeriodFilter preset={period.preset} from={period.from} to={period.to} />
        <FilterTabs basePath="/cash" param="account" current={sp.account ?? ""} searchParams={sp}
          items={[{ value: "", label: t.common.all }, ...(["cash", "bank", "other"] as const).map((a) => ({ value: a, label: t.accounts[a] }))]} />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          {rows?.length ? (
            <>
              <Table>
                <THead><TR><TH>{t.common.date}</TH><TH>{t.cash.kind}</TH><TH>{t.cash.account}</TH><TH>{t.common.description}</TH><TH className="text-end">{t.common.amount}</TH></TR></THead>
                <TBody>
                  {rows.map((m) => (
                    <TR key={m.id}>
                      <TD>{f.date(m.movement_date)}</TD>
                      <TD>{t.cash.sources[m.source_type as keyof typeof t.cash.sources]}</TD>
                      <TD>{t.accounts[m.account as Acc]}</TD>
                      <TD className="max-w-64 truncate text-muted">
                        {m.payment_id ? <Link href={`/payments/${m.payment_id}`} className="ltr text-brand hover:underline">{m.description}</Link>
                          : m.purchase_id ? <Link href={`/purchases/${m.purchase_id}`} className="ltr text-brand hover:underline">{m.description}</Link>
                          : m.description}
                      </TD>
                      <TD className={`num ltr text-end font-medium ${m.direction === "in" ? "text-success" : "text-danger"}`}>{m.direction === "in" ? "+" : "−"}{f.money(m.amount)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              <Pager page={page} count={count ?? 0} basePath="/cash" searchParams={sp} t={t} />
            </>
          ) : <EmptyState icon={Wallet} title={t.common.noResults} />}
        </Card>
        <Card>
          <CardHeader><CardTitle>{t.cash.daily}</CardTitle></CardHeader>
          <Table>
            <THead><TR><TH>{t.common.date}</TH><TH className="text-end">{t.cash.receipts}</TH><TH className="text-end">{t.cash.outflows}</TH></TR></THead>
            <TBody>
              {dayRows.map(([d, v]) => (
                <TR key={d}>
                  <TD><Link href={`/cash/closing?date=${d}`} className="text-brand hover:underline">{f.date(d)}</Link></TD>
                  <TD className="num text-end text-success">{f.amount(v.cin)}</TD>
                  <TD className="num text-end text-danger">{f.amount(v.cout)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      </div>
    </>
  );
}

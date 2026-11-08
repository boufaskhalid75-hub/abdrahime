import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Wallet, Banknote, Landmark, CircleDollarSign } from "lucide-react";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchBox } from "@/components/shared/search-box";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pager } from "@/components/shared/pager";
import { PeriodFilter } from "@/components/shared/period-filter";
import { pageRange, term } from "@/lib/query";
import { resolvePeriod } from "@/lib/dates";

export const metadata: Metadata = { title: "Encaissements" };
type SP = { q?: string; page?: string; period?: string; from?: string; to?: string };

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { supabase, t, f } = await getContext();
  const sp = await searchParams;
  const period = resolvePeriod(sp, "last7");
  const { page, from, to } = pageRange(sp.page);
  let q = supabase.from("payments").select("*, customers(name), payment_allocations(invoice_id)", { count: "exact" })
    .gte("payment_date", period.from).lte("payment_date", period.to)
    .order("paid_at", { ascending: false }).range(from, to);
  const s = term(sp.q);
  if (s) q = q.or(`reference.ilike.${s},external_reference.ilike.${s}`);
  const [{ data: rows, count }, { data: sum }] = await Promise.all([q, supabase.rpc("period_summary", { p_from: period.from, p_to: period.to })]);
  const newBtn = <Button asChild variant="success"><Link href="/payments/new"><Plus />{t.payments.new}</Link></Button>;

  return (
    <>
      <PageHeader title={t.payments.title} subtitle={t.payments.subtitle} actions={newBtn} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t.payments.title} value={f.money(sum?.collections_total)} icon={Wallet} tone="success" hint={`${f.int(sum?.payments_count)} ${t.common.count.toLowerCase()}`} />
        <StatCard label={t.methods.cash} value={f.money(sum?.collections_cash)} icon={Banknote} tone="navy" />
        <StatCard label={t.methods.bank_transfer} value={f.money(sum?.collections_bank)} icon={Landmark} tone="navy" />
        <StatCard label={t.methods.other} value={f.money(sum?.collections_other)} icon={CircleDollarSign} tone="navy" />
      </div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row"><SearchBox /><PeriodFilter preset={period.preset} from={period.from} to={period.to} /></div>
      <Card>
        {rows?.length ? (
          <>
            <Table>
              <THead><TR><TH>{t.common.date}</TH><TH>{t.payments.time}</TH><TH>{t.common.reference}</TH><TH>{t.common.customer}</TH><TH>{t.common.method}</TH><TH className="text-end">{t.payments.invoicesPaid}</TH><TH className="text-end">{t.common.amount}</TH><TH>{t.common.status}</TH></TR></THead>
              <TBody>
                {rows.map((p) => (
                  <TR key={p.id} className={p.status === "reversed" ? "opacity-60" : undefined}>
                    <TD>{f.date(p.payment_date)}</TD>
                    <TD className="num text-muted">{f.time(p.paid_at)}</TD>
                    <TD><Link href={`/payments/${p.id}`} className="ltr font-medium text-brand hover:underline">{p.reference}</Link></TD>
                    <TD>{(p.customers as { name: string } | null)?.name}</TD>
                    <TD>{t.methods[p.method as "cash"]}</TD>
                    <TD className="num text-end">{(p.payment_allocations as unknown[]).length}</TD>
                    <TD className="num text-end font-medium">{f.money(p.amount)}</TD>
                    <TD>{p.status === "active" ? <Badge tone="success">{t.payments.status.active}</Badge> : <Badge>{t.payments.status.reversed}</Badge>}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pager page={page} count={count ?? 0} basePath="/payments" searchParams={sp} t={t} />
          </>
        ) : <EmptyState icon={Wallet} title={t.payments.emptyTitle} text={t.payments.emptyText} action={newBtn} />}
      </Card>
    </>
  );
}

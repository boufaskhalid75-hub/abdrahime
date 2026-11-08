import Link from "next/link";
import type { Metadata } from "next";
import { AlertCircle, CalendarClock, FileText, Users } from "lucide-react";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Créances clients" };
const FILTERS = ["unpaid", "all", "recent", "d3", "d7", "d30"] as const;

export default async function ReceivablesPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { supabase, t, f } = await getContext();
  const sp = await searchParams;
  const filter = (FILTERS as readonly string[]).includes(sp.filter ?? "") ? sp.filter! : "unpaid";
  const [{ data: customers }, { data: unpaid }] = await Promise.all([
    supabase.from("v_customer_balances").select("*").order("outstanding", { ascending: false }).order("name"),
    supabase.from("v_invoice_balances").select("*").eq("status", "unpaid").order("invoice_date"),
  ]);
  const inv = unpaid ?? [];
  const minAge = { d3: 3, d7: 7, d30: 30 } as Record<string, number>;
  const filteredInv = inv.filter((i) => (filter === "recent" ? i.age_days <= 3 : minAge[filter] !== undefined ? i.age_days > minAge[filter] : true));
  const totalUnpaid = inv.reduce((a, i) => a + Number(i.outstanding_amount), 0);
  const debtors = (customers ?? []).filter((c) => Number(c.outstanding) > 0);
  const oldest = inv[0];
  const showCustomers = filter === "all" || filter === "unpaid";
  const custRows = filter === "all" ? customers ?? [] : debtors;

  return (
    <>
      <PageHeader title={t.receivables.title} subtitle={t.receivables.subtitle}
        actions={<Button asChild variant="success"><Link href="/payments/new">{t.payments.new}</Link></Button>} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t.receivables.totalUnpaid} value={f.money(totalUnpaid)} icon={AlertCircle} tone={totalUnpaid > 0 ? "warning" : "success"} />
        <StatCard label={t.receivables.unpaidCount} value={f.int(inv.length)} icon={FileText} tone="navy" />
        <StatCard label={t.receivables.customersWithDebt} value={f.int(debtors.length)} icon={Users} tone="navy" />
        <StatCard label={t.receivables.oldest} value={oldest ? f.date(oldest.invoice_date) : "—"} icon={CalendarClock} tone={oldest && oldest.age_days > 7 ? "danger" : "navy"}
          hint={oldest ? `${oldest.customer_name} · ${oldest.age_days} ${t.invoices.days}` : undefined} />
      </div>
      <div className="mb-4">
        <FilterTabs basePath="/receivables" param="filter" current={filter} searchParams={sp}
          items={FILTERS.map((x) => ({ value: x, label: t.receivables.filters[x] }))} />
      </div>
      {showCustomers ? (
        <Card>
          {custRows.length ? (
            <Table>
              <THead><TR><TH>{t.common.customer}</TH><TH className="text-end">{t.receivables.outstanding}</TH><TH className="text-end">{t.receivables.unpaidCount}</TH><TH>{t.receivables.oldest}</TH><TH>{t.customers.lastTransaction}</TH><TH className="text-end">{t.common.actions}</TH></TR></THead>
              <TBody>
                {custRows.map((c) => (
                  <TR key={c.id}>
                    <TD><Link href={`/customers/${c.id}`} className="font-medium hover:text-brand">{c.name}</Link></TD>
                    <TD className={`num text-end font-semibold ${Number(c.outstanding) > 0 ? "text-warning" : ""}`}>{f.money(c.outstanding)}</TD>
                    <TD className="num text-end">{f.int(c.unpaid_count)}</TD>
                    <TD>{f.date(c.oldest_unpaid_date)}</TD>
                    <TD className="text-muted">{f.date(c.last_payment_date)}</TD>
                    <TD className="text-end">
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="secondary"><Link href={`/customers/${c.id}/statement`}>{t.customers.statement}</Link></Button>
                        {Number(c.outstanding) > 0 && <Button asChild size="sm" variant="success"><Link href={`/payments/new?customer=${c.id}`}>{t.customers.collect}</Link></Button>}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : <EmptyState title={t.receivables.emptyTitle} text={t.receivables.emptyText} />}
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>{t.receivables.filters[filter as "d3"]}</CardTitle></CardHeader>
          {filteredInv.length ? (
            <Table>
              <THead><TR><TH>{t.invoices.number}</TH><TH>{t.common.date}</TH><TH>{t.common.customer}</TH><TH className="text-end">{t.receivables.outstanding}</TH><TH>{t.invoices.age}</TH><TH className="text-end">{t.common.actions}</TH></TR></THead>
              <TBody>
                {filteredInv.map((i) => (
                  <TR key={i.id}>
                    <TD><Link href={`/invoices/${i.id}`} className="ltr text-brand hover:underline">{i.invoice_number}</Link></TD>
                    <TD>{f.date(i.invoice_date)}</TD>
                    <TD><Link href={`/customers/${i.customer_id}`} className="hover:text-brand">{i.customer_name}</Link></TD>
                    <TD className="num text-end font-medium">{f.money(i.outstanding_amount)}</TD>
                    <TD><Badge tone={i.age_days > 30 ? "danger" : i.age_days > 7 ? "warning" : "neutral"}>{i.age_days} {t.invoices.days}</Badge></TD>
                    <TD className="text-end"><Button asChild size="sm" variant="success"><Link href={`/payments/new?customer=${i.customer_id}&invoice=${i.id}`}>{t.customers.collect}</Link></Button></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : <EmptyState title={t.receivables.emptyTitle} />}
        </Card>
      )}
    </>
  );
}

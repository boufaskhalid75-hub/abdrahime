import Link from "next/link";
import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchBox } from "@/components/shared/search-box";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { InvoiceStatus } from "@/components/shared/status-badge";
import { Pager } from "@/components/shared/pager";
import { PeriodFilter } from "@/components/shared/period-filter";
import { pageRange, term } from "@/lib/query";
import { resolvePeriod } from "@/lib/dates";

export const metadata: Metadata = { title: "Factures" };
type SP = { q?: string; status?: string; page?: string; period?: string; from?: string; to?: string };

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { supabase, t, f } = await getContext();
  const sp = await searchParams;
  const period = resolvePeriod(sp, "last30");
  const { page, from, to } = pageRange(sp.page);
  const status = sp.status ?? "";
  let q = supabase.from("v_invoice_balances").select("*", { count: "exact" })
    .order("invoice_date", { ascending: false }).order("invoice_number", { ascending: false }).range(from, to);
  if (status !== "unpaid") q = q.gte("invoice_date", period.from).lte("invoice_date", period.to);
  if (status) q = q.eq("status", status);
  const s = term(sp.q);
  if (s) q = q.or(`invoice_number.ilike.${s},customer_name.ilike.${s}`);
  const { data: rows, count } = await q;

  return (
    <>
      <PageHeader title={t.invoices.title} subtitle={t.invoices.subtitle} />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row"><SearchBox /><PeriodFilter preset={period.preset} from={period.from} to={period.to} /></div>
        <FilterTabs basePath="/invoices" param="status" current={status} searchParams={sp}
          items={[{ value: "", label: t.common.all }, { value: "unpaid", label: t.invoices.status.unpaid }, { value: "paid", label: t.invoices.status.paid }, { value: "cancelled", label: t.invoices.status.cancelled }]} />
      </div>
      <Card>
        {rows?.length ? (
          <>
            <Table>
              <THead><TR><TH>{t.invoices.number}</TH><TH>{t.common.date}</TH><TH>{t.common.customer}</TH><TH className="text-end">{t.common.total}</TH><TH className="text-end">{t.invoices.amountDue}</TH><TH>{t.common.status}</TH><TH>{t.invoices.age}</TH></TR></THead>
              <TBody>
                {rows.map((i) => (
                  <TR key={i.id}>
                    <TD><Link href={`/invoices/${i.id}`} className="ltr font-medium text-brand hover:underline">{i.invoice_number}</Link></TD>
                    <TD>{f.date(i.invoice_date)}</TD>
                    <TD><Link href={`/customers/${i.customer_id}`} className="hover:text-brand">{i.customer_name}</Link></TD>
                    <TD className="num text-end">{f.money(i.total_amount)}</TD>
                    <TD className="num text-end">{f.money(i.outstanding_amount)}</TD>
                    <TD><InvoiceStatus status={i.status} t={t} /></TD>
                    <TD className="num text-muted">{i.status === "unpaid" ? `${i.age_days} ${t.invoices.days}` : "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pager page={page} count={count ?? 0} basePath="/invoices" searchParams={sp} t={t} />
          </>
        ) : <EmptyState icon={FileText} title={t.invoices.emptyTitle} text={t.invoices.emptyText} />}
      </Card>
    </>
  );
}

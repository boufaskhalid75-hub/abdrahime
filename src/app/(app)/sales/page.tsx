import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Receipt } from "lucide-react";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchBox } from "@/components/shared/search-box";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { OrderStatus } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Pager } from "@/components/shared/pager";
import { PeriodFilter } from "@/components/shared/period-filter";
import { pageRange, term } from "@/lib/query";
import { resolvePeriod } from "@/lib/dates";

export const metadata: Metadata = { title: "Ventes" };
type SP = { q?: string; status?: string; page?: string; period?: string; from?: string; to?: string };

export default async function SalesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { supabase, t, f } = await getContext();
  const sp = await searchParams;
  const period = resolvePeriod(sp, "last7");
  const { page, from, to } = pageRange(sp.page);
  const status = sp.status ?? "";
  let q = supabase.from("orders").select("*, customers(name), invoices(id, invoice_number, status)", { count: "exact" })
    .order("order_date", { ascending: false }).order("created_at", { ascending: false }).range(from, to);
  if (status !== "confirmed") q = q.gte("order_date", period.from).lte("order_date", period.to);
  if (status) q = q.eq("status", status);
  const s = term(sp.q);
  if (s) q = q.ilike("reference", s);
  const { data: rows, count } = await q;
  const newBtn = <Button asChild><Link href="/sales/new"><Plus />{t.sales.new}</Link></Button>;

  return (
    <>
      <PageHeader title={t.sales.title} subtitle={t.sales.subtitle} actions={newBtn} />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row"><SearchBox /><PeriodFilter preset={period.preset} from={period.from} to={period.to} /></div>
        <FilterTabs basePath="/sales" param="status" current={status} searchParams={sp}
          items={[{ value: "", label: t.common.all }, { value: "confirmed", label: t.sales.status.confirmed }, { value: "delivered", label: t.sales.status.delivered }, { value: "cancelled", label: t.sales.status.cancelled }]} />
      </div>
      <Card>
        {rows?.length ? (
          <>
            <Table>
              <THead><TR><TH>{t.common.date}</TH><TH>{t.common.reference}</TH><TH>{t.common.customer}</TH><TH className="text-end">{t.common.total}</TH><TH>{t.common.status}</TH><TH>{t.sales.invoice}</TH></TR></THead>
              <TBody>
                {rows.map((o) => {
                  const inv = ((o.invoices ?? []) as { id: string; invoice_number: string; status: string }[]).find((i) => i.status !== "cancelled");
                  return (
                    <TR key={o.id}>
                      <TD>{f.date(o.order_date)}</TD>
                      <TD><Link href={`/sales/${o.id}`} className="ltr font-medium text-brand hover:underline">{o.reference}</Link></TD>
                      <TD>{(o.customers as { name: string } | null)?.name}</TD>
                      <TD className="num text-end">{f.money(o.total_amount)}</TD>
                      <TD><OrderStatus status={o.status} t={t} /></TD>
                      <TD>{inv ? <Link href={`/invoices/${inv.id}`} className="ltr text-brand hover:underline">{inv.invoice_number}</Link> : "—"}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            <Pager page={page} count={count ?? 0} basePath="/sales" searchParams={sp} t={t} />
          </>
        ) : <EmptyState icon={Receipt} title={t.sales.emptyTitle} text={t.sales.emptyText} action={newBtn} />}
      </Card>
    </>
  );
}

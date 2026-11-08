import Link from "next/link";
import type { Metadata } from "next";
import { PackageCheck } from "lucide-react";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { Pager } from "@/components/shared/pager";
import { PeriodFilter } from "@/components/shared/period-filter";
import { CancelDeliveryButton, DeliverButton } from "@/components/forms/order-actions";
import { InvoiceStatus } from "@/components/shared/status-badge";
import { pageRange } from "@/lib/query";
import { resolvePeriod, today } from "@/lib/dates";

export const metadata: Metadata = { title: "Livraisons" };
type SP = { tab?: string; page?: string; period?: string; from?: string; to?: string };
type Item = { quantity_kg: number; products: { name: string } | null };

export default async function DeliveriesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { supabase, t, f } = await getContext();
  const sp = await searchParams;
  const tab = sp.tab ?? "pending";
  const period = resolvePeriod(sp, "last7");
  const { page, from, to } = pageRange(sp.page);
  const { count: pendingCount } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "confirmed");
  const itemsText = (items: Item[]) => items.map((i) => `${i.products?.name ?? ""} ${f.kg(i.quantity_kg)}`).join(" · ");

  let body: React.ReactNode;
  if (tab === "pending") {
    const { data: rows, count } = await supabase.from("orders")
      .select("id, reference, order_date, total_amount, customers(name), order_items(quantity_kg, products(name))", { count: "exact" })
      .eq("status", "confirmed").order("order_date").range(from, to);
    body = rows?.length ? (
      <>
        <Table>
          <THead><TR><TH>{t.common.date}</TH><TH>{t.common.reference}</TH><TH>{t.common.customer}</TH><TH>{t.sales.step2}</TH><TH className="text-end">{t.common.total}</TH><TH className="text-end">{t.common.actions}</TH></TR></THead>
          <TBody>
            {rows.map((o) => (
              <TR key={o.id}>
                <TD>{f.date(o.order_date)}</TD>
                <TD><Link href={`/sales/${o.id}`} className="ltr text-brand hover:underline">{o.reference}</Link></TD>
                <TD>{(o.customers as unknown as { name: string } | null)?.name}</TD>
                <TD className="max-w-80 truncate text-muted">{itemsText(o.order_items as unknown as Item[])}</TD>
                <TD className="num text-end">{f.money(o.total_amount)}</TD>
                <TD className="text-end"><DeliverButton orderId={o.id} today={today()} size="sm" /></TD>
              </TR>
            ))}
          </TBody>
        </Table>
        <Pager page={page} count={count ?? 0} basePath="/deliveries" searchParams={sp} t={t} />
      </>
    ) : <EmptyState icon={PackageCheck} title={t.deliveries.emptyPending} />;
  } else {
    const status = tab === "cancelled" ? "cancelled" : "delivered";
    const { data: rows, count } = await supabase.from("deliveries")
      .select("id, delivery_date, status, cogs_amount, cancel_reason, orders(id, reference, total_amount, order_items(quantity_kg, products(name)), invoices(id, invoice_number, status)), customers(name)", { count: "exact" })
      .eq("status", status).gte("delivery_date", period.from).lte("delivery_date", period.to)
      .order("delivery_date", { ascending: false }).order("delivered_at", { ascending: false }).range(from, to);
    type O = { id: string; reference: string; total_amount: number; order_items: Item[]; invoices: { id: string; invoice_number: string; status: string }[] };
    body = rows?.length ? (
      <>
        <Table>
          <THead><TR><TH>{t.deliveries.deliveryDate}</TH><TH>{t.common.reference}</TH><TH>{t.common.customer}</TH><TH>{t.sales.step2}</TH><TH className="text-end">{t.common.total}</TH><TH>{t.sales.invoice}</TH><TH className="text-end">{t.common.actions}</TH></TR></THead>
          <TBody>
            {rows.map((d) => {
              const o = d.orders as unknown as O;
              const inv = o.invoices.find((i) => i.status !== "cancelled");
              return (
                <TR key={d.id}>
                  <TD>{f.date(d.delivery_date)}</TD>
                  <TD><Link href={`/sales/${o.id}`} className="ltr text-brand hover:underline">{o.reference}</Link></TD>
                  <TD>{(d.customers as unknown as { name: string } | null)?.name}</TD>
                  <TD className="max-w-80 truncate text-muted">{itemsText(o.order_items)}{d.cancel_reason && ` — ${d.cancel_reason}`}</TD>
                  <TD className="num text-end">{f.money(o.total_amount)}</TD>
                  <TD>{inv ? <span className="flex items-center gap-2"><Link href={`/invoices/${inv.id}`} className="ltr text-brand hover:underline">{inv.invoice_number}</Link><InvoiceStatus status={inv.status} t={t} /></span> : "—"}</TD>
                  <TD className="text-end">{d.status === "delivered" && inv?.status !== "paid" && <CancelDeliveryButton deliveryId={d.id} size="sm" />}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
        <Pager page={page} count={count ?? 0} basePath="/deliveries" searchParams={sp} t={t} />
      </>
    ) : <EmptyState icon={PackageCheck} title={t.deliveries.emptyDone} />;
  }

  return (
    <>
      <PageHeader title={t.deliveries.title} subtitle={t.deliveries.subtitle} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs basePath="/deliveries" param="tab" current={tab} searchParams={sp}
          items={[{ value: "pending", label: t.deliveries.pending, count: pendingCount ?? 0 }, { value: "done", label: t.deliveries.done }, { value: "cancelled", label: t.deliveries.cancelledTab }]} />
        {tab !== "pending" && <PeriodFilter preset={period.preset} from={period.from} to={period.to} />}
      </div>
      <Card>{body}</Card>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { OrderStatus, InvoiceStatus } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { OrderActions } from "@/components/forms/order-actions";
import { today } from "@/lib/dates";

export default async function SalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, t, f } = await getContext();
  const { data: o } = await supabase.from("orders").select("*, customers(id, name, phone)").eq("id", id).maybeSingle();
  if (!o) notFound();
  const [{ data: items }, { data: deliveries }, { data: invoices }] = await Promise.all([
    supabase.from("order_items").select("*, products(name)").eq("order_id", id),
    supabase.from("deliveries").select("*").eq("order_id", id).order("delivered_at", { ascending: false }),
    supabase.from("invoices").select("id, invoice_number, status, invoice_date, cancel_reason").eq("order_id", id).order("created_at", { ascending: false }),
  ]);
  const c = o.customers as { id: string; name: string; phone: string | null } | null;
  const active = (deliveries ?? []).find((d) => d.status === "delivered");
  const liveInvoice = (invoices ?? []).find((i) => i.status !== "cancelled");
  const cogs = (items ?? []).reduce((a, i) => a + Number(i.cost_total ?? 0), 0);
  const delivered = o.status === "delivered";

  return (
    <>
      <PageHeader title={`${t.sales.order} ${o.reference}`} subtitle={`${c?.name ?? ""} · ${f.date(o.order_date)}`}
        actions={<>
          <OrderStatus status={o.status} t={t} />
          <OrderActions order={{ id: o.id, status: o.status }} deliveryId={active?.id ?? null} invoiceId={liveInvoice?.id ?? null}
            invoicePaid={liveInvoice?.status === "paid"} today={today()} />
        </>} />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>{t.sales.step2}</CardTitle></CardHeader>
          <Table>
            <THead><TR>
              <TH>{t.common.product}</TH><TH className="text-end">{t.common.quantity}</TH><TH className="text-end">{t.common.unitPrice}</TH><TH className="text-end">{t.common.lineTotal}</TH>
              {delivered && <><TH className="text-end">{t.sales.cost}</TH><TH className="text-end">{t.sales.margin}</TH></>}
            </TR></THead>
            <TBody>
              {(items ?? []).map((it) => (
                <TR key={it.id}>
                  <TD>{(it.products as { name: string } | null)?.name}</TD>
                  <TD className="num text-end">{f.kg(it.quantity_kg)}</TD>
                  <TD className="num text-end">{f.money(it.unit_price)}</TD>
                  <TD className="num text-end font-medium">{f.money(it.line_total)}</TD>
                  {delivered && <><TD className="num text-end text-muted">{f.money(it.cost_total)}</TD><TD className="num text-end">{f.money(Number(it.line_total) - Number(it.cost_total ?? 0))}</TD></>}
                </TR>
              ))}
            </TBody>
          </Table>
          <CardContent className="space-y-1 border-t border-line text-sm">
            <div className="flex justify-between"><span className="text-muted">{t.common.subtotal}</span><span className="num ltr">{f.money(o.subtotal)}</span></div>
            {Number(o.discount_amount) > 0 && <div className="flex justify-between"><span className="text-muted">{t.common.discount}</span><span className="num ltr">− {f.money(o.discount_amount)}</span></div>}
            <div className="flex justify-between text-base font-semibold"><span>{t.common.total}</span><span className="num ltr">{f.money(o.total_amount)}</span></div>
            {delivered && <div className="flex justify-between text-muted"><span>{t.dashboard.margin}</span><span className="num ltr">{f.money(Number(o.total_amount) - cogs)}</span></div>}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>{t.common.details}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-muted">{t.common.customer}: </span>{c && <Link href={`/customers/${c.id}`} className="text-brand hover:underline">{c.name}</Link>}</p>
              {o.notes && <p className="whitespace-pre-line"><span className="text-muted">{t.common.notes}: </span>{o.notes}</p>}
              {o.status === "cancelled" && <p className="text-danger">{t.sales.status.cancelled} · {o.cancel_reason}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t.deliveries.title}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {(deliveries ?? []).length === 0 && <p className="text-muted">{t.deliveries.emptyDone}</p>}
              {(deliveries ?? []).map((d) => (
                <div key={d.id} className="flex items-start justify-between gap-2">
                  <div><p>{f.date(d.delivery_date)}</p>{d.cancel_reason && <p className="text-xs text-muted">{d.cancel_reason}</p>}</div>
                  <Badge tone={d.status === "delivered" ? "success" : "neutral"}>{t.deliveries.status[d.status as "delivered"]}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t.invoices.title}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {(invoices ?? []).length === 0 && <p className="text-muted">—</p>}
              {(invoices ?? []).map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-2">
                  <Link href={`/invoices/${i.id}`} className="ltr text-brand hover:underline">{i.invoice_number}</Link>
                  <InvoiceStatus status={i.status} t={t} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

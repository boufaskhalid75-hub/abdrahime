import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, HandCoins } from "lucide-react";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { InvoiceStatus } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/shared/print-button";
import { CancelInvoiceButton } from "./invoice-actions";

type Biz = { business_name?: string; address?: string; city?: string; phone?: string; email?: string; ice?: string; rc?: string; if_number?: string; patente?: string; logo_url?: string; invoice_footer?: string };
type Cust = { name?: string; contact_name?: string; phone?: string; address?: string };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, t, f } = await getContext();
  const { data: inv } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  if (!inv) notFound();
  const [{ data: items }, { data: bal }, { data: allocs }] = await Promise.all([
    supabase.from("invoice_items").select("*").eq("invoice_id", id).order("product_name"),
    supabase.from("v_invoice_balances").select("paid_amount, outstanding_amount").eq("id", id).single(),
    supabase.from("payment_allocations").select("amount, is_active, payments(id, reference, payment_date, method)").eq("invoice_id", id),
  ]);
  const b = inv.business_snapshot as Biz;
  const c = inv.customer_snapshot as Cust;
  const legal = [b.ice && `ICE: ${b.ice}`, b.rc && `RC: ${b.rc}`, b.if_number && `IF: ${b.if_number}`, b.patente && `${t.settings.patente}: ${b.patente}`].filter(Boolean);

  return (
    <>
      <PageHeader title={`${t.invoices.invoice} ${inv.invoice_number}`} subtitle={`${c.name ?? ""} · ${f.date(inv.invoice_date)}`}
        actions={<>
          <InvoiceStatus status={inv.status} t={t} />
          <Button asChild variant="brand"><a href={`/api/pdf/invoice/${inv.id}`}><Download />{t.common.downloadPdf}</a></Button>
          <PrintButton />
          {inv.status === "unpaid" && <Button asChild variant="success"><Link href={`/payments/new?customer=${inv.customer_id}&invoice=${inv.id}`}><HandCoins />{t.customers.collect}</Link></Button>}
          {inv.status === "unpaid" && <CancelInvoiceButton id={inv.id} />}
          <Button asChild variant="secondary"><Link href={`/sales/${inv.order_id}`}>{t.sales.order}</Link></Button>
        </>} />
      <Card className="print-area mx-auto max-w-4xl p-6 sm:p-10">
        {inv.status === "cancelled" && (
          <p className="mb-6 rounded-lg bg-danger-50 p-3 text-center text-sm font-medium text-danger">{t.invoices.status.cancelled} — {inv.cancel_reason}</p>
        )}
        <div className="flex flex-col justify-between gap-6 sm:flex-row">
          <div>
            {b.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.logo_url} alt="" className="mb-3 h-12 w-auto object-contain" />
            ) : null}
            <p className="text-lg font-bold text-navy">{b.business_name}</p>
            <div className="mt-1 space-y-0.5 text-sm text-muted">
              {b.address && <p>{b.address}{b.city ? `, ${b.city}` : ""}</p>}
              {b.phone && <p className="ltr">{b.phone}</p>}
              {b.email && <p className="ltr">{b.email}</p>}
              {legal.length > 0 && <p className="ltr text-xs">{legal.join(" · ")}</p>}
            </div>
          </div>
          <div className="sm:text-end">
            <p className="text-2xl font-bold tracking-wide text-navy">{t.invoices.invoice}</p>
            <p className="ltr mt-1 font-medium">{inv.invoice_number}</p>
            <p className="text-sm text-muted">{t.invoices.date}: {f.date(inv.invoice_date)}</p>
          </div>
        </div>
        <div className="mt-8 rounded-lg border border-line bg-bg/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t.invoices.billTo}</p>
          <p className="mt-1 font-semibold">{c.name}</p>
          <div className="text-sm text-muted">
            {c.contact_name && <p>{c.contact_name}</p>}
            {c.address && <p>{c.address}</p>}
            {c.phone && <p className="ltr">{c.phone}</p>}
          </div>
        </div>
        <div className="mt-6">
          <Table>
            <THead><TR><TH>{t.common.product}</TH><TH className="text-end">{t.common.quantity} ({t.common.kg})</TH><TH className="text-end">{t.common.unitPrice}</TH><TH className="text-end">{t.common.lineTotal}</TH></TR></THead>
            <TBody>
              {(items ?? []).map((it) => (
                <TR key={it.id}>
                  <TD>{it.product_name}</TD>
                  <TD className="num text-end">{f.qty(it.quantity_kg)}</TD>
                  <TD className="num text-end">{f.money(it.unit_price)}</TD>
                  <TD className="num text-end">{f.money(it.line_total)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted">{t.common.subtotal}</span><span className="num ltr">{f.money(inv.subtotal)}</span></div>
            {Number(inv.discount_amount) > 0 && <div className="flex justify-between"><span className="text-muted">{t.common.discount}</span><span className="num ltr">− {f.money(inv.discount_amount)}</span></div>}
            <div className="flex justify-between border-t border-line pt-2 text-base font-bold text-navy"><span>{t.invoices.grandTotal}</span><span className="num ltr">{f.money(inv.total_amount)}</span></div>
            {inv.status !== "cancelled" && (
              <>
                <div className="flex justify-between"><span className="text-muted">{t.invoices.paidAmount}</span><span className="num ltr">{f.money(bal?.paid_amount)}</span></div>
                <div className="flex justify-between font-medium"><span>{t.invoices.amountDue}</span><span className="num ltr">{f.money(bal?.outstanding_amount)}</span></div>
              </>
            )}
          </div>
        </div>
        {(allocs ?? []).filter((a) => a.is_active).map((a) => {
          const p = a.payments as unknown as { id: string; reference: string; payment_date: string; method: string };
          return (
            <p key={p.id} className="mt-4 text-sm text-success">
              {t.invoices.status.paid} — <Link href={`/payments/${p.id}`} className="ltr underline">{p.reference}</Link> · {f.date(p.payment_date)} · {t.methods[p.method as "cash"]}
            </p>
          );
        })}
        <p className="mt-10 border-t border-line pt-4 text-center text-xs text-muted">{b.invoice_footer || t.invoices.thanks}</p>
      </Card>
    </>
  );
}

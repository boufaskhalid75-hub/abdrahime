import Link from "next/link";
import { notFound } from "next/navigation";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { InvoiceStatus } from "@/components/shared/status-badge";
import { ReversePaymentButton } from "./reverse-button";

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, t, f } = await getContext();
  const { data: p } = await supabase.from("payments").select("*, customers(id, name)").eq("id", id).maybeSingle();
  if (!p) notFound();
  const { data: allocs } = await supabase.from("payment_allocations").select("*, invoices(id, invoice_number, invoice_date, total_amount, status)").eq("payment_id", id);
  const c = p.customers as { id: string; name: string } | null;
  return (
    <>
      <PageHeader title={`${t.payments.title} ${p.reference}`} subtitle={`${c?.name ?? ""} · ${f.dateTime(p.paid_at)}`}
        actions={<>
          {p.status === "active" ? <Badge tone="success">{t.payments.status.active}</Badge> : <Badge>{t.payments.status.reversed}</Badge>}
          {p.status === "active" && <ReversePaymentButton id={p.id} />}
        </>} />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>{t.payments.invoicesPaid}</CardTitle></CardHeader>
          <Table>
            <THead><TR><TH>{t.invoices.number}</TH><TH>{t.common.date}</TH><TH className="text-end">{t.common.amount}</TH><TH>{t.common.status}</TH></TR></THead>
            <TBody>
              {(allocs ?? []).map((a) => {
                const i = a.invoices as { id: string; invoice_number: string; invoice_date: string; total_amount: number; status: string };
                return (
                  <TR key={a.id} className={!a.is_active ? "opacity-60" : undefined}>
                    <TD><Link href={`/invoices/${i.id}`} className="ltr text-brand hover:underline">{i.invoice_number}</Link></TD>
                    <TD>{f.date(i.invoice_date)}</TD>
                    <TD className="num text-end">{f.money(a.amount)}</TD>
                    <TD><InvoiceStatus status={i.status} t={t} /></TD>
                  </TR>
                );
              })}
              <TR className="bg-bg/60"><TD colSpan={2} className="font-semibold">{t.common.total}</TD><TD className="num text-end text-base font-semibold">{f.money(p.amount)}</TD><TD /></TR>
            </TBody>
          </Table>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t.common.details}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted">{t.common.customer}: </span>{c && <Link href={`/customers/${c.id}`} className="text-brand hover:underline">{c.name}</Link>}</p>
            <p><span className="text-muted">{t.common.date}: </span>{f.date(p.payment_date)} · {f.time(p.paid_at)}</p>
            <p><span className="text-muted">{t.common.method}: </span>{t.methods[p.method as "cash"]}</p>
            {p.external_reference && <p><span className="text-muted">{t.payments.externalRef}: </span><span className="ltr">{p.external_reference}</span></p>}
            {p.notes && <p className="whitespace-pre-line"><span className="text-muted">{t.common.notes}: </span>{p.notes}</p>}
            {p.status === "reversed" && <p className="text-danger">{t.payments.status.reversed} · {f.dateTime(p.reversed_at)} · {p.reversal_reason}</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

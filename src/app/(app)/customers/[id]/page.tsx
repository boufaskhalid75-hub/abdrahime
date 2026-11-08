import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, HandCoins, Plus, Receipt, Wallet, CalendarDays, AlertCircle } from "lucide-react";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ActiveBadge, InvoiceStatus } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { CustomerFormDialog } from "@/components/forms/entity-forms";
import { ArchiveButton } from "@/components/forms/archive-button";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { PricesEditor } from "./prices-editor";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, t, f } = await getContext();
  const { data: c } = await supabase.from("v_customer_balances").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const [{ data: full }, { data: invoices }, { data: payments }, { data: products }, { data: prices }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).single(),
    supabase.from("v_invoice_balances").select("*").eq("customer_id", id).order("invoice_date", { ascending: false }).order("invoice_number", { ascending: false }).limit(100),
    supabase.from("payments").select("*").eq("customer_id", id).order("paid_at", { ascending: false }).limit(50),
    supabase.from("products").select("id, name, sale_price").eq("is_active", true).order("name"),
    supabase.from("customer_product_prices").select("product_id, sale_price").eq("customer_id", id),
  ]);
  const lastTx = [c.last_invoice_date, c.last_payment_date].filter(Boolean).sort().pop() ?? null;

  return (
    <>
      <PageHeader title={c.name} subtitle={[c.contact_name, c.phone, c.address].filter(Boolean).join(" · ")}
        actions={<>
          <ActiveBadge active={c.is_active} t={t} />
          {c.is_active && <Button asChild variant="brand"><Link href={`/sales/new?customer=${c.id}`}><Plus />{t.customers.newSale}</Link></Button>}
          {Number(c.outstanding) > 0 && <Button asChild variant="success"><Link href={`/payments/new?customer=${c.id}`}><HandCoins />{t.customers.collect}</Link></Button>}
          <Button asChild variant="secondary"><Link href={`/customers/${c.id}/statement`}><FileText />{t.customers.statement}</Link></Button>
          <CustomerFormDialog customer={full ?? undefined} />
          <ArchiveButton table="customers" id={c.id} active={c.is_active} confirmText={t.customers.archiveConfirm} />
        </>} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label={t.customers.totalSales} value={f.money(c.total_invoiced)} icon={Receipt} />
        <StatCard label={t.customers.totalPaid} value={f.money(c.total_paid)} icon={Wallet} tone="success" />
        <StatCard label={t.customers.balance} value={f.money(c.outstanding)} icon={AlertCircle} tone={Number(c.outstanding) > 0 ? "warning" : "success"} />
        <StatCard label={t.customers.unpaidInvoices} value={`${f.int(c.unpaid_count)} / ${f.int(c.invoices_count)}`} icon={FileText} tone="navy"
          hint={c.oldest_unpaid_date ? `${t.receivables.oldest}: ${f.date(c.oldest_unpaid_date)}` : undefined} />
        <StatCard label={t.customers.lastTransaction} value={f.date(lastTx)} icon={CalendarDays} tone="navy" />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader><CardTitle>{t.customers.purchaseHistory}</CardTitle></CardHeader>
            {invoices?.length ? (
              <Table>
                <THead><TR><TH>{t.common.date}</TH><TH>{t.invoices.number}</TH><TH className="text-end">{t.common.total}</TH><TH className="text-end">{t.invoices.amountDue}</TH><TH>{t.common.status}</TH></TR></THead>
                <TBody>
                  {invoices.map((i) => (
                    <TR key={i.id}>
                      <TD>{f.date(i.invoice_date)}</TD>
                      <TD><Link href={`/invoices/${i.id}`} className="ltr text-brand hover:underline">{i.invoice_number}</Link></TD>
                      <TD className="num text-end">{f.money(i.total_amount)}</TD>
                      <TD className="num text-end">{f.money(i.outstanding_amount)}</TD>
                      <TD><InvoiceStatus status={i.status} t={t} /></TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : <EmptyState title={t.invoices.emptyTitle} />}
          </Card>
          <Card>
            <CardHeader><CardTitle>{t.customers.paymentHistory}</CardTitle></CardHeader>
            {payments?.length ? (
              <Table>
                <THead><TR><TH>{t.common.date}</TH><TH>{t.common.reference}</TH><TH>{t.common.method}</TH><TH className="text-end">{t.common.amount}</TH><TH>{t.common.status}</TH></TR></THead>
                <TBody>
                  {payments.map((p) => (
                    <TR key={p.id}>
                      <TD>{f.date(p.payment_date)} <span className="text-xs text-muted">{f.time(p.paid_at)}</span></TD>
                      <TD><Link href={`/payments/${p.id}`} className="ltr text-brand hover:underline">{p.reference}</Link></TD>
                      <TD>{t.methods[p.method as "cash"]}</TD>
                      <TD className="num text-end">{f.money(p.amount)}</TD>
                      <TD>{p.status === "active" ? <Badge tone="success">{t.payments.status.active}</Badge> : <Badge>{t.payments.status.reversed}</Badge>}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : <EmptyState title={t.payments.emptyTitle} />}
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>{t.customers.specificPrices}</CardTitle></CardHeader>
            <CardContent>
              <PricesEditor customerId={c.id} products={products ?? []}
                prices={Object.fromEntries((prices ?? []).map((p) => [p.product_id, Number(p.sale_price)]))} />
            </CardContent>
          </Card>
          {full?.notes && (
            <Card><CardHeader><CardTitle>{t.common.notes}</CardTitle></CardHeader><CardContent className="whitespace-pre-line text-sm">{full.notes}</CardContent></Card>
          )}
        </div>
      </div>
    </>
  );
}

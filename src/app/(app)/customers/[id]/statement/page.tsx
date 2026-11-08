import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { getContext } from "@/lib/auth";
import { buildStatement } from "@/lib/data/statement";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { InvoiceStatus } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/shared/print-button";
import { today } from "@/lib/dates";

export default async function StatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, t, f } = await getContext();
  const st = await buildStatement(supabase, id);
  if (!st) notFound();
  return (
    <>
      <PageHeader title={`${t.receivables.statementTitle} — ${st.customer.name}`} subtitle={`${t.common.date}: ${f.date(today())}`}
        actions={<>
          <Button asChild variant="brand"><a href={`/api/pdf/statement/${id}`}><Download />{t.common.downloadPdf}</a></Button>
          <PrintButton />
          <Button asChild variant="secondary"><Link href={`/customers/${id}`}>{t.common.back}</Link></Button>
        </>} />
      <Card className="print-area">
        <div className="grid grid-cols-3 gap-4 border-b border-line p-5 text-sm">
          <div><p className="text-muted">{t.customers.totalSales}</p><p className="num ltr text-lg font-semibold">{f.money(st.totals.invoiced)}</p></div>
          <div><p className="text-muted">{t.customers.totalPaid}</p><p className="num ltr text-lg font-semibold text-success">{f.money(st.totals.paid)}</p></div>
          <div><p className="text-muted">{t.customers.balance}</p><p className="num ltr text-lg font-semibold text-warning">{f.money(st.totals.outstanding)}</p></div>
        </div>
        <Table>
          <THead><TR><TH>{t.invoices.number}</TH><TH>{t.invoices.date}</TH><TH className="text-end">{t.common.amount}</TH><TH>{t.receivables.paymentDate}</TH><TH>{t.common.status}</TH><TH className="text-end">{t.receivables.outstanding}</TH><TH className="text-end">{t.receivables.runningBalance}</TH></TR></THead>
          <TBody>
            {st.lines.map((l) => (
              <TR key={l.id}>
                <TD><Link href={`/invoices/${l.id}`} className="ltr text-brand hover:underline">{l.invoice_number}</Link></TD>
                <TD>{f.date(l.invoice_date)}</TD>
                <TD className="num text-end">{f.money(l.total)}</TD>
                <TD>{f.date(l.payment_date)}</TD>
                <TD><InvoiceStatus status={l.status} t={t} /></TD>
                <TD className="num text-end">{f.money(l.outstanding)}</TD>
                <TD className="num text-end font-medium">{f.money(l.running)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </>
  );
}

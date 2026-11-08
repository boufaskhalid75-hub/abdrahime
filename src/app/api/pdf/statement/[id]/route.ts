import { createElement } from "react";
import { ReportPdf } from "@/lib/pdf/documents";
import { notFound, pdfResponse, pdfSafe, routeContext, unauthorized } from "@/lib/api";
import { buildStatement } from "@/lib/data/statement";
import { today } from "@/lib/dates";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, t, f } = await routeContext();
  if (!user) return unauthorized();
  const st = await buildStatement(supabase, id);
  if (!st) return notFound();
  const doc = createElement(ReportPdf, {
    b: st.settings ?? {}, title: "RELEVÉ DE COMPTE", subtitle: `${st.customer.name} — au ${f.date(today())}`,
    summary: [[t.customers.totalSales, f.money(st.totals.invoiced)], [t.customers.totalPaid, f.money(st.totals.paid)], [t.customers.balance, f.money(st.totals.outstanding)]].map(([a, b]) => [a, pdfSafe(b)] as [string, string]),
    cols: [{ label: "Facture", width: 18 }, { label: "Date", width: 13 }, { label: "Montant", width: 15, align: "right" }, { label: "Payée le", width: 13 }, { label: "Statut", width: 11 }, { label: "Reste dû", width: 15, align: "right" }, { label: "Solde cumulé", width: 15, align: "right" }],
    rows: st.lines.map((l) => [l.invoice_number, f.date(l.invoice_date), f.amount(l.total), f.date(l.payment_date), t.invoices.status[l.status as "paid"], f.amount(l.outstanding), f.amount(l.running)].map(pdfSafe)),
    total: ["Total", "", f.amount(st.totals.invoiced), "", "", f.amount(st.totals.outstanding), ""].map(pdfSafe),
  });
  return pdfResponse(doc, `releve-${st.customer.name}-${today()}.pdf`);
}

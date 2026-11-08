import { createElement } from "react";
import { InvoicePdf, type Biz } from "@/lib/pdf/documents";
import { notFound, pdfResponse, pdfSafe, routeContext, unauthorized } from "@/lib/api";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, t, f } = await routeContext();
  if (!user) return unauthorized();
  const { data: inv } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  if (!inv) return notFound();
  const [{ data: items }, { data: bal }] = await Promise.all([
    supabase.from("invoice_items").select("*").eq("invoice_id", id).order("product_name"),
    supabase.from("v_invoice_balances").select("paid_amount, outstanding_amount").eq("id", id).single(),
  ]);
  const b = inv.business_snapshot as Biz;
  const doc = createElement(InvoicePdf, {
    b, number: inv.invoice_number, date: f.date(inv.invoice_date), status: t.invoices.status[inv.status as "paid"],
    customer: inv.customer_snapshot,
    items: (items ?? []).map((i) => [i.product_name, f.qty(i.quantity_kg), f.amount(i.unit_price), f.amount(i.line_total)].map(pdfSafe)),
    subtotal: pdfSafe(f.money(inv.subtotal)), discount: Number(inv.discount_amount) > 0 ? pdfSafe(f.money(inv.discount_amount)) : null,
    total: pdfSafe(f.money(inv.total_amount)), paid: pdfSafe(f.money(bal?.paid_amount)), due: pdfSafe(f.money(bal?.outstanding_amount)),
    cancelled: inv.status === "cancelled" ? inv.cancel_reason ?? "" : null, footer: b.invoice_footer || t.invoices.thanks,
  });
  return pdfResponse(doc, `${inv.invoice_number}.pdf`);
}

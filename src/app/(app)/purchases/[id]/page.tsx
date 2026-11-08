import Link from "next/link";
import { notFound } from "next/navigation";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { PurchaseStatus } from "@/components/shared/status-badge";
import { PurchaseActions } from "./purchase-actions";
import { today } from "@/lib/dates";

export default async function PurchasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, t, f } = await getContext();
  const { data: p } = await supabase.from("purchases").select("*, suppliers(id, name)").eq("id", id).maybeSingle();
  if (!p) notFound();
  const [{ data: items }, { data: lots }] = await Promise.all([
    supabase.from("purchase_items").select("*, products(name)").eq("purchase_id", id),
    supabase.from("stock_lots").select("*, products(name), purchase_items!inner(purchase_id)").eq("purchase_items.purchase_id", id),
  ]);
  const sup = p.suppliers as { id: string; name: string } | null;
  const untouched = (lots ?? []).every((l) => Number(l.remaining_kg) === Number(l.initial_kg));

  return (
    <>
      <PageHeader
        title={`${t.purchases.title} ${p.reference}`}
        subtitle={`${sup?.name ?? ""} · ${f.date(p.purchase_date)}`}
        actions={<>
          <PurchaseStatus status={p.status} paymentStatus={p.payment_status} t={t} />
          <PurchaseActions id={p.id} today={today()}
            canPay={p.status === "confirmed" && p.payment_status === "unpaid"}
            canCancel={p.status === "confirmed" && untouched} />
        </>}
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>{t.purchases.lines}</CardTitle></CardHeader>
          <Table>
            <THead><TR><TH>{t.common.product}</TH><TH className="text-end">{t.common.quantity}</TH><TH className="text-end">{t.common.unitPrice}</TH><TH className="text-end">{t.common.lineTotal}</TH></TR></THead>
            <TBody>
              {(items ?? []).map((it) => (
                <TR key={it.id}>
                  <TD>{(it.products as { name: string } | null)?.name}</TD>
                  <TD className="num text-end">{f.kg(it.quantity_kg)}</TD>
                  <TD className="num text-end">{f.money(it.unit_price)}</TD>
                  <TD className="num text-end font-medium">{f.money(it.line_total)}</TD>
                </TR>
              ))}
              <TR className="bg-bg/60"><TD colSpan={3} className="font-semibold">{t.common.total}</TD><TD className="num text-end text-base font-semibold">{f.money(p.total_amount)}</TD></TR>
            </TBody>
          </Table>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>{t.common.details}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-muted">{t.common.supplier}: </span>{sup && <Link className="text-brand hover:underline" href={`/suppliers/${sup.id}`}>{sup.name}</Link>}</p>
              <p><span className="text-muted">{t.purchases.paymentStatus}: </span>{p.payment_status === "paid" ? `${t.methods[p.payment_method as "cash"]} · ${t.purchases.paidOn} ${f.date(p.paid_at)}` : t.purchases.unpaid}</p>
              {p.notes && <p className="whitespace-pre-line"><span className="text-muted">{t.common.notes}: </span>{p.notes}</p>}
              {p.status === "cancelled" && <p className="text-danger">{t.purchases.cancelled} · {p.cancel_reason}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t.purchases.lots}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(lots ?? []).map((l) => (
                <div key={l.id} className="flex justify-between gap-2">
                  <span>{(l.products as { name: string } | null)?.name}</span>
                  <span className="num text-muted">{t.purchases.remaining}: {f.kg(l.remaining_kg)} / {f.kg(l.initial_kg)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

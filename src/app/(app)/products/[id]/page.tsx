import Link from "next/link";
import { notFound } from "next/navigation";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ActiveBadge, InvoiceStatus } from "@/components/shared/status-badge";
import { ProductFormDialog } from "@/components/forms/entity-forms";
import { ArchiveButton } from "@/components/forms/archive-button";
import { EmptyState } from "@/components/shared/empty-state";
import { Boxes, Coins, PackageMinus, PackagePlus } from "lucide-react";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, t, f } = await getContext();
  const { data: p } = await supabase.from("v_product_stock").select("*").eq("id", id).maybeSingle();
  if (!p) notFound();
  const { data: full } = await supabase.from("products").select("*").eq("id", id).single();

  const [prices, buys, sales] = await Promise.all([
    supabase.from("product_price_history").select("*").eq("product_id", id).order("changed_at", { ascending: false }).limit(20),
    supabase.from("purchase_items").select("id, quantity_kg, unit_price, line_total, purchases!inner(id, reference, purchase_date, status, suppliers(name))")
      .eq("product_id", id).order("id").limit(50),
    supabase.from("invoice_items").select("id, quantity_kg, unit_price, line_total, invoices!inner(id, invoice_number, invoice_date, status, customers(name))")
      .eq("product_id", id).limit(50),
  ]);
  type Buy = { id: string; quantity_kg: number; unit_price: number; line_total: number; purchases: { id: string; reference: string; purchase_date: string; status: string; suppliers: { name: string } | null } };
  type Sale = { id: string; quantity_kg: number; unit_price: number; line_total: number; invoices: { id: string; invoice_number: string; invoice_date: string; status: string; customers: { name: string } | null } };
  const buyRows = ((buys.data ?? []) as unknown as Buy[]).sort((a, b) => b.purchases.purchase_date.localeCompare(a.purchases.purchase_date));
  const saleRows = ((sales.data ?? []) as unknown as Sale[]).sort((a, b) => b.invoices.invoice_date.localeCompare(a.invoices.invoice_date));

  return (
    <>
      <PageHeader
        title={p.name}
        subtitle={[p.reference, p.category].filter(Boolean).join(" · ") || t.products.subtitle}
        actions={<>
          <ActiveBadge active={p.is_active} t={t} />
          <ProductFormDialog product={full ?? undefined} />
          <ArchiveButton table="products" id={p.id} active={p.is_active} confirmText={t.products.archiveConfirm} />
        </>}
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t.products.stock} value={f.kg(p.stock_kg)} icon={Boxes} tone={p.is_low_stock ? "warning" : "brand"}
          hint={`${t.products.minStock}: ${f.kg(p.min_stock_kg)}`} />
        <StatCard label={t.stock.value} value={f.money(p.stock_value)} icon={Coins} hint={`${t.products.avgCost}: ${f.money(p.avg_cost)}${t.common.perKg}`} />
        <StatCard label={t.stock.purchased} value={f.kg(p.purchased_kg)} icon={PackagePlus} tone="success" />
        <StatCard label={t.stock.sold} value={f.kg(p.sold_kg)} icon={PackageMinus} tone="navy" hint={`${t.stock.damaged}: ${f.kg(p.damaged_kg)}`} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t.products.purchaseHistory}</CardTitle></CardHeader>
          {buyRows.length ? (
            <Table>
              <THead><TR><TH>{t.common.date}</TH><TH>{t.common.reference}</TH><TH>{t.common.supplier}</TH><TH className="text-end">{t.common.quantity}</TH><TH className="text-end">{t.common.unitPrice}</TH></TR></THead>
              <TBody>
                {buyRows.map((r) => (
                  <TR key={r.id} className={r.purchases.status === "cancelled" ? "opacity-50" : undefined}>
                    <TD>{f.date(r.purchases.purchase_date)}</TD>
                    <TD><Link className="ltr text-brand hover:underline" href={`/purchases/${r.purchases.id}`}>{r.purchases.reference}</Link></TD>
                    <TD>{r.purchases.suppliers?.name}</TD>
                    <TD className="num text-end">{f.kg(r.quantity_kg)}</TD>
                    <TD className="num text-end">{f.money(r.unit_price)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : <EmptyState title={t.common.noResults} />}
        </Card>
        <Card>
          <CardHeader><CardTitle>{t.products.salesHistory}</CardTitle></CardHeader>
          {saleRows.length ? (
            <Table>
              <THead><TR><TH>{t.common.date}</TH><TH>{t.invoices.number}</TH><TH>{t.common.customer}</TH><TH className="text-end">{t.common.quantity}</TH><TH className="text-end">{t.common.unitPrice}</TH><TH>{t.common.status}</TH></TR></THead>
              <TBody>
                {saleRows.map((r) => (
                  <TR key={r.id}>
                    <TD>{f.date(r.invoices.invoice_date)}</TD>
                    <TD><Link className="ltr text-brand hover:underline" href={`/invoices/${r.invoices.id}`}>{r.invoices.invoice_number}</Link></TD>
                    <TD>{r.invoices.customers?.name}</TD>
                    <TD className="num text-end">{f.kg(r.quantity_kg)}</TD>
                    <TD className="num text-end">{f.money(r.unit_price)}</TD>
                    <TD><InvoiceStatus status={r.invoices.status} t={t} /></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : <EmptyState title={t.common.noResults} />}
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>{t.products.priceHistory}</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <THead><TR><TH>{t.products.changedAt}</TH><TH className="text-end">{t.products.purchasePrice}</TH><TH className="text-end">{t.products.salePrice}</TH></TR></THead>
              <TBody>
                {(prices.data ?? []).map((h) => (
                  <TR key={h.id}><TD>{f.dateTime(h.changed_at)}</TD><TD className="num text-end">{f.money(h.purchase_price)}</TD><TD className="num text-end">{f.money(h.sale_price)}</TD></TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

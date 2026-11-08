import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, ShoppingCart, Wallet, CalendarDays, Package } from "lucide-react";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ActiveBadge, PurchaseStatus } from "@/components/shared/status-badge";
import { SupplierFormDialog } from "@/components/forms/entity-forms";
import { ArchiveButton } from "@/components/forms/archive-button";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { today } from "@/lib/dates";

export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, t, f } = await getContext();
  const { data: s } = await supabase.from("suppliers").select("*").eq("id", id).maybeSingle();
  if (!s) notFound();
  const [{ data: purchases }, { data: perf }, { data: items }] = await Promise.all([
    supabase.from("purchases").select("*").eq("supplier_id", id).order("purchase_date", { ascending: false }).limit(100),
    supabase.rpc("supplier_performance", { p_from: "2000-01-01", p_to: today() }),
    supabase.from("purchase_items").select("quantity_kg, line_total, products(name), purchases!inner(supplier_id, status)")
      .eq("purchases.supplier_id", id).eq("purchases.status", "confirmed"),
  ]);
  const st = (perf ?? []).find((r: { supplier_id: string }) => r.supplier_id === id) as Record<string, number | string> | undefined;
  const byProduct = new Map<string, { kg: number; amount: number }>();
  for (const it of (items ?? []) as unknown as { quantity_kg: number; line_total: number; products: { name: string } | null }[]) {
    const k = it.products?.name ?? "—";
    const cur = byProduct.get(k) ?? { kg: 0, amount: 0 };
    byProduct.set(k, { kg: cur.kg + Number(it.quantity_kg), amount: cur.amount + Number(it.line_total) });
  }

  return (
    <>
      <PageHeader title={s.name} subtitle={[s.contact_name, s.phone].filter(Boolean).join(" · ")}
        actions={<>
          <ActiveBadge active={s.is_active} t={t} />
          <Button asChild variant="brand"><Link href={`/purchases/new?supplier=${s.id}`}><Plus />{t.purchases.new}</Link></Button>
          <SupplierFormDialog supplier={s} />
          <ArchiveButton table="suppliers" id={s.id} active={s.is_active} confirmText={t.suppliers.archiveConfirm} />
        </>} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t.suppliers.totalPurchases} value={f.money(st?.amount)} icon={ShoppingCart} />
        <StatCard label={t.suppliers.unpaid} value={f.money(st?.unpaid_amount)} icon={Wallet} tone={Number(st?.unpaid_amount ?? 0) > 0 ? "warning" : "success"} />
        <StatCard label={t.suppliers.purchasesCount} value={f.int(st?.purchases_count)} icon={Package} tone="navy" hint={f.kg(st?.quantity_kg)} />
        <StatCard label={t.suppliers.lastPurchase} value={f.date(st?.last_purchase_date as string | null)} icon={CalendarDays} tone="navy" />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>{t.purchases.title}</CardTitle></CardHeader>
          {purchases?.length ? (
            <Table>
              <THead><TR><TH>{t.common.date}</TH><TH>{t.common.reference}</TH><TH className="text-end">{t.common.total}</TH><TH>{t.purchases.paymentStatus}</TH></TR></THead>
              <TBody>
                {purchases.map((p) => (
                  <TR key={p.id}>
                    <TD>{f.date(p.purchase_date)}</TD>
                    <TD><Link href={`/purchases/${p.id}`} className="ltr text-brand hover:underline">{p.reference}</Link></TD>
                    <TD className="num text-end">{f.money(p.total_amount)}</TD>
                    <TD><PurchaseStatus status={p.status} paymentStatus={p.payment_status} t={t} /></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : <EmptyState title={t.purchases.emptyTitle} />}
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>{t.suppliers.productsBought}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[...byProduct.entries()].map(([name, v]) => (
                <div key={name} className="flex justify-between gap-3 text-sm"><span>{name}</span><span className="num text-muted">{f.kg(v.kg)} · {f.money(v.amount)}</span></div>
              ))}
              {byProduct.size === 0 && <p className="text-sm text-muted">{t.common.noResults}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t.common.details}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-muted">{t.common.address}: </span>{s.address ?? "—"}</p>
              <p><span className="text-muted">{t.common.email}: </span><span className="ltr">{s.email ?? "—"}</span></p>
              <p className="whitespace-pre-line"><span className="text-muted">{t.common.notes}: </span>{s.notes ?? "—"}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

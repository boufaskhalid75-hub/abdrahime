import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, Boxes, Coins, Scale } from "lucide-react";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { MovementBadge } from "@/components/shared/status-badge";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { Pager } from "@/components/shared/pager";
import { AdjustDialog } from "./adjust-dialog";
import { pageRange } from "@/lib/query";
import { today } from "@/lib/dates";

export const metadata: Metadata = { title: "Stock" };
type SP = { product?: string; page?: string };

export default async function StockPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { supabase, t, f } = await getContext();
  const sp = await searchParams;
  const { page, from, to } = pageRange(sp.page);
  let mq = supabase.from("stock_movements").select("*, products(name)", { count: "exact" })
    .order("created_at", { ascending: false }).range(from, to);
  if (sp.product) mq = mq.eq("product_id", sp.product);
  const [{ data: rows }, { data: settings }, { data: moves, count }] = await Promise.all([
    supabase.from("v_product_stock").select("*").order("name"),
    supabase.from("business_settings").select("valuation_method").maybeSingle(),
    mq,
  ]);
  const products = rows ?? [];
  const active = products.filter((p) => p.is_active);
  const totalKg = products.reduce((a, p) => a + Number(p.stock_kg), 0);
  const totalValue = products.reduce((a, p) => a + Number(p.stock_value), 0);
  const low = active.filter((p) => p.is_low_stock).length;

  return (
    <>
      <PageHeader title={t.stock.title} subtitle={t.stock.subtitle}
        actions={active.length > 0 && <AdjustDialog products={active.map((p) => ({ id: p.id, name: p.name }))} today={today()} />} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t.dashboard.stockKg} value={f.kg(totalKg)} icon={Boxes} />
        <StatCard label={t.dashboard.stockValue} value={f.money(totalValue)} icon={Coins} tone="success" />
        <StatCard label={t.dashboard.lowStock} value={f.int(low)} icon={AlertTriangle} tone={low ? "warning" : "success"} />
        <StatCard label={t.stock.method} value={settings?.valuation_method ?? "CUMP"} icon={Scale} tone="navy"
          hint={<Link href="/settings" className="text-brand hover:underline">{t.nav.settings}</Link>} />
      </div>
      <Card className="mb-6">
        {products.length ? (
          <Table>
            <THead><TR>
              <TH>{t.common.product}</TH><TH className="text-end">{t.stock.available}</TH><TH className="text-end">{t.stock.minStock}</TH>
              <TH className="text-end">{t.stock.purchased}</TH><TH className="text-end">{t.stock.sold}</TH><TH className="text-end">{t.stock.damaged}</TH>
              <TH className="text-end">{t.stock.adjusted}</TH><TH className="text-end">{t.stock.avgCost}</TH><TH className="text-end">{t.stock.value}</TH>
            </TR></THead>
            <TBody>
              {products.map((p) => (
                <TR key={p.id} className={!p.is_active ? "opacity-60" : undefined}>
                  <TD><Link href={`/products/${p.id}`} className="font-medium hover:text-brand">{p.name}</Link></TD>
                  <TD className="num text-end font-medium">
                    {p.is_low_stock && <Badge tone="warning" className="me-2">{t.products.lowStock}</Badge>}{f.kg(p.stock_kg)}
                  </TD>
                  <TD className="num text-end text-muted">{f.kg(p.min_stock_kg)}</TD>
                  <TD className="num text-end">{f.kg(p.purchased_kg)}</TD>
                  <TD className="num text-end">{f.kg(p.sold_kg)}</TD>
                  <TD className="num text-end text-danger">{f.kg(p.damaged_kg)}</TD>
                  <TD className="num text-end">{f.kg(p.adjusted_kg)}</TD>
                  <TD className="num text-end">{f.money(p.avg_cost)}</TD>
                  <TD className="num text-end font-medium">{f.money(p.stock_value)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : <EmptyState icon={Boxes} title={t.stock.emptyTitle} text={t.products.emptyText} />}
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.stock.movements}</CardTitle>
          <FilterTabs basePath="/stock" param="product" current={sp.product ?? ""} searchParams={sp}
            items={[{ value: "", label: t.common.all }, ...active.map((p) => ({ value: p.id, label: p.name }))]} />
        </CardHeader>
        {moves?.length ? (
          <>
            <Table>
              <THead><TR><TH>{t.common.date}</TH><TH>{t.common.product}</TH><TH>{t.stock.adjustType}</TH><TH className="text-end">{t.common.quantity}</TH><TH className="text-end">{t.stock.avgCost}</TH><TH className="text-end">{t.stock.value}</TH><TH className="text-end">{t.stock.balanceAfter}</TH><TH>{t.common.notes}</TH></TR></THead>
              <TBody>
                {moves.map((m) => (
                  <TR key={m.id}>
                    <TD>{f.date(m.movement_date)}</TD>
                    <TD>{(m.products as { name: string } | null)?.name}</TD>
                    <TD><MovementBadge type={m.movement_type} t={t} /></TD>
                    <TD className={`num ltr text-end font-medium ${Number(m.quantity_kg) < 0 ? "text-danger" : "text-success"}`}>
                      {Number(m.quantity_kg) > 0 ? "+" : ""}{f.qty(m.quantity_kg)}
                    </TD>
                    <TD className="num text-end">{f.money(m.unit_cost)}</TD>
                    <TD className="num text-end">{f.money(m.total_cost)}</TD>
                    <TD className="num text-end">{f.kg(m.balance_after_kg)}</TD>
                    <TD className="max-w-56 truncate text-muted">{m.notes ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pager page={page} count={count ?? 0} basePath="/stock" searchParams={sp} t={t} />
          </>
        ) : <EmptyState title={t.common.noResults} />}
      </Card>
    </>
  );
}

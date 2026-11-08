import Link from "next/link";
import type { Metadata } from "next";
import { Package } from "lucide-react";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchBox } from "@/components/shared/search-box";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { ActiveBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { ProductFormDialog } from "@/components/forms/entity-forms";
import { term } from "@/lib/query";

export const metadata: Metadata = { title: "Produits" };

type SP = { q?: string; status?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { supabase, t, f } = await getContext();
  const sp = await searchParams;
  const status = sp.status ?? "active";
  let q = supabase.from("v_product_stock").select("*").order("name");
  if (status === "active") q = q.eq("is_active", true);
  if (status === "archived") q = q.eq("is_active", false);
  const s = term(sp.q);
  if (s) q = q.or(`name.ilike.${s},reference.ilike.${s},category.ilike.${s}`);
  const { data: rows = [] } = await q;

  return (
    <>
      <PageHeader title={t.products.title} subtitle={t.products.subtitle} actions={<ProductFormDialog />} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox />
        <FilterTabs basePath="/products" param="status" current={status} searchParams={sp}
          items={[{ value: "active", label: t.common.active }, { value: "archived", label: t.common.inactive }, { value: "all", label: t.common.all }]} />
      </div>
      <Card>
        {rows && rows.length > 0 ? (
          <Table>
            <THead>
              <TR>
                <TH>{t.products.name}</TH>
                <TH>{t.products.category}</TH>
                <TH className="text-end">{t.products.stock}</TH>
                <TH className="text-end">{t.products.avgCost}</TH>
                <TH className="text-end">{t.products.purchasePrice}</TH>
                <TH className="text-end">{t.products.salePrice}</TH>
                <TH>{t.common.status}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((p) => (
                <TR key={p.id}>
                  <TD>
                    <Link href={`/products/${p.id}`} className="font-medium text-ink hover:text-brand">{p.name}</Link>
                    {p.reference && <p className="ltr text-xs text-muted">{p.reference}</p>}
                  </TD>
                  <TD className="text-muted">{p.category ?? "—"}</TD>
                  <TD className="num text-end">
                    {f.kg(p.stock_kg)}
                    {p.is_low_stock && <Badge tone="warning" className="ms-2">{t.products.lowStock}</Badge>}
                  </TD>
                  <TD className="num text-end">{f.money(p.avg_cost)}</TD>
                  <TD className="num text-end">{f.money(p.purchase_price)}</TD>
                  <TD className="num text-end">{f.money(p.sale_price)}</TD>
                  <TD><ActiveBadge active={p.is_active} t={t} /></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState icon={Package} title={t.products.emptyTitle} text={t.products.emptyText} action={<ProductFormDialog />} />
        )}
      </Card>
    </>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { Truck } from "lucide-react";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchBox } from "@/components/shared/search-box";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { ActiveBadge } from "@/components/shared/status-badge";
import { SupplierFormDialog } from "@/components/forms/entity-forms";
import { term } from "@/lib/query";
import { today } from "@/lib/dates";

export const metadata: Metadata = { title: "Fournisseurs" };

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { supabase, t, f } = await getContext();
  const sp = await searchParams;
  const status = sp.status ?? "active";
  let q = supabase.from("suppliers").select("*").order("name");
  if (status === "active") q = q.eq("is_active", true);
  if (status === "archived") q = q.eq("is_active", false);
  const s = term(sp.q);
  if (s) q = q.or(`name.ilike.${s},contact_name.ilike.${s},phone.ilike.${s}`);
  const [{ data: rows }, { data: perf }] = await Promise.all([
    q,
    supabase.rpc("supplier_performance", { p_from: "2000-01-01", p_to: today() }),
  ]);
  type Perf = { supplier_id: string; purchases_count: number; amount: number; unpaid_amount: number };
  const stats = new Map<string, Perf>(((perf ?? []) as Perf[]).map((r) => [r.supplier_id, r]));

  return (
    <>
      <PageHeader title={t.suppliers.title} subtitle={t.suppliers.subtitle} actions={<SupplierFormDialog />} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox />
        <FilterTabs basePath="/suppliers" param="status" current={status} searchParams={sp}
          items={[{ value: "active", label: t.common.active }, { value: "archived", label: t.common.inactive }, { value: "all", label: t.common.all }]} />
      </div>
      <Card>
        {rows?.length ? (
          <Table>
            <THead><TR>
              <TH>{t.suppliers.name}</TH><TH>{t.common.contact}</TH><TH>{t.common.phone}</TH>
              <TH className="text-end">{t.suppliers.purchasesCount}</TH><TH className="text-end">{t.suppliers.totalPurchases}</TH>
              <TH className="text-end">{t.suppliers.unpaid}</TH><TH>{t.common.status}</TH>
            </TR></THead>
            <TBody>
              {rows.map((r) => {
                const st = stats.get(r.id);
                return (
                  <TR key={r.id}>
                    <TD><Link href={`/suppliers/${r.id}`} className="font-medium hover:text-brand">{r.name}</Link></TD>
                    <TD className="text-muted">{r.contact_name ?? "—"}</TD>
                    <TD className="ltr text-muted">{r.phone ?? "—"}</TD>
                    <TD className="num text-end">{f.int(st?.purchases_count)}</TD>
                    <TD className="num text-end">{f.money(st?.amount)}</TD>
                    <TD className="num text-end">{Number(st?.unpaid_amount ?? 0) > 0 ? <span className="text-warning">{f.money(st?.unpaid_amount)}</span> : f.money(0)}</TD>
                    <TD><ActiveBadge active={r.is_active} t={t} /></TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        ) : <EmptyState icon={Truck} title={t.suppliers.emptyTitle} text={t.suppliers.emptyText} action={<SupplierFormDialog />} />}
      </Card>
    </>
  );
}

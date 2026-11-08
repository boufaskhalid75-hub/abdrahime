import Link from "next/link";
import type { Metadata } from "next";
import { Plus, ShoppingCart } from "lucide-react";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchBox } from "@/components/shared/search-box";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { PurchaseStatus } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Pager } from "@/components/shared/pager";
import { PeriodFilter } from "@/components/shared/period-filter";
import { pageRange, term } from "@/lib/query";
import { resolvePeriod } from "@/lib/dates";

export const metadata: Metadata = { title: "Achats" };
type SP = { q?: string; pay?: string; page?: string; period?: string; from?: string; to?: string };

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { supabase, t, f } = await getContext();
  const sp = await searchParams;
  const period = resolvePeriod(sp, "last30");
  const { page, from, to } = pageRange(sp.page);
  const pay = sp.pay ?? "";
  let q = supabase.from("purchases").select("*, suppliers(name)", { count: "exact" })
    .order("purchase_date", { ascending: false }).order("created_at", { ascending: false }).range(from, to);
  // Unpaid purchases are always shown regardless of the period.
  if (pay !== "unpaid") q = q.gte("purchase_date", period.from).lte("purchase_date", period.to);
  if (pay === "unpaid") q = q.eq("payment_status", "unpaid").eq("status", "confirmed");
  if (pay === "paid") q = q.eq("payment_status", "paid").eq("status", "confirmed");
  if (pay === "cancelled") q = q.eq("status", "cancelled");
  const s = term(sp.q);
  if (s) q = q.ilike("reference", s);
  const { data: rows, count } = await q;
  const newBtn = <Button asChild><Link href="/purchases/new"><Plus />{t.purchases.new}</Link></Button>;

  return (
    <>
      <PageHeader title={t.purchases.title} subtitle={t.purchases.subtitle} actions={newBtn} />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row"><SearchBox /><PeriodFilter preset={period.preset} from={period.from} to={period.to} /></div>
        <FilterTabs basePath="/purchases" param="pay" current={pay} searchParams={sp}
          items={[{ value: "", label: t.common.all }, { value: "unpaid", label: t.purchases.unpaid }, { value: "paid", label: t.purchases.paid }, { value: "cancelled", label: t.purchases.cancelled }]} />
      </div>
      <Card>
        {rows?.length ? (
          <>
            <Table>
              <THead><TR><TH>{t.common.date}</TH><TH>{t.common.reference}</TH><TH>{t.common.supplier}</TH><TH className="text-end">{t.common.total}</TH><TH>{t.purchases.paymentStatus}</TH></TR></THead>
              <TBody>
                {rows.map((p) => (
                  <TR key={p.id}>
                    <TD>{f.date(p.purchase_date)}</TD>
                    <TD><Link href={`/purchases/${p.id}`} className="ltr font-medium text-brand hover:underline">{p.reference}</Link></TD>
                    <TD>{(p.suppliers as { name: string } | null)?.name}</TD>
                    <TD className="num text-end">{f.money(p.total_amount)}</TD>
                    <TD><PurchaseStatus status={p.status} paymentStatus={p.payment_status} t={t} /></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pager page={page} count={count ?? 0} basePath="/purchases" searchParams={sp} t={t} />
          </>
        ) : <EmptyState icon={ShoppingCart} title={t.purchases.emptyTitle} text={t.purchases.emptyText} action={newBtn} />}
      </Card>
    </>
  );
}

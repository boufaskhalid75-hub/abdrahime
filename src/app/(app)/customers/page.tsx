import Link from "next/link";
import type { Metadata } from "next";
import { Users } from "lucide-react";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchBox } from "@/components/shared/search-box";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { ActiveBadge } from "@/components/shared/status-badge";
import { CustomerFormDialog } from "@/components/forms/entity-forms";
import { term } from "@/lib/query";

export const metadata: Metadata = { title: "Clients" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { supabase, t, f } = await getContext();
  const sp = await searchParams;
  const status = sp.status ?? "active";
  let q = supabase.from("v_customer_balances").select("*").order("name");
  if (status === "active") q = q.eq("is_active", true);
  if (status === "archived") q = q.eq("is_active", false);
  if (status === "debt") q = q.gt("outstanding", 0);
  const s = term(sp.q);
  if (s) q = q.or(`name.ilike.${s},contact_name.ilike.${s},phone.ilike.${s}`);
  const { data: rows } = await q;

  return (
    <>
      <PageHeader title={t.customers.title} subtitle={t.customers.subtitle} actions={<CustomerFormDialog />} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox />
        <FilterTabs basePath="/customers" param="status" current={status} searchParams={sp}
          items={[{ value: "active", label: t.common.active }, { value: "debt", label: t.receivables.filters.unpaid }, { value: "archived", label: t.common.inactive }, { value: "all", label: t.common.all }]} />
      </div>
      <Card>
        {rows?.length ? (
          <Table>
            <THead><TR>
              <TH>{t.customers.name}</TH><TH>{t.common.phone}</TH><TH className="text-end">{t.customers.totalSales}</TH>
              <TH className="text-end">{t.customers.totalPaid}</TH><TH className="text-end">{t.customers.balance}</TH>
              <TH className="text-end">{t.customers.unpaidInvoices}</TH><TH>{t.customers.lastTransaction}</TH><TH>{t.common.status}</TH>
            </TR></THead>
            <TBody>
              {rows.map((c) => (
                <TR key={c.id}>
                  <TD><Link href={`/customers/${c.id}`} className="font-medium hover:text-brand">{c.name}</Link>{c.contact_name && <p className="text-xs text-muted">{c.contact_name}</p>}</TD>
                  <TD className="ltr text-muted">{c.phone ?? "—"}</TD>
                  <TD className="num text-end">{f.money(c.total_invoiced)}</TD>
                  <TD className="num text-end">{f.money(c.total_paid)}</TD>
                  <TD className={`num text-end font-medium ${Number(c.outstanding) > 0 ? "text-warning" : ""}`}>{f.money(c.outstanding)}</TD>
                  <TD className="num text-end">{f.int(c.unpaid_count)}</TD>
                  <TD className="text-muted">{f.date(c.last_payment_date && c.last_payment_date > (c.last_invoice_date ?? "") ? c.last_payment_date : c.last_invoice_date)}</TD>
                  <TD><ActiveBadge active={c.is_active} t={t} /></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : <EmptyState icon={Users} title={t.customers.emptyTitle} text={t.customers.emptyText} action={<CustomerFormDialog />} />}
      </Card>
    </>
  );
}

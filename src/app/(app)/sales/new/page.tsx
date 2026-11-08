import Link from "next/link";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { SaleForm } from "@/components/forms/sale-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { today } from "@/lib/dates";

export default async function NewSalePage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const { supabase, t } = await getContext();
  const sp = await searchParams;
  const [{ data: products }, { data: customers }, { data: prices }] = await Promise.all([
    supabase.from("products").select("id, name, sale_price, stock_kg").eq("is_active", true).order("name"),
    supabase.from("v_customer_balances").select("id, name, phone, outstanding").eq("is_active", true).order("name"),
    supabase.from("customer_product_prices").select("customer_id, product_id, sale_price"),
  ]);
  const missing = !products?.length ? "products" : !customers?.length ? "customers" : null;
  return (
    <>
      <PageHeader title={t.sales.new} subtitle={t.sales.subtitle} />
      {missing ? (
        <Card>
          <EmptyState title={missing === "products" ? t.products.emptyTitle : t.customers.emptyTitle}
            text={missing === "products" ? t.products.emptyText : t.customers.emptyText}
            action={<Button asChild><Link href={`/${missing}`}>{missing === "products" ? t.products.new : t.customers.new}</Link></Button>} />
        </Card>
      ) : (
        <SaleForm products={products!} customers={customers!} prices={prices ?? []} defaultCustomer={sp.customer} defaultDate={today()} />
      )}
    </>
  );
}

import Link from "next/link";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { PurchaseForm } from "@/components/forms/purchase-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { today } from "@/lib/dates";

export default async function NewPurchasePage({ searchParams }: { searchParams: Promise<{ supplier?: string }> }) {
  const { supabase, t } = await getContext();
  const sp = await searchParams;
  const [{ data: products }, { data: suppliers }, { data: settings }] = await Promise.all([
    supabase.from("products").select("id, name, purchase_price, stock_kg").eq("is_active", true).order("name"),
    supabase.from("suppliers").select("id, name").eq("is_active", true).order("name"),
    supabase.from("business_settings").select("default_purchase_paid").maybeSingle(),
  ]);
  const missing = !products?.length ? "products" : !suppliers?.length ? "suppliers" : null;
  return (
    <>
      <PageHeader title={t.purchases.new} subtitle={t.purchases.subtitle} />
      {missing ? (
        <Card>
          <EmptyState
            title={missing === "products" ? t.products.emptyTitle : t.suppliers.emptyTitle}
            text={missing === "products" ? t.products.emptyText : t.suppliers.emptyText}
            action={<Button asChild><Link href={`/${missing}`}>{missing === "products" ? t.products.new : t.suppliers.new}</Link></Button>}
          />
        </Card>
      ) : (
        <PurchaseForm products={products!} suppliers={suppliers!} defaultSupplier={sp.supplier} defaultDate={today()}
          defaultPaid={settings?.default_purchase_paid ?? false} />
      )}
    </>
  );
}

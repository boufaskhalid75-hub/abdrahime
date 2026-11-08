import { notFound, redirect } from "next/navigation";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { SaleForm } from "@/components/forms/sale-form";
import { today } from "@/lib/dates";

export default async function EditSalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, t } = await getContext();
  const { data: o } = await supabase.from("orders").select("*, order_items(product_id, quantity_kg, unit_price)").eq("id", id).maybeSingle();
  if (!o) notFound();
  if (o.status !== "confirmed") redirect(`/sales/${id}`);
  const items = (o.order_items ?? []) as { product_id: string; quantity_kg: number; unit_price: number }[];
  const ids = items.map((i) => i.product_id);
  const [{ data: products }, { data: customers }, { data: prices }] = await Promise.all([
    supabase.from("products").select("id, name, sale_price, stock_kg, is_active").or(`is_active.eq.true,id.in.(${ids.join(",") || "00000000-0000-0000-0000-000000000000"})`).order("name"),
    supabase.from("customers").select("id, name, phone").eq("id", o.customer_id),
    supabase.from("customer_product_prices").select("customer_id, product_id, sale_price").eq("customer_id", o.customer_id),
  ]);
  return (
    <>
      <PageHeader title={`${t.sales.editOrder} ${o.reference}`} />
      <SaleForm products={products ?? []} customers={customers ?? []} prices={prices ?? []} defaultDate={today()}
        edit={{ orderId: o.id, customerId: o.customer_id, date: o.order_date, discount: Number(o.discount_amount), notes: o.notes ?? "",
          items: items.map((i) => ({ product_id: i.product_id, quantity_kg: Number(i.quantity_kg), unit_price: Number(i.unit_price) })) }} />
    </>
  );
}

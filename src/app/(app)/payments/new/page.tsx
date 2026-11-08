import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { PaymentForm } from "@/components/forms/payment-form";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { today } from "@/lib/dates";

export default async function NewPaymentPage({ searchParams }: { searchParams: Promise<{ customer?: string; invoice?: string }> }) {
  const { supabase, t } = await getContext();
  const sp = await searchParams;
  const [{ data: customers }, { data: invoices }] = await Promise.all([
    supabase.from("v_customer_balances").select("id, name, outstanding, unpaid_count").gt("outstanding", 0).order("name"),
    supabase.from("v_invoice_balances").select("id, invoice_number, invoice_date, customer_id, total_amount, age_days").eq("status", "unpaid").order("invoice_date").order("invoice_number"),
  ]);
  return (
    <>
      <PageHeader title={t.payments.new} subtitle={t.payments.subtitle} />
      {customers?.length ? (
        <PaymentForm customers={customers} invoices={invoices ?? []} defaultCustomer={sp.customer} defaultInvoice={sp.invoice} defaultDate={today()} />
      ) : <Card><EmptyState title={t.receivables.emptyTitle} text={t.receivables.emptyText} /></Card>}
    </>
  );
}

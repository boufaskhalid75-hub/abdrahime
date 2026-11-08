import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type StatementLine = {
  id: string; invoice_number: string; invoice_date: string; total: number; status: string;
  paid_amount: number; outstanding: number; payment_date: string | null; running: number;
};

/** Customer statement computed from invoices and payment allocations (never from stored balances). */
export async function buildStatement(supabase: SupabaseClient, customerId: string, from?: string, to?: string) {
  const { data: customer } = await supabase.from("v_customer_balances").select("*").eq("id", customerId).maybeSingle();
  if (!customer) return null;
  let q = supabase.from("v_invoice_balances").select("*").eq("customer_id", customerId).neq("status", "cancelled")
    .order("invoice_date").order("invoice_number");
  if (from) q = q.gte("invoice_date", from);
  if (to) q = q.lte("invoice_date", to);
  const { data: rows } = await q;
  let running = 0;
  const lines: StatementLine[] = (rows ?? []).map((r) => {
    running += Number(r.outstanding_amount);
    return {
      id: r.id, invoice_number: r.invoice_number, invoice_date: r.invoice_date, total: Number(r.total_amount), status: r.status,
      paid_amount: Number(r.paid_amount), outstanding: Number(r.outstanding_amount), payment_date: r.last_payment_date, running,
    };
  });
  const { data: settings } = await supabase.from("business_settings").select("*").maybeSingle();
  return {
    customer,
    settings,
    lines,
    totals: {
      invoiced: lines.reduce((a, l) => a + l.total, 0),
      paid: lines.reduce((a, l) => a + l.paid_amount, 0),
      outstanding: lines.reduce((a, l) => a + l.outstanding, 0),
    },
  };
}

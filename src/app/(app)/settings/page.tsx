import type { Metadata } from "next";
import { Download } from "lucide-react";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ActiveBadge } from "@/components/shared/status-badge";
import { ArchiveButton } from "@/components/forms/archive-button";
import { NewCategoryButton, SettingsForm, ValuationCard } from "./settings-form";
import { categoryLabel } from "@/lib/labels";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const { supabase, t, f } = await getContext();
  const [{ data: s }, { count: outflows }, { data: cats }, { data: audit }] = await Promise.all([
    supabase.from("business_settings").select("*").single(),
    supabase.from("stock_movements").select("id", { count: "exact", head: true }).lt("quantity_kg", 0),
    supabase.from("expense_categories").select("*").order("created_at"),
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50),
  ]);
  const v = (x: unknown) => (x ?? "") as string;
  return (
    <>
      <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {s && (
            <SettingsForm initial={{
              business_name: s.business_name, address: v(s.address), city: v(s.city), phone: v(s.phone), email: v(s.email),
              ice: v(s.ice), rc: v(s.rc), if_number: v(s.if_number), patente: v(s.patente), logo_url: v(s.logo_url),
              invoice_footer: v(s.invoice_footer), invoice_prefix: s.invoice_prefix, order_prefix: s.order_prefix,
              purchase_prefix: s.purchase_prefix, payment_prefix: s.payment_prefix, auto_invoice_on_delivery: s.auto_invoice_on_delivery,
              default_purchase_paid: s.default_purchase_paid, low_stock_alerts: s.low_stock_alerts,
            }} />
          )}
        </div>
        <div className="space-y-6">
          <ValuationCard method={s?.valuation_method ?? "CUMP"} locked={(outflows ?? 0) > 0} />
          <Card>
            <CardHeader><CardTitle>{t.settings.categories}</CardTitle><NewCategoryButton /></CardHeader>
            <ul className="divide-y divide-line">
              {(cats ?? []).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                  <span>{categoryLabel(c, t)}</span>
                  <span className="flex items-center gap-2"><ActiveBadge active={c.is_active} t={t} />
                    <ArchiveButton table="expense_categories" id={c.id} active={c.is_active} confirmText="" /></span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t.settings.backup}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted">{t.settings.backupHelp}</p>
              <Button asChild variant="secondary"><a href="/api/export/backup"><Download />{t.settings.exportAll}</a></Button>
            </CardContent>
          </Card>
        </div>
        <Card className="xl:col-span-3">
          <CardHeader><CardTitle>{t.settings.audit}</CardTitle></CardHeader>
          <Table>
            <THead><TR><TH>{t.common.date}</TH><TH>{t.settings.action}</TH><TH>{t.settings.entity}</TH><TH>{t.common.details}</TH></TR></THead>
            <TBody>
              {(audit ?? []).map((a) => (
                <TR key={a.id}>
                  <TD className="whitespace-nowrap">{f.dateTime(a.created_at)}</TD>
                  <TD><code className="text-xs">{a.action}</code></TD>
                  <TD><code className="text-xs">{a.entity_type}</code></TD>
                  <TD className="max-w-xl truncate font-mono text-xs text-muted" title={JSON.stringify(a.details)}>{JSON.stringify(a.details)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      </div>
    </>
  );
}

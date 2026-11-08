"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/input";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { FormDialog } from "@/components/shared/form-dialog";
import { useI18n } from "@/lib/i18n/client";
import { settingsSchema, type SettingsInput } from "@/lib/schemas";
import { saveExpenseCategory, saveSettings, setValuationMethod } from "@/lib/actions";

export function SettingsForm({ initial }: { initial: SettingsInput }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const form = useForm<SettingsInput, unknown, z.output<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema) as unknown as Resolver<SettingsInput, unknown, z.output<typeof settingsSchema>>,
    defaultValues: initial,
  });
  const e = form.formState.errors;
  const err = (k: keyof SettingsInput) => {
    const m = e[k]?.message as string | undefined;
    return m ? ((t.validation as Record<string, string>)[m] ?? t.validation.required) : undefined;
  };
  const text = (k: keyof SettingsInput, label: string, extra: React.ComponentProps<"input"> = {}) => (
    <Field label={label} htmlFor={`s-${k}`} error={err(k)}>
      <Input id={`s-${k}`} aria-invalid={err(k) ? true : undefined} {...form.register(k)} {...extra} />
    </Field>
  );
  const submit = form.handleSubmit((v) => start(async () => {
    const r = await saveSettings(v);
    if (r.ok) { toast.success(t.common.saved); router.refresh(); } else toast.error(r.error);
  }));

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{t.settings.business}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {text("business_name", t.settings.businessName)}
          {text("phone", t.common.phone, { dir: "ltr", type: "tel" })}
          {text("address", t.common.address)}
          {text("city", t.settings.city)}
          {text("email", t.common.email, { dir: "ltr", type: "email" })}
          {text("logo_url", t.settings.logoUrl, { dir: "ltr", type: "url", placeholder: "https://…" })}
          <p className="text-xs text-muted sm:col-span-2">{t.settings.legalHelp}</p>
          {text("ice", t.settings.ice, { dir: "ltr" })}
          {text("rc", t.settings.rc, { dir: "ltr" })}
          {text("if_number", t.settings.ifNumber, { dir: "ltr" })}
          {text("patente", t.settings.patente, { dir: "ltr" })}
          <Field label={t.settings.invoiceFooter} htmlFor="s-footer" className="sm:col-span-2">
            <Textarea id="s-footer" {...form.register("invoice_footer")} maxLength={500} />
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t.settings.numbering}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          {text("invoice_prefix", t.settings.invoicePrefix, { dir: "ltr" })}
          {text("order_prefix", t.settings.orderPrefix, { dir: "ltr" })}
          {text("purchase_prefix", t.settings.purchasePrefix, { dir: "ltr" })}
          {text("payment_prefix", t.settings.paymentPrefix, { dir: "ltr" })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t.settings.rules}</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <label className="flex items-center gap-2"><Checkbox {...form.register("auto_invoice_on_delivery")} />{t.settings.autoInvoice}</label>
          <label className="flex items-center gap-2"><Checkbox {...form.register("default_purchase_paid")} />{t.settings.defaultPurchasePaid}</label>
          <label className="flex items-center gap-2"><Checkbox {...form.register("low_stock_alerts")} />{t.settings.lowStockAlerts}</label>
        </CardContent>
      </Card>
      <div className="flex justify-end"><Button type="submit" disabled={pending}>{pending ? t.common.saving : t.common.save}</Button></div>
    </form>
  );
}

export function ValuationCard({ method, locked }: { method: string; locked: boolean }) {
  const { t } = useI18n();
  const other = method === "CUMP" ? "FIFO" : "CUMP";
  return (
    <Card>
      <CardHeader><CardTitle>{t.settings.valuation}</CardTitle><span className="rounded-md bg-navy px-2 py-1 text-xs font-semibold text-white">{method}</span></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted">{t.settings.valuationHelp}</p>
        {locked ? <p className="rounded-lg bg-warning-50 p-3 text-warning">{t.settings.valuationLocked}</p> : (
          <ConfirmAction label={`${t.settings.valuationChange} → ${other}`} title={`${t.settings.valuationChange} → ${other}`} description={t.settings.valuationHelp}
            action={() => setValuationMethod(other)} />
        )}
      </CardContent>
    </Card>
  );
}

export function NewCategoryButton() {
  const { t } = useI18n();
  return (
    <FormDialog trigger={t.expenses.newCategory} icon={<Plus />} triggerVariant="secondary" triggerSize="sm" title={t.expenses.newCategory}
      schema={z.object({ name: z.string().trim().min(1, "required").max(80, "tooLong") })} defaultValues={{ name: "" }}
      fields={[{ name: "name", label: t.common.name, required: true, full: true }]} submit={(v) => saveExpenseCategory(v.name)} />
  );
}

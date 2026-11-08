"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Combobox } from "@/components/shared/combobox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/client";
import { checkPayment, sumMoney } from "@/lib/finance";
import { recordPayment } from "@/lib/actions";
import { cn } from "@/lib/utils";

type Inv = { id: string; invoice_number: string; invoice_date: string; customer_id: string; total_amount: number; age_days: number };
type Customer = { id: string; name: string; outstanding: number; unpaid_count: number };

export function PaymentForm({ customers, invoices, defaultCustomer, defaultInvoice, defaultDate }: {
  customers: Customer[]; invoices: Inv[]; defaultCustomer?: string; defaultInvoice?: string; defaultDate: string;
}) {
  const { t, f } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [customerId, setCustomerId] = useState(defaultCustomer ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultInvoice ? [defaultInvoice] : []));
  const [method, setMethod] = useState<"cash" | "bank_transfer" | "other">("cash");
  const [date, setDate] = useState(defaultDate);
  const [ref, setRef] = useState("");
  const [notes, setNotes] = useState("");
  const [confirm, setConfirm] = useState(false);

  const list = useMemo(() => invoices.filter((i) => i.customer_id === customerId), [invoices, customerId]);
  const chosen = list.filter((i) => selected.has(i.id));
  const total = sumMoney(chosen.map((i) => Number(i.total_amount)));
  const check = checkPayment(customerId, chosen.map((i) => ({ id: i.id, customerId: i.customer_id, total: Number(i.total_amount), status: "unpaid" as const })), total);
  const allSelected = list.length > 0 && chosen.length === list.length;

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const submit = () =>
    start(async () => {
      const r = await recordPayment({
        customer_id: customerId, invoice_ids: chosen.map((i) => i.id), amount: total, method, payment_date: date,
        external_reference: ref, notes, idempotency_key: key,
      });
      if (r.ok) {
        toast.success(t.payments.created);
        setKey(crypto.randomUUID());
        setConfirm(false);
        router.push(`/payments/${r.data}`);
      } else {
        toast.error(r.error);
        setConfirm(false);
        router.refresh();
      }
    });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader><CardTitle>{t.payments.selectCustomer}</CardTitle></CardHeader>
          <CardContent>
            <Combobox autoFocus value={customerId} onChange={(v) => { setCustomerId(v); setSelected(new Set()); }}
              options={customers.map((c) => ({ value: c.id, label: c.name, hint: `${f.money(c.outstanding)} · ${c.unpaid_count} ${t.invoices.status.unpaid.toLowerCase()}` }))} />
          </CardContent>
        </Card>
        {customerId && (
          <Card>
            <CardHeader>
              <CardTitle>{t.payments.selectInvoices}</CardTitle>
              {list.length > 0 && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(list.map((i) => i.id)))} />
                  {t.payments.selectAll}
                </label>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="flex items-start gap-2 rounded-lg bg-brand-50 p-3 text-sm text-navy"><Info className="mt-0.5 size-4 shrink-0" />{t.payments.fullOnly}</p>
              {list.length === 0 && <p className="py-6 text-center text-sm text-muted">{t.payments.noUnpaid}</p>}
              {list.map((i) => (
                <label key={i.id} className={cn("flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 transition-colors",
                  selected.has(i.id) ? "border-brand bg-brand-50/60" : "border-line hover:bg-bg")}>
                  <span className="flex items-center gap-3">
                    <Checkbox checked={selected.has(i.id)} onChange={() => toggle(i.id)} />
                    <span>
                      <span className="ltr block font-medium">{i.invoice_number}</span>
                      <span className="block text-xs text-muted">{f.date(i.invoice_date)} · {i.age_days} {t.invoices.days}</span>
                    </span>
                  </span>
                  <span className="num ltr font-semibold">{f.money(i.total_amount)}</span>
                </label>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
      <div>
        <Card className="lg:sticky lg:top-20">
          <CardHeader><CardTitle>{t.payments.paymentDetails}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-bg p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-muted">{t.payments.selectedTotal}</p>
              <p className="num ltr mt-1 text-3xl font-semibold text-navy">{f.money(total)}</p>
              <p className="text-xs text-muted">{chosen.length} {t.payments.selectedCount}</p>
            </div>
            <Field label={t.common.method} htmlFor="method">
              <NativeSelect id="method" value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
                {(["cash", "bank_transfer", "other"] as const).map((m) => <option key={m} value={m}>{t.methods[m]}</option>)}
              </NativeSelect>
            </Field>
            <Field label={t.common.date} htmlFor="pdate"><Input id="pdate" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label={t.payments.externalRef} htmlFor="ref"><Input id="ref" value={ref} onChange={(e) => setRef(e.target.value)} maxLength={120} dir="ltr" /></Field>
            <Field label={t.common.notes} htmlFor="pnotes"><Textarea id="pnotes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} /></Field>
            <Button size="lg" variant="success" className="w-full" disabled={!check.ok || !date || pending} onClick={() => setConfirm(true)}>
              {t.payments.confirmTitle}
            </Button>
          </CardContent>
        </Card>
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent title={t.payments.confirmTitle} description={t.payments.confirmText}>
          <div className="space-y-2 text-sm">
            <p className="font-medium">{customers.find((c) => c.id === customerId)?.name}</p>
            {chosen.map((i) => (
              <div key={i.id} className="flex justify-between"><span className="ltr">{i.invoice_number}</span><span className="num ltr">{f.money(i.total_amount)}</span></div>
            ))}
            <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><span>{t.common.total} · {t.methods[method]}</span><span className="num ltr">{f.money(total)}</span></div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirm(false)} disabled={pending}>{t.common.cancel}</Button>
            <Button variant="success" onClick={submit} disabled={pending}>{pending ? t.common.saving : t.common.confirm}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

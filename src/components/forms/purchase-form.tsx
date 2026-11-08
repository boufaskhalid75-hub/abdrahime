"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Combobox } from "@/components/shared/combobox";
import { useI18n } from "@/lib/i18n/client";
import { documentTotals, lineTotal, validateLine } from "@/lib/finance";
import { createPurchase } from "@/lib/actions";

type Product = { id: string; name: string; purchase_price: number; stock_kg: number };
type Supplier = { id: string; name: string };
type Values = {
  supplier_id: string; purchase_date: string; paid: boolean; payment_method: "cash" | "bank_transfer" | "other";
  update_prices: boolean; notes: string; items: { product_id: string; quantity_kg: string; unit_price: string }[];
};

export function PurchaseForm({ products, suppliers, defaultSupplier, defaultDate, defaultPaid }: {
  products: Product[]; suppliers: Supplier[]; defaultSupplier?: string; defaultDate: string; defaultPaid: boolean;
}) {
  const { t, f } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<Values>({
    defaultValues: {
      supplier_id: defaultSupplier ?? (suppliers.length === 1 ? suppliers[0].id : ""),
      purchase_date: defaultDate, paid: defaultPaid, payment_method: "cash", update_prices: true, notes: "",
      items: [{ product_id: "", quantity_kg: "", unit_price: "" }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const items = useWatch({ control: form.control, name: "items" });
  const supplierId = useWatch({ control: form.control, name: "supplier_id" });
  const paid = useWatch({ control: form.control, name: "paid" });
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const parsed = items.map((l) => ({ quantityKg: Number(l.quantity_kg), unitPrice: Number(l.unit_price) }));
  const totals = documentTotals(parsed.filter((l) => Number.isFinite(l.quantityKg) && Number.isFinite(l.unitPrice)));
  const issues = items.map((l, i) => (l.product_id ? validateLine(parsed[i]) : "missing"));
  const valid = Boolean(supplierId) && items.length > 0 && issues.every((x) => x === null);

  const submit = form.handleSubmit((v) => {
    setSubmitted(true);
    if (!valid) return;
    start(async () => {
      const r = await createPurchase({
        supplier_id: v.supplier_id, purchase_date: v.purchase_date, paid: v.paid, payment_method: v.payment_method,
        update_prices: v.update_prices, notes: v.notes, idempotency_key: key,
        items: v.items.map((l) => ({ product_id: l.product_id, quantity_kg: Number(l.quantity_kg), unit_price: Number(l.unit_price) })),
      });
      if (r.ok) {
        toast.success(t.purchases.created);
        setKey(crypto.randomUUID());
        router.push(`/purchases/${r.data}`);
      } else toast.error(r.error);
    });
  });

  const lineError = (i: number) => {
    if (!submitted) return undefined;
    const x = issues[i];
    if (x === "missing") return t.validation.required;
    if (x) return t.errors[x as "invalid_quantity"];
    return undefined;
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label={t.purchases.supplier} htmlFor="supplier" required error={submitted && !supplierId ? t.validation.required : undefined}>
              <Combobox id="supplier" options={suppliers.map((s) => ({ value: s.id, label: s.name }))} value={supplierId}
                onChange={(v) => form.setValue("supplier_id", v)} invalid={submitted && !supplierId} autoFocus />
            </Field>
            <Field label={t.purchases.date} htmlFor="date" required>
              <Input id="date" type="date" {...form.register("purchase_date", { required: true })} />
            </Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t.purchases.lines}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {fields.map((fl, i) => {
              const line = items[i];
              const total = lineTotal(Number(line?.quantity_kg) || 0, Number(line?.unit_price) || 0);
              return (
                <div key={fl.id} className="grid grid-cols-2 gap-3 rounded-lg border border-line p-3 sm:grid-cols-12 sm:items-end sm:border-0 sm:p-0">
                  <Field label={i === 0 ? t.common.product : undefined} className="col-span-2 sm:col-span-5" error={lineError(i)}>
                    <Combobox
                      options={products.map((p) => ({ value: p.id, label: p.name, hint: `${t.stock.available}: ${f.kg(p.stock_kg)}` }))}
                      value={line?.product_id ?? ""}
                      invalid={Boolean(lineError(i))}
                      onChange={(v) => {
                        form.setValue(`items.${i}.product_id`, v);
                        const p = byId.get(v);
                        if (p && !form.getValues(`items.${i}.unit_price`)) form.setValue(`items.${i}.unit_price`, String(p.purchase_price ?? ""));
                      }}
                    />
                  </Field>
                  <Field label={i === 0 ? `${t.common.quantity} (${t.common.kg})` : undefined} className="sm:col-span-2">
                    <Input type="number" inputMode="decimal" step="0.001" min="0" className="num" aria-label={t.common.quantity} {...form.register(`items.${i}.quantity_kg`)} />
                  </Field>
                  <Field label={i === 0 ? `${t.common.unitPrice} (${t.common.currency}${t.common.perKg})` : undefined} className="sm:col-span-2">
                    <Input type="number" inputMode="decimal" step="0.01" min="0" className="num" aria-label={t.common.unitPrice} {...form.register(`items.${i}.unit_price`)} />
                  </Field>
                  <div className="flex h-10 items-center justify-between gap-2 sm:col-span-3">
                    <span className="num ltr text-sm font-medium">{f.money(total)}</span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} disabled={fields.length === 1} aria-label={t.common.removeLine}>
                      <Trash2 className="text-danger" />
                    </Button>
                  </div>
                </div>
              );
            })}
            <Button type="button" variant="secondary" size="sm" onClick={() => append({ product_id: "", quantity_kg: "", unit_price: "" })}>
              <Plus />{t.common.addLine}
            </Button>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-6">
        <Card className="lg:sticky lg:top-20">
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted">{t.common.quantity}</span>
              <span className="num ltr">{f.kg(totals.totalKg)}</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <span className="font-medium">{t.common.total}</span>
              <span className="num ltr text-2xl font-semibold text-navy">{f.money(totals.total)}</span>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox {...form.register("paid")} className="mt-0.5" />
              <span>{t.purchases.paidNow}<span className="block text-xs text-muted">{t.purchases.paidNowHelp}</span></span>
            </label>
            {paid && (
              <Field label={t.common.method} htmlFor="method">
                <NativeSelect id="method" {...form.register("payment_method")}>
                  <option value="cash">{t.methods.cash}</option>
                  <option value="bank_transfer">{t.methods.bank_transfer}</option>
                  <option value="other">{t.methods.other}</option>
                </NativeSelect>
              </Field>
            )}
            <label className="flex items-start gap-2 text-sm">
              <Checkbox {...form.register("update_prices")} className="mt-0.5" />
              <span>{t.purchases.updatePrices}</span>
            </label>
            <Field label={t.common.notes} htmlFor="notes">
              <Textarea id="notes" {...form.register("notes")} maxLength={1000} />
            </Field>
            <Button type="submit" className="w-full" size="lg" disabled={pending}>
              {pending ? t.common.saving : t.purchases.confirmTitle}
            </Button>
            <p className="text-xs text-muted">{t.purchases.confirmText}</p>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

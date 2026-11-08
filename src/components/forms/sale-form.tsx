"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/shared/combobox";
import { useI18n } from "@/lib/i18n/client";
import { documentTotals, lineTotal, roundKg, validateDiscount } from "@/lib/finance";
import { createOrder, updateOrder } from "@/lib/actions";
import { cn } from "@/lib/utils";

type Product = { id: string; name: string; sale_price: number; stock_kg: number };
type Customer = { id: string; name: string; phone?: string | null; outstanding?: number };
type Price = { customer_id: string; product_id: string; sale_price: number };
type Row = { qty: string; price: string; touched: boolean };

/**
 * Fast sale entry: every active product is listed (≈5), the owner types the KG
 * quantities; prices are pre-filled from the customer's specific price or the
 * default price and stay editable. Rows without quantity are ignored.
 */
export function SaleForm({ products, customers, prices, defaultCustomer, defaultDate, edit }: {
  products: Product[]; customers: Customer[]; prices: Price[]; defaultCustomer?: string; defaultDate: string;
  edit?: { orderId: string; customerId: string; date: string; discount: number; notes: string; items: { product_id: string; quantity_kg: number; unit_price: number }[] };
}) {
  const { t, f } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [customerId, setCustomerId] = useState(edit?.customerId ?? defaultCustomer ?? "");
  const [date, setDate] = useState(edit?.date ?? defaultDate);
  const [discount, setDiscount] = useState(edit ? String(edit.discount || "") : "");
  const [notes, setNotes] = useState(edit?.notes ?? "");
  const [deliverNow, setDeliverNow] = useState(!edit);
  const [submitted, setSubmitted] = useState(false);

  const priceFor = (cid: string, p: Product) => {
    const sp = prices.find((x) => x.customer_id === cid && x.product_id === p.id);
    return { price: sp ? Number(sp.sale_price) : Number(p.sale_price), source: sp ? "customer" : "default" } as const;
  };

  // Products that are referenced by the order being edited stay visible even if archived.
  const [rows, setRows] = useState<Record<string, Row>>(() => {
    const init: Record<string, Row> = {};
    for (const p of products) {
      const existing = edit?.items.find((i) => i.product_id === p.id);
      init[p.id] = existing
        ? { qty: String(existing.quantity_kg), price: String(existing.unit_price), touched: true }
        : { qty: "", price: String(priceFor(edit?.customerId ?? defaultCustomer ?? "", p).price), touched: false };
    }
    return init;
  });

  const selectCustomer = (cid: string) => {
    setCustomerId(cid);
    // refresh untouched prices for the new customer
    setRows((cur) => Object.fromEntries(products.map((p) => [p.id, cur[p.id].touched ? cur[p.id] : { ...cur[p.id], price: String(priceFor(cid, p).price) }])));
  };

  const lines = products
    .map((p) => ({ p, qty: Number(rows[p.id]?.qty), price: Number(rows[p.id]?.price) }))
    .filter((l) => rows[l.p.id]?.qty !== "" && Number.isFinite(l.qty));
  const totals = documentTotals(lines.map((l) => ({ quantityKg: l.qty, unitPrice: l.price })), Number(discount) || 0);
  const lineIssues = lines.filter((l) => !(roundKg(l.qty) > 0) || !(l.price >= 0));
  const stockIssues = deliverNow ? lines.filter((l) => roundKg(l.qty) > Number(l.p.stock_kg)) : [];
  const discountOk = validateDiscount(Number(discount) || 0, totals.subtotal);
  const valid = Boolean(customerId) && lines.length > 0 && lineIssues.length === 0 && discountOk && stockIssues.length === 0;
  const customer = useMemo(() => customers.find((c) => c.id === customerId), [customers, customerId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!valid) return;
    const items = lines.map((l) => ({ product_id: l.p.id, quantity_kg: l.qty, unit_price: l.price }));
    start(async () => {
      if (edit) {
        const r = await updateOrder(edit.orderId, { order_date: date, items, discount: Number(discount) || 0, notes });
        if (!r.ok) return void toast.error(r.error);
        toast.success(r.data === edit.orderId ? t.common.saved : t.sales.replaced);
        router.push(`/sales/${r.data}`);
        return;
      }
      const r = await createOrder({ customer_id: customerId, order_date: date, items, discount: Number(discount) || 0, deliver_now: deliverNow, notes, idempotency_key: key });
      if (!r.ok) return void toast.error(r.error);
      toast.success(t.sales.created);
      setKey(crypto.randomUUID());
      router.push(r.data.invoice_id ? `/invoices/${r.data.invoice_id}` : `/sales/${r.data.order_id}`);
    });
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader><CardTitle>1. {t.sales.step1}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label={t.common.customer} htmlFor="customer" required error={submitted && !customerId ? t.validation.required : undefined}>
              {edit ? (
                <Input id="customer" value={customer?.name ?? ""} disabled />
              ) : (
                <Combobox id="customer" autoFocus value={customerId} onChange={selectCustomer} invalid={submitted && !customerId}
                  options={customers.map((c) => ({ value: c.id, label: c.name, hint: [c.phone, Number(c.outstanding) > 0 ? `${t.customers.balance}: ${f.money(c.outstanding)}` : null].filter(Boolean).join(" · ") }))} />
              )}
            </Field>
            <Field label={t.sales.date} htmlFor="date" required>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>2. {t.sales.step2}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="hidden grid-cols-12 gap-3 px-1 text-xs font-semibold uppercase tracking-wide text-muted sm:grid">
              <span className="col-span-4">{t.common.product}</span>
              <span className="col-span-3">{t.common.quantity} ({t.common.kg})</span>
              <span className="col-span-3">{t.common.unitPrice} ({t.common.currency}{t.common.perKg})</span>
              <span className="col-span-2 text-end">{t.common.lineTotal}</span>
            </div>
            {products.map((p) => {
              const r = rows[p.id];
              const qty = Number(r.qty);
              const has = r.qty !== "";
              const over = deliverNow && has && roundKg(qty) > Number(p.stock_kg);
              const bad = has && !(roundKg(qty) > 0);
              const src = customerId ? priceFor(customerId, p).source : "default";
              return (
                <div key={p.id} className={cn("grid grid-cols-2 items-center gap-3 rounded-lg border p-3 sm:grid-cols-12 sm:border-transparent sm:p-1", has ? "border-brand/30 bg-brand-50/40" : "border-line")}>
                  <div className="col-span-2 sm:col-span-4">
                    <p className="font-medium">{p.name}</p>
                    <p className={cn("text-xs", Number(p.stock_kg) <= 0 ? "text-danger" : "text-muted")}>{t.sales.available}: {f.kg(p.stock_kg)}</p>
                  </div>
                  <div className="sm:col-span-3">
                    <Input type="number" inputMode="decimal" step="0.001" min="0" placeholder="0" aria-label={`${t.common.quantity} ${p.name}`}
                      aria-invalid={over || bad || undefined} className="num" value={r.qty}
                      onChange={(e) => setRows({ ...rows, [p.id]: { ...r, qty: e.target.value } })} />
                  </div>
                  <div className="sm:col-span-3">
                    <Input type="number" inputMode="decimal" step="0.01" min="0" aria-label={`${t.common.unitPrice} ${p.name}`} className="num" value={r.price}
                      onChange={(e) => setRows({ ...rows, [p.id]: { ...r, price: e.target.value, touched: true } })} />
                    {src === "customer" && !r.touched && <Badge tone="info" className="mt-1">{t.sales.priceSource.customer}</Badge>}
                  </div>
                  <div className="col-span-2 text-end sm:col-span-2">
                    <span className="num ltr font-medium">{has ? f.money(lineTotal(qty || 0, Number(r.price) || 0)) : "—"}</span>
                    {over && <p className="text-xs text-danger">{t.sales.insufficient}</p>}
                  </div>
                </div>
              );
            })}
            {submitted && lines.length === 0 && <p className="text-sm text-danger" role="alert">{t.errors.no_items}</p>}
          </CardContent>
        </Card>
      </div>
      <div>
        <Card className="lg:sticky lg:top-20">
          <CardHeader><CardTitle>3. {t.sales.step3}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted">{t.common.quantity}</span><span className="num ltr">{f.kg(totals.totalKg)}</span></div>
              <div className="flex justify-between"><span className="text-muted">{t.common.subtotal}</span><span className="num ltr">{f.money(totals.subtotal)}</span></div>
            </div>
            <Field label={t.common.discount} htmlFor="discount" hint={t.sales.discountHelp} error={!discountOk ? t.errors.invalid_discount : undefined}>
              <Input id="discount" type="number" step="0.01" min="0" inputMode="decimal" className="num" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </Field>
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <span className="font-medium">{t.common.total}</span>
              <span className="num ltr text-2xl font-semibold text-navy">{f.money(totals.total)}</span>
            </div>
            {!edit && (
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={deliverNow} onChange={(e) => setDeliverNow(e.target.checked)} className="mt-0.5" />
                <span>{t.sales.deliverNow}<span className="block text-xs text-muted">{t.sales.deliverNowHelp}</span></span>
              </label>
            )}
            {stockIssues.length > 0 && (
              <p className="flex items-start gap-2 rounded-lg bg-danger-50 p-3 text-sm text-danger" role="alert">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                {stockIssues.map((l) => `${l.p.name} (${f.kg(l.p.stock_kg)})`).join(", ")} — {t.sales.insufficient}
              </p>
            )}
            <Field label={t.common.notes} htmlFor="notes">
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
            </Field>
            <Button type="submit" size="lg" className="w-full" disabled={pending || (submitted && !valid)}>
              {pending ? t.common.saving : edit ? t.common.save : t.sales.confirmTitle}
            </Button>
            <p className="text-xs text-muted">{t.sales.confirmText}</p>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

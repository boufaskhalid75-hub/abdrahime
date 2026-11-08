"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import { saveCustomerPrices } from "@/lib/actions";

export function PricesEditor({ customerId, products, prices }: {
  customerId: string; products: { id: string; name: string; sale_price: number }[]; prices: Record<string, number>;
}) {
  const { t, f } = useI18n();
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(products.map((p) => [p.id, prices[p.id] !== undefined ? String(prices[p.id]) : ""])),
  );
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const payload = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim() === "" ? null : Number(v)]));
      const r = await saveCustomerPrices(customerId, payload);
      if (r.ok) { toast.success(t.customers.pricesSaved); router.refresh(); } else toast.error(r.error);
    });
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">{t.customers.specificPricesHelp}</p>
      {products.map((p) => (
        <div key={p.id} className="grid grid-cols-[1fr_8rem] items-center gap-3">
          <label htmlFor={`price-${p.id}`} className="text-sm">
            {p.name}
            <span className="block text-xs text-muted">{t.customers.defaultPrice}: <span className="num ltr">{f.money(p.sale_price)}</span></span>
          </label>
          <Input id={`price-${p.id}`} type="number" step="0.01" min="0" inputMode="decimal" className="num"
            placeholder={String(p.sale_price)} value={values[p.id]} onChange={(e) => setValues({ ...values, [p.id]: e.target.value })} />
        </div>
      ))}
      <Button onClick={save} disabled={pending} size="sm">{pending ? t.common.saving : t.common.save}</Button>
    </div>
  );
}

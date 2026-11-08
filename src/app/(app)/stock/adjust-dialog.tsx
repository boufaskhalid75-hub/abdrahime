"use client";
import { SlidersHorizontal } from "lucide-react";
import { FormDialog } from "@/components/shared/form-dialog";
import { useI18n } from "@/lib/i18n/client";
import { adjustmentSchema } from "@/lib/schemas";
import { adjustStock } from "@/lib/actions";

export function AdjustDialog({ products, today }: { products: { id: string; name: string }[]; today: string }) {
  const { t } = useI18n();
  return (
    <FormDialog
      trigger={t.stock.adjust} icon={<SlidersHorizontal />} triggerVariant="secondary" title={t.stock.adjust}
      schema={adjustmentSchema} success={t.stock.adjusted_ok}
      defaultValues={{ product_id: products[0]?.id ?? "", type: "damage_out", quantity_kg: "", movement_date: today, notes: "", unit_cost: "" }}
      fields={[
        { name: "product_id", label: t.common.product, type: "select", full: true, options: products.map((p) => ({ value: p.id, label: p.name })) },
        { name: "type", label: t.stock.adjustType, type: "select", options: (["damage_out", "adjustment_out", "adjustment_in"] as const).map((x) => ({ value: x, label: t.stock.types[x] })) },
        { name: "quantity_kg", label: `${t.common.quantity} (${t.common.kg})`, type: "number", step: "0.001", required: true },
        { name: "movement_date", label: t.common.date, type: "date" },
        { name: "unit_cost", label: t.stock.unitCostOptional, type: "number", step: "0.0001" },
        { name: "notes", label: t.common.reason, type: "textarea", required: true, placeholder: t.common.reasonPlaceholder },
      ]}
      submit={(v) => adjustStock(v)}
    />
  );
}

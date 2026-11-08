"use client";
import { z } from "zod";
import { Ban, Wallet } from "lucide-react";
import { FormDialog } from "@/components/shared/form-dialog";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { useI18n } from "@/lib/i18n/client";
import { cancelPurchase, payPurchase } from "@/lib/actions";

const paySchema = z.object({ method: z.enum(["cash", "bank_transfer", "other"]), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "required") });

export function PurchaseActions({ id, canPay, canCancel, today }: { id: string; canPay: boolean; canCancel: boolean; today: string }) {
  const { t } = useI18n();
  return (
    <>
      {canPay && (
        <FormDialog trigger={t.purchases.pay} icon={<Wallet />} triggerVariant="success" title={t.purchases.payTitle}
          schema={paySchema} defaultValues={{ method: "cash", date: today }}
          fields={[
            { name: "method", label: t.common.method, type: "select", options: (["cash", "bank_transfer", "other"] as const).map((m) => ({ value: m, label: t.methods[m] })) },
            { name: "date", label: t.common.date, type: "date" },
          ]}
          submit={(v) => payPurchase(id, v.method, v.date)} />
      )}
      {canCancel && (
        <ConfirmAction label={t.purchases.cancelTitle} icon={<Ban />} title={t.purchases.cancelTitle} description={t.purchases.cancelText}
          withReason variant="danger-outline" confirmVariant="danger" action={(r) => cancelPurchase(id, r)} />
      )}
    </>
  );
}

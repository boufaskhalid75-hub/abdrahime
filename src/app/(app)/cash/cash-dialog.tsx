"use client";
import { ArrowLeftRight } from "lucide-react";
import { FormDialog } from "@/components/shared/form-dialog";
import { useI18n } from "@/lib/i18n/client";
import { cashMovementSchema } from "@/lib/schemas";
import { recordCashMovement } from "@/lib/actions";

export function CashMovementDialog({ today }: { today: string }) {
  const { t } = useI18n();
  return (
    <FormDialog trigger={t.cash.movement} icon={<ArrowLeftRight />} triggerVariant="secondary" title={t.cash.movement} schema={cashMovementSchema} success={t.cash.created}
      defaultValues={{ movement_date: today, account: "cash", direction: "in", amount: "", kind: "manual", description: "" }}
      fields={[
        { name: "kind", label: t.cash.kind, type: "select", options: (["manual", "opening_balance"] as const).map((k) => ({ value: k, label: t.cash.kinds[k] })) },
        { name: "movement_date", label: t.common.date, type: "date" },
        { name: "account", label: t.cash.account, type: "select", options: (["cash", "bank", "other"] as const).map((a) => ({ value: a, label: t.accounts[a] })) },
        { name: "direction", label: t.common.status, type: "select", options: (["in", "out"] as const).map((d) => ({ value: d, label: t.cash.direction[d] })) },
        { name: "amount", label: `${t.common.amount} (${t.common.currency})`, type: "number", step: "0.01", required: true },
        { name: "description", label: t.common.description, required: true, full: true },
      ]}
      submit={(v) => recordCashMovement(v)} />
  );
}

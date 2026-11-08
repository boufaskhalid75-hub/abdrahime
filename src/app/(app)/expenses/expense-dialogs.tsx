"use client";
import { Ban, Plus } from "lucide-react";
import { FormDialog } from "@/components/shared/form-dialog";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { useI18n } from "@/lib/i18n/client";
import { expenseSchema } from "@/lib/schemas";
import { cancelExpense, createExpense } from "@/lib/actions";

export function NewExpenseDialog({ categories, today }: { categories: { id: string; label: string }[]; today: string }) {
  const { t } = useI18n();
  return (
    <FormDialog trigger={t.expenses.new} icon={<Plus />} title={t.expenses.new} schema={expenseSchema} success={t.expenses.created}
      defaultValues={{ category_id: categories[0]?.id ?? "", expense_date: today, amount: "", payment_method: "cash", description: "", notes: "" }}
      fields={[
        { name: "category_id", label: t.expenses.category, type: "select", options: categories.map((c) => ({ value: c.id, label: c.label })) },
        { name: "expense_date", label: t.common.date, type: "date" },
        { name: "amount", label: `${t.common.amount} (${t.common.currency})`, type: "number", step: "0.01", required: true },
        { name: "payment_method", label: t.common.method, type: "select", options: (["cash", "bank_transfer", "other"] as const).map((m) => ({ value: m, label: t.methods[m] })) },
        { name: "description", label: t.common.description, required: true, full: true },
        { name: "notes", label: t.common.notes, type: "textarea" },
      ]}
      submit={(v) => createExpense(v)} />
  );
}

export function CancelExpenseButton({ id }: { id: string }) {
  const { t } = useI18n();
  return <ConfirmAction label={t.common.cancel} icon={<Ban />} title={t.expenses.cancelTitle} description={t.expenses.cancelText}
    withReason variant="ghost" confirmVariant="danger" action={(r) => cancelExpense(id, r)} />;
}

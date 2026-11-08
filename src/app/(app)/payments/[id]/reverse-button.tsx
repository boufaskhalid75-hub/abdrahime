"use client";
import { Undo2 } from "lucide-react";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { useI18n } from "@/lib/i18n/client";
import { reversePayment } from "@/lib/actions";

export function ReversePaymentButton({ id }: { id: string }) {
  const { t } = useI18n();
  return <ConfirmAction label={t.payments.reverse} icon={<Undo2 />} title={t.payments.reverse} description={t.payments.reverseText}
    withReason variant="danger-outline" size="md" confirmVariant="danger" success={t.payments.reversed} action={(r) => reversePayment(id, r)} />;
}

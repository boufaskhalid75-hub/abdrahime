"use client";
import { Ban } from "lucide-react";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { useI18n } from "@/lib/i18n/client";
import { cancelInvoice } from "@/lib/actions";

export function CancelInvoiceButton({ id }: { id: string }) {
  const { t } = useI18n();
  return (
    <ConfirmAction label={t.invoices.cancelTitle} icon={<Ban />} title={t.invoices.cancelTitle} description={t.invoices.cancelText}
      withReason variant="danger-outline" size="md" confirmVariant="danger" action={(r) => cancelInvoice(id, r)} />
  );
}

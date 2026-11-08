"use client";
import Link from "next/link";
import { z } from "zod";
import { Ban, FileText, Pencil, PackageCheck, Undo2 } from "lucide-react";
import { FormDialog } from "@/components/shared/form-dialog";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";
import { cancelDelivery, cancelOrder, confirmDelivery, issueInvoice } from "@/lib/actions";

const deliverySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "required"), notes: z.string().max(1000).optional() });

export function DeliverButton({ orderId, today, size = "md" }: { orderId: string; today: string; size?: "sm" | "md" }) {
  const { t } = useI18n();
  return (
    <FormDialog trigger={t.deliveries.confirm} icon={<PackageCheck />} triggerVariant="success" triggerSize={size}
      title={t.deliveries.confirm} description={t.deliveries.confirmText} success={t.deliveries.delivered}
      schema={deliverySchema} defaultValues={{ date: today, notes: "" }}
      fields={[{ name: "date", label: t.deliveries.deliveryDate, type: "date", required: true }, { name: "notes", label: t.common.notes, type: "textarea" }]}
      submit={(v) => confirmDelivery(orderId, v.date, v.notes)} />
  );
}

export function CancelDeliveryButton({ deliveryId, size = "md" }: { deliveryId: string; size?: "sm" | "md" }) {
  const { t } = useI18n();
  return (
    <ConfirmAction label={t.deliveries.cancel} icon={<Undo2 />} title={t.deliveries.cancel} description={t.deliveries.cancelText}
      withReason variant="danger-outline" size={size} confirmVariant="danger" success={t.deliveries.cancelled}
      action={(r) => cancelDelivery(deliveryId, r)} />
  );
}

export function OrderActions({ order, deliveryId, invoiceId, invoicePaid, today }: {
  order: { id: string; status: string }; deliveryId: string | null; invoiceId: string | null; invoicePaid: boolean; today: string;
}) {
  const { t } = useI18n();
  return (
    <>
      {order.status === "confirmed" && (
        <>
          <DeliverButton orderId={order.id} today={today} />
          <Button asChild variant="secondary"><Link href={`/sales/${order.id}/edit`}><Pencil />{t.common.edit}</Link></Button>
          <ConfirmAction label={t.sales.cancelOrder} icon={<Ban />} title={t.sales.cancelOrder} description={t.sales.cancelOrderText}
            withReason variant="danger-outline" size="md" confirmVariant="danger" action={(r) => cancelOrder(order.id, r)} />
        </>
      )}
      {order.status === "delivered" && !invoiceId && (
        <ConfirmAction label={t.invoices.generate} icon={<FileText />} title={t.invoices.generate} variant="brand" size="md"
          success={t.invoices.generated} action={() => issueInvoice(order.id)} />
      )}
      {invoiceId && <Button asChild variant="brand"><Link href={`/invoices/${invoiceId}`}><FileText />{t.sales.invoice}</Link></Button>}
      {order.status === "delivered" && deliveryId && !invoicePaid && <CancelDeliveryButton deliveryId={deliveryId} />}
    </>
  );
}

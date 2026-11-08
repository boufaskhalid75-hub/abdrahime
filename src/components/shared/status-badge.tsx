import { Badge } from "@/components/ui/badge";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export function InvoiceStatus({ status, t }: { status: string; t: Dictionary }) {
  const tone: Record<string, Tone> = { unpaid: "warning", paid: "success", cancelled: "neutral" };
  return <Badge tone={tone[status] ?? "neutral"}>{t.invoices.status[status as keyof typeof t.invoices.status] ?? status}</Badge>;
}
export function OrderStatus({ status, t }: { status: string; t: Dictionary }) {
  const tone: Record<string, Tone> = { confirmed: "info", delivered: "success", cancelled: "neutral" };
  return <Badge tone={tone[status] ?? "neutral"}>{t.sales.status[status as keyof typeof t.sales.status] ?? status}</Badge>;
}
export function PurchaseStatus({ status, paymentStatus, t }: { status: string; paymentStatus: string; t: Dictionary }) {
  if (status === "cancelled") return <Badge tone="neutral">{t.purchases.cancelled}</Badge>;
  return paymentStatus === "paid" ? <Badge tone="success">{t.purchases.paid}</Badge> : <Badge tone="warning">{t.purchases.unpaid}</Badge>;
}
export function ActiveBadge({ active, t }: { active: boolean; t: Dictionary }) {
  return active ? <Badge tone="success">{t.common.active}</Badge> : <Badge tone="neutral">{t.common.inactive}</Badge>;
}
export function MovementBadge({ type, t }: { type: string; t: Dictionary }) {
  const tone: Record<string, Tone> = {
    purchase_in: "success", adjustment_in: "success", sale_return: "info",
    sale_out: "info", damage_out: "danger", adjustment_out: "warning", purchase_cancel: "neutral",
  };
  return <Badge tone={tone[type] ?? "neutral"}>{t.stock.types[type as keyof typeof t.stock.types] ?? type}</Badge>;
}

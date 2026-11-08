"use client";
import { Archive, ArchiveRestore } from "lucide-react";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { useI18n } from "@/lib/i18n/client";
import { setActive } from "@/lib/actions";

export function ArchiveButton({ table, id, active, confirmText }: {
  table: "products" | "suppliers" | "customers" | "expense_categories"; id: string; active: boolean; confirmText: string;
}) {
  const { t } = useI18n();
  return (
    <ConfirmAction
      label={active ? t.common.archive : t.common.restore}
      icon={active ? <Archive /> : <ArchiveRestore />}
      title={active ? t.common.archive : t.common.restore}
      description={active ? confirmText : undefined}
      variant={active ? "danger-outline" : "secondary"}
      confirmVariant={active ? "danger" : "primary"}
      action={() => setActive(table, id, !active)}
    />
  );
}

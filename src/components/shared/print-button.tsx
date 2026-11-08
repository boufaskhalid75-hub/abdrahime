"use client";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

export function PrintButton() {
  const { t } = useI18n();
  return <Button variant="secondary" onClick={() => window.print()}><Printer />{t.common.print}</Button>;
}

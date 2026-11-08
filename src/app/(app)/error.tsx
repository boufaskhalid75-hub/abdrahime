"use client";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-surface px-6 py-16 text-center">
      <span className="mb-3 rounded-full bg-danger-50 p-3 text-danger"><AlertTriangle className="size-6" /></span>
      <p className="font-medium">{t.common.errorTitle}</p>
      <p className="mt-1 max-w-md text-sm text-muted">{t.errors.generic}</p>
      <Button className="mt-4" variant="secondary" onClick={reset}>{t.common.retry}</Button>
    </div>
  );
}

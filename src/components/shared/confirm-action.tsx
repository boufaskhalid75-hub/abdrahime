"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import type { ActionResult } from "@/lib/errors";

/**
 * Button + confirmation dialog that runs a server action.
 * When `withReason` is set, a mandatory reason is collected (audit trail).
 */
export function ConfirmAction({
  label, title, description, action, success, withReason, variant = "secondary", size = "sm",
  confirmLabel, confirmVariant = "primary", icon, children, onDone,
}: {
  label: React.ReactNode;
  title: string;
  description?: string;
  action: (reason: string) => Promise<ActionResult<unknown>>;
  success?: string;
  withReason?: boolean;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  confirmLabel?: string;
  confirmVariant?: ButtonProps["variant"];
  icon?: React.ReactNode;
  children?: React.ReactNode;
  onDone?: (data: unknown) => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = () => {
    if (withReason && !reason.trim()) {
      setError(t.errors.reason_required);
      return;
    }
    start(async () => {
      const r = await action(reason.trim());
      if (r.ok) {
        toast.success(success ?? t.common.saved);
        setOpen(false);
        setReason("");
        onDone?.(r.data);
        router.refresh();
      } else {
        toast.error(r.error);
        setError(r.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); setError(null); }}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>{icon}{label}</Button>
      </DialogTrigger>
      <DialogContent title={title} description={description}>
        {children}
        {withReason && (
          <Field label={t.common.reason} htmlFor="reason" error={error ?? undefined} required>
            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.common.reasonPlaceholder} maxLength={500} autoFocus />
          </Field>
        )}
        {!withReason && error && <p className="text-sm text-danger" role="alert">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>{t.common.cancel}</Button>
          <Button variant={confirmVariant} onClick={run} disabled={pending}>{pending ? t.common.saving : (confirmLabel ?? t.common.confirm)}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

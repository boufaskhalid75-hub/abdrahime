"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import { saveDailyClosing } from "@/lib/actions";

export function DatePicker({ date }: { date: string }) {
  const { t } = useI18n();
  const router = useRouter();
  return <Input type="date" aria-label={t.common.date} value={date} className="w-auto" onChange={(e) => e.target.value && router.replace(`/cash/closing?date=${e.target.value}`)} />;
}

export function ClosingForm({ date, notes }: { date: string; notes: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState(notes);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <Field label={t.common.notes} htmlFor="closing-notes"><Textarea id="closing-notes" value={value} onChange={(e) => setValue(e.target.value)} maxLength={1000} /></Field>
      <Button disabled={pending} onClick={() => start(async () => {
        const r = await saveDailyClosing(date, value);
        if (r.ok) { toast.success(t.closing.saved); router.refresh(); } else toast.error(r.error);
      })}><Lock />{pending ? t.common.saving : t.closing.save}</Button>
    </div>
  );
}

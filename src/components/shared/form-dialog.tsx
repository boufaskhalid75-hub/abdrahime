"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type FieldValues, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox, Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import type { ActionResult } from "@/lib/errors";
import { cn } from "@/lib/utils";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea" | "email" | "date" | "select" | "checkbox" | "tel" | "url";
  required?: boolean;
  step?: string;
  hint?: string;
  options?: { value: string; label: string }[];
  full?: boolean;
  dir?: "ltr" | "rtl";
  placeholder?: string;
};

/** Generic accessible form in a dialog, validated client-side (zod) and server-side. */
export function FormDialog<S extends z.ZodType<FieldValues, FieldValues>>({
  trigger, title, description, schema, fields, defaultValues, submit, success, triggerVariant = "primary",
  triggerSize = "md", icon, onSuccess, wide,
}: {
  trigger: React.ReactNode; title: string; description?: string; schema: S; fields: FieldDef[];
  defaultValues: Record<string, unknown>; submit: (values: z.output<S>) => Promise<ActionResult<unknown>>;
  success?: string; triggerVariant?: ButtonProps["variant"]; triggerSize?: ButtonProps["size"];
  icon?: React.ReactNode; onSuccess?: (data: unknown) => void; wide?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const form = useForm<FieldValues, unknown, z.output<S>>({
    resolver: zodResolver(schema as never) as unknown as Resolver<FieldValues, unknown, z.output<S>>,
    defaultValues,
  });
  const errors = form.formState.errors;
  const msg = (name: string) => {
    const m = errors[name]?.message as string | undefined;
    return m ? ((t.validation as Record<string, string>)[m] ?? t.validation.required) : undefined;
  };

  const onSubmit = form.handleSubmit((values) =>
    start(async () => {
      const r = await submit(values);
      if (r.ok) {
        toast.success(success ?? t.common.saved);
        setOpen(false);
        form.reset(defaultValues);
        onSuccess?.(r.data);
        router.refresh();
      } else {
        toast.error(r.error);
      }
    }),
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) form.reset(defaultValues); }}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize}>{icon}{trigger}</Button>
      </DialogTrigger>
      <DialogContent title={title} description={description} wide={wide}>
        <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((f) => {
            const id = `f-${f.name}`;
            const err = msg(f.name);
            const common = { id, "aria-invalid": err ? true : undefined, ...form.register(f.name) };
            if (f.type === "checkbox") {
              return (
                <label key={f.name} className="flex items-start gap-2 text-sm sm:col-span-2">
                  <Checkbox {...form.register(f.name)} id={id} className="mt-0.5" />
                  <span>{f.label}{f.hint && <span className="block text-xs text-muted">{f.hint}</span>}</span>
                </label>
              );
            }
            return (
              <Field key={f.name} label={f.label} htmlFor={id} error={err} hint={f.hint} required={f.required}
                className={cn((f.full || f.type === "textarea") && "sm:col-span-2")}>
                {f.type === "textarea" ? (
                  <Textarea {...common} placeholder={f.placeholder} />
                ) : f.type === "select" ? (
                  <NativeSelect {...common}>
                    {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </NativeSelect>
                ) : (
                  <Input {...common} type={f.type ?? "text"} step={f.step} inputMode={f.type === "number" ? "decimal" : undefined}
                    dir={f.dir} placeholder={f.placeholder} className={f.type === "number" ? "num" : undefined} />
                )}
              </Field>
            );
          })}
          <div className="mt-2 flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>{t.common.cancel}</Button>
            <Button type="submit" disabled={pending}>{pending ? t.common.saving : t.common.save}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

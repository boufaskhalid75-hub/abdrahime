"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import { changePassword, setLocale, updateProfile } from "@/lib/actions";

export function ProfileForm({ fullName, phone }: { fullName: string; phone: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [tel, setTel] = useState(phone);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t.profile.fullName} htmlFor="p-name"><Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></Field>
      <Field label={t.common.phone} htmlFor="p-phone"><Input id="p-phone" value={tel} onChange={(e) => setTel(e.target.value)} dir="ltr" maxLength={40} /></Field>
      <Field label={t.profile.language} htmlFor="p-lang">
        <NativeSelect id="p-lang" value={locale} onChange={(e) => start(() => setLocale(e.target.value))}>
          <option value="fr">Français</option><option value="ar">العربية</option>
        </NativeSelect>
      </Field>
      <div className="flex items-end justify-end">
        <Button disabled={pending} onClick={() => start(async () => {
          const r = await updateProfile({ full_name: name, phone: tel });
          if (r.ok) { toast.success(t.common.saved); router.refresh(); } else toast.error(r.error);
        })}>{t.common.save}</Button>
      </div>
    </div>
  );
}

export function PasswordForm() {
  const { t } = useI18n();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (a.length < 8) return setError(t.profile.passwordMin);
    if (a !== b) return setError(t.profile.passwordMismatch);
    setError(null);
    start(async () => {
      const r = await changePassword(a);
      if (r.ok) { toast.success(t.profile.passwordChanged); setA(""); setB(""); } else toast.error(r.error);
    });
  };
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label={t.profile.password} htmlFor="pw1" hint={t.profile.passwordMin}><Input id="pw1" type="password" autoComplete="new-password" value={a} onChange={(e) => setA(e.target.value)} dir="ltr" /></Field>
      <Field label={t.profile.passwordConfirm} htmlFor="pw2" error={error ?? undefined}><Input id="pw2" type="password" autoComplete="new-password" value={b} onChange={(e) => setB(e.target.value)} dir="ltr" /></Field>
      <div className="sm:col-span-2 flex justify-end"><Button type="submit" variant="secondary" disabled={pending}>{t.profile.changePassword}</Button></div>
    </form>
  );
}

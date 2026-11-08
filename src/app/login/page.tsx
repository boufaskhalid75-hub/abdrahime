import Image from "next/image";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "./login-form";
import { LanguageToggle } from "./language-toggle";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { t } = await getI18n();
  const { next } = await searchParams;
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4 py-10">
      <div className="absolute end-4 top-4"><LanguageToggle /></div>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/brand/logo.svg" alt="" width={52} height={52} priority />
          <p className="mt-4 text-lg font-bold tracking-wide text-navy">{t.brand.name}</p>
          <p className="text-sm text-muted">{t.brand.tagline}</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h1 className="text-lg font-semibold">{t.auth.title}</h1>
          <p className="mb-5 text-sm text-muted">{t.auth.subtitle}</p>
          {!isSupabaseConfigured() && (
            <p className="mb-4 rounded-lg bg-warning-50 p-3 text-sm text-warning" role="alert">{t.auth.notConfigured}</p>
          )}
          <LoginForm next={next ?? ""} />
        </div>
        <p className="mt-6 text-center text-xs text-muted">{t.auth.privateNotice}</p>
      </div>
    </div>
  );
}

"use client";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { setLocale } from "@/lib/actions";

export function LanguageToggle() {
  const { locale, t } = useI18n();
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => setLocale(locale === "fr" ? "ar" : "fr"))}
      disabled={pending}
      aria-label={t.common.language}
      className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm hover:bg-bg"
    >
      <Languages className="size-4 text-muted" aria-hidden />
      {locale === "fr" ? "العربية" : "Français"}
    </button>
  );
}

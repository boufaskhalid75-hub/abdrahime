"use client";
import { createContext, useContext, useMemo } from "react";
import type { Locale } from "./config";
import { dictionaries, type Dictionary } from "./dictionaries";
import { makeFormatters } from "@/lib/format";

type Ctx = { locale: Locale; t: Dictionary; f: ReturnType<typeof makeFormatters> };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(() => {
    const t = dictionaries[locale];
    return { locale, t, f: makeFormatters(locale, t) };
  }, [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Languages, LogOut, Menu, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { navigation } from "./nav";
import { cn } from "@/lib/utils";
import { setLocale, signOut } from "@/lib/actions";

export function AppShell({ children, userEmail, businessName }: { children: React.ReactNode; userEmail: string; businessName: string }) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const groups = navigation(t);

  useEffect(() => setOpen(false), [pathname]);

  const sidebar = (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className="flex h-16 items-center gap-3 px-5">
        <Image src="/brand/logo.svg" alt="" width={32} height={32} priority />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-wide">{t.brand.name}</p>
          <p className="truncate text-[11px] text-white/60">{businessName}</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label={t.common.menu}>
        {groups.map((g) => (
          <div key={g.title} className="mt-4">
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">{g.title}</p>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = pathname === it.href || pathname.startsWith(`${it.href}/`);
                const Icon = it.icon;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        active ? "bg-white/12 font-medium text-white" : "text-white/75 hover:bg-white/8 hover:text-white",
                      )}
                    >
                      <Icon className={cn("size-4 shrink-0", active ? "text-[#8FB8E3]" : "text-white/60")} aria-hidden />
                      <span className="truncate">{it.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="min-h-dvh lg:ps-64">
      <aside className="no-print fixed inset-y-0 start-0 z-40 hidden w-64 lg:block">{sidebar}</aside>
      {open && (
        <div className="no-print fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-navy/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 start-0 w-72 max-w-[85vw] shadow-xl">
            <button onClick={() => setOpen(false)} className="absolute end-3 top-4 z-10 rounded-md p-1 text-white/80 hover:bg-white/10" aria-label={t.common.close}>
              <X className="size-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}
      <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-6">
        <button className="rounded-md p-2 text-ink hover:bg-bg lg:hidden" onClick={() => setOpen(true)} aria-label={t.common.menu}>
          <Menu className="size-5" />
        </button>
        <div className="flex-1" />
        <button
          onClick={() => start(() => setLocale(locale === "fr" ? "ar" : "fr"))}
          disabled={pending}
          className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-bg disabled:opacity-50"
          aria-label={t.common.language}
        >
          <Languages className="size-4 text-muted" aria-hidden />
          <span>{locale === "fr" ? "العربية" : "Français"}</span>
        </button>
        <div className="hidden text-end sm:block">
          <p className="max-w-48 truncate text-sm font-medium text-ink">{userEmail}</p>
        </div>
        <form action={signOut}>
          <button type="submit" className="rounded-lg p-2 text-muted hover:bg-bg hover:text-danger" aria-label={t.nav.logout} title={t.nav.logout}>
            <LogOut className="size-4 rtl:rotate-180" />
          </button>
        </form>
      </header>
      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Input, NativeSelect } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";
import { PRESETS } from "@/lib/dates";

export function PeriodFilter({ preset, from, to }: { preset: string; from: string; to: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [p, setP] = useState(preset);
  const [f, setF] = useState(from);
  const [tt, setTt] = useState(to);

  const go = (period: string, a?: string, b?: string) => {
    const next = new URLSearchParams(sp.toString());
    next.set("period", period);
    if (period === "custom" && a && b) {
      next.set("from", a);
      next.set("to", b);
    } else {
      next.delete("from");
      next.delete("to");
    }
    router.replace(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <div className="relative">
        <CalendarDays className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <NativeSelect
          aria-label={t.common.period}
          value={p}
          className="w-auto ps-9"
          onChange={(e) => {
            setP(e.target.value);
            if (e.target.value !== "custom") go(e.target.value);
          }}
        >
          {PRESETS.map((x) => (
            <option key={x} value={x}>{t.common[x]}</option>
          ))}
        </NativeSelect>
      </div>
      {p === "custom" && (
        <>
          <Input type="date" aria-label={t.common.from} value={f} onChange={(e) => setF(e.target.value)} className="w-auto" />
          <Input type="date" aria-label={t.common.to} value={tt} onChange={(e) => setTt(e.target.value)} className="w-auto" />
          <Button variant="secondary" onClick={() => go("custom", f, tt)} disabled={!f || !tt}>{t.common.apply}</Button>
        </>
      )}
    </div>
  );
}

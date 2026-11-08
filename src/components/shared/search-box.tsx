"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";

export function SearchBox({ param = "q", placeholder }: { param?: string; placeholder?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [value, setValue] = useState(sp.get(param) ?? "");
  const [, start] = useTransition();

  useEffect(() => {
    const id = setTimeout(() => {
      if ((sp.get(param) ?? "") === value) return;
      const next = new URLSearchParams(sp.toString());
      if (value) next.set(param, value);
      else next.delete(param);
      next.delete("page");
      start(() => router.replace(`${pathname}?${next.toString()}`));
    }, 300);
    return () => clearTimeout(id);
  }, [value, param, pathname, router, sp]);

  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder ?? t.common.search}
        aria-label={placeholder ?? t.common.search}
        className="ps-9"
      />
    </div>
  );
}

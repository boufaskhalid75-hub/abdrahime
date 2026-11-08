import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_SIZE } from "@/lib/query";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function Pager({ page, count, basePath, searchParams, t }: {
  page: number; count: number; basePath: string; searchParams: Record<string, string | undefined>; t: Dictionary;
}) {
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => v && k !== "page" && sp.set(k, v));
    sp.set("page", String(p));
    return `${basePath}?${sp}`;
  };
  return (
    <div className="no-print flex items-center justify-between border-t border-line px-4 py-3 text-sm text-muted">
      <span>{t.common.page} {page} {t.common.of} {pages} · {count}</span>
      <div className="flex gap-1">
        {page > 1 && <Link href={href(page - 1)} className="flex items-center gap-1 rounded-md border border-line px-2 py-1 hover:bg-bg"><ChevronLeft className="size-4 rtl:rotate-180" />{t.common.previous}</Link>}
        {page < pages && <Link href={href(page + 1)} className="flex items-center gap-1 rounded-md border border-line px-2 py-1 hover:bg-bg">{t.common.next}<ChevronRight className="size-4 rtl:rotate-180" /></Link>}
      </div>
    </div>
  );
}

import Link from "next/link";
import { cn } from "@/lib/utils";

/** Link-based segmented filter: keeps other search params. */
export function FilterTabs({
  items, param, current, searchParams, basePath,
}: {
  items: { value: string; label: string; count?: number }[];
  param: string;
  current: string;
  searchParams: Record<string, string | undefined>;
  basePath: string;
}) {
  return (
    <nav className="no-print flex flex-wrap gap-1 rounded-lg border border-line bg-surface p-1" aria-label="filters">
      {items.map((it) => {
        const sp = new URLSearchParams();
        Object.entries(searchParams).forEach(([k, v]) => v && k !== param && k !== "page" && sp.set(k, v));
        if (it.value) sp.set(param, it.value);
        const active = current === it.value;
        return (
          <Link
            key={it.value || "all"}
            href={`${basePath}${sp.toString() ? `?${sp}` : ""}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-navy text-white" : "text-muted hover:bg-bg hover:text-ink",
            )}
          >
            {it.label}
            {it.count !== undefined && <span className="ms-1.5 opacity-70">{it.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

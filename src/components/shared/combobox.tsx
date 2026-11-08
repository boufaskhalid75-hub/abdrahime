"use client";
import { useId, useMemo, useRef, useState } from "react";
import { Popover } from "radix-ui";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";

export type ComboOption = { value: string; label: string; hint?: string; disabled?: boolean };

/** Searchable selector (accessible listbox) for customers, products, suppliers. */
export function Combobox({
  options, value, onChange, placeholder, invalid, id, className, autoFocus,
}: {
  options: ComboOption[]; value: string; onChange: (v: string) => void; placeholder?: string;
  invalid?: boolean; id?: string; className?: string; autoFocus?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter((o) => o.label.toLowerCase().includes(s) || o.hint?.toLowerCase().includes(s)) : options;
  }, [q, options]);

  const pick = (o: ComboOption) => {
    if (o.disabled) return;
    onChange(o.value);
    setOpen(false);
    setQ("");
  };

  return (
    <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (o) setActive(0); }}>
      <Popover.Trigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={invalid || undefined}
          autoFocus={autoFocus}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 text-start text-sm focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 aria-[invalid=true]:border-danger",
            className,
          )}
        >
          <span className={cn("truncate", !selected && "text-muted/70")}>{selected?.label ?? placeholder ?? t.common.selectPlaceholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted" aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-[60] w-[var(--radix-popover-trigger-width)] min-w-56 rounded-lg border border-line bg-surface p-1 shadow-lg"
          onOpenAutoFocus={(e) => { e.preventDefault(); inputRef.current?.focus(); }}
        >
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              if (e.key === "Enter") { e.preventDefault(); if (filtered[active]) pick(filtered[active]); }
            }}
            placeholder={t.common.search}
            aria-label={t.common.search}
            className="mb-1 h-9 w-full rounded-md border border-line px-2 text-sm focus:outline-none focus:border-brand"
          />
          <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto">
            {filtered.length === 0 && <li className="px-2 py-3 text-center text-sm text-muted">{t.common.noResults}</li>}
            {filtered.map((o, i) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                aria-disabled={o.disabled}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(o)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-2 text-sm",
                  i === active && "bg-bg",
                  o.disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate">{o.label}</span>
                  {o.hint && <span className="block truncate text-xs text-muted">{o.hint}</span>}
                </span>
                {o.value === value && <Check className="size-4 text-brand" aria-hidden />}
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

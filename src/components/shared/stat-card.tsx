import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  navy: "bg-navy/5 text-navy",
  brand: "bg-brand-50 text-brand",
  success: "bg-success-50 text-success",
  warning: "bg-warning-50 text-warning",
  danger: "bg-danger-50 text-danger",
} as const;

export function StatCard({
  label, value, hint, icon: Icon, tone = "brand", valueClassName,
}: {
  label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: LucideIcon;
  tone?: keyof typeof tones; valueClassName?: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        {Icon && (
          <span className={cn("rounded-lg p-1.5", tones[tone])}>
            <Icon className="size-4" aria-hidden />
          </span>
        )}
      </div>
      <p className={cn("num ltr mt-2 text-xl font-semibold text-ink sm:text-2xl", valueClassName)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

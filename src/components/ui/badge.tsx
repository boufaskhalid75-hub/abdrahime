import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", {
  variants: {
    tone: {
      neutral: "bg-bg text-muted ring-1 ring-inset ring-line",
      info: "bg-brand-50 text-brand ring-1 ring-inset ring-brand-100",
      success: "bg-success-50 text-success ring-1 ring-inset ring-success/20",
      warning: "bg-warning-50 text-warning ring-1 ring-inset ring-warning/20",
      danger: "bg-danger-50 text-danger ring-1 ring-inset ring-danger/20",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}

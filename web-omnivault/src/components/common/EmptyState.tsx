import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  tone?: "neutral" | "danger";
}

export const EmptyState = ({ icon: Icon, title, description, action, className, tone = "neutral" }: EmptyStateProps) => (
  <div
    className={cn(
      "relative flex flex-col items-center justify-center overflow-hidden rounded-xl border px-6 py-14 text-center",
      tone === "danger" ? "border-destructive/25 bg-destructive/[0.04]" : "border-border/60 bg-card/30",
      className,
    )}
  >
    <div className="pointer-events-none absolute inset-0 grid-field opacity-40" aria-hidden />
    <div
      className={cn(
        "relative mb-5 grid size-14 place-items-center rounded-xl border",
        tone === "danger" ? "border-destructive/30 bg-destructive/10" : "border-primary/25 bg-primary/[0.07]",
      )}
    >
      <Icon className={cn("size-6", tone === "danger" ? "text-destructive" : "text-primary")} aria-hidden />
    </div>
    <h3 className="relative display text-lg font-bold tracking-tight">{title}</h3>
    <p className="relative mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
    {action ? <div className="relative mt-6">{action}</div> : null}
  </div>
);

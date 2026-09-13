import { AlertTriangle, CheckCircle2, Clock, Loader2, ShieldCheck, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral" | "violet";

const TONE_CLASS: Record<BadgeTone, string> = {
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  danger: "border-destructive/40 bg-destructive/10 text-destructive",
  info: "border-primary/40 bg-primary/10 text-primary",
  violet: "border-violet/40 bg-violet/10 text-violet",
  neutral: "border-border bg-muted/40 text-muted-foreground",
};

const TONE_ICON: Record<BadgeTone, ReactNode> = {
  success: <CheckCircle2 className="size-3" aria-hidden />,
  warning: <Clock className="size-3" aria-hidden />,
  danger: <XCircle className="size-3" aria-hidden />,
  info: <Loader2 className="size-3 animate-spin" aria-hidden />,
  violet: <ShieldCheck className="size-3" aria-hidden />,
  neutral: <AlertTriangle className="size-3" aria-hidden />,
};

interface StatusBadgeProps {
  tone: BadgeTone;
  label: string;
  withIcon?: boolean;
  className?: string;
}

export const StatusBadge = ({ tone, label, withIcon = true, className }: StatusBadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11px] font-semibold tracking-wide",
      TONE_CLASS[tone],
      className,
    )}
  >
    {withIcon ? TONE_ICON[tone] : null}
    {label}
  </span>
);

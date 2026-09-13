import { FlaskConical, Radio } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DataMode } from "@/types/protocol";

interface ModeBadgeProps {
  mode: DataMode;
  className?: string;
  size?: "sm" | "md";
}

/** Demo state must always be unmistakably labelled. */
export const ModeBadge = ({ mode, className, size = "md" }: ModeBadgeProps) => {
  const isDemo = mode === "demo";
  const Icon = isDemo ? FlaskConical : Radio;

  return (
    <span
      title={isDemo ? "Demo mode — isolated sample data, not live blockchain state" : "Live mode — real protocol state"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-bold uppercase tracking-[0.14em]",
        size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-[3px] text-[10px]",
        isDemo
          ? "border-warning/45 bg-warning/10 text-warning"
          : "border-success/45 bg-success/10 text-success",
        className,
      )}
    >
      <Icon className={size === "sm" ? "size-2.5" : "size-3"} aria-hidden />
      {isDemo ? "Demo" : "Live"}
    </span>
  );
};

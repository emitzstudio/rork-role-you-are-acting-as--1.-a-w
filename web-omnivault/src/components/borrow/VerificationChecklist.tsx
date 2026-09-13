import { motion } from "framer-motion";
import { Check, Loader2, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import type { VerificationCheck } from "@/types/protocol";

interface VerificationChecklistProps {
  checks: readonly VerificationCheck[];
  className?: string;
}

/** Technical checks performed by Chain B against the attestation. */
export const VerificationChecklist = ({ checks, className }: VerificationChecklistProps) => (
  <ul className={cn("grid gap-1.5 sm:grid-cols-2", className)} aria-label="Verification checks">
    {checks.map((check, index) => (
      <motion.li
        key={check.label}
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.04, duration: 0.3 }}
        className={cn(
          "flex items-center gap-2 rounded-lg border px-2.5 py-2",
          check.passed === true
            ? "border-success/25 bg-success/[0.05]"
            : check.passed === false
              ? "border-destructive/25 bg-destructive/[0.05]"
              : "border-border/60 bg-card/30",
        )}
      >
        {check.passed === true ? (
          <Check className="size-3.5 shrink-0 text-success" strokeWidth={3} aria-hidden />
        ) : check.passed === false ? (
          <Minus className="size-3.5 shrink-0 text-destructive" strokeWidth={3} aria-hidden />
        ) : (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
        )}
        <span className="min-w-0 flex-1 truncate text-[12px] text-foreground/85">{check.label}</span>
        {check.value ? (
          <span className="mono shrink-0 truncate text-[10.5px] text-muted-foreground">{check.value}</span>
        ) : null}
      </motion.li>
    ))}
  </ul>
);

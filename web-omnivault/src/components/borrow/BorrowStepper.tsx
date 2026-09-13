import { motion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { BorrowStage } from "@/types/protocol";

interface BorrowStepperProps {
  stages: readonly BorrowStage[];
  className?: string;
}

/** The five-stage cross-chain protocol flow: verify → attest → transmit → verify → issue. */
export const BorrowStepper = ({ stages, className }: BorrowStepperProps) => (
  <ol className={cn("flex items-start", className)} aria-label="Protocol flow">
    {stages.map((stage, index) => {
      const isLast = index === stages.length - 1;
      const done = stage.status === "success";
      const active = stage.status === "active";
      const failed = stage.status === "failed";

      return (
        <li key={stage.id} className={cn("relative flex min-w-0 flex-col items-center", !isLast && "flex-1")}>
          <div className="flex w-full items-center">
            <motion.div
              initial={false}
              animate={{ scale: active ? 1.06 : 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className={cn(
                "relative z-10 grid size-10 shrink-0 place-items-center rounded-full border-2 transition-colors duration-400",
                failed
                  ? "border-destructive bg-destructive/15 text-destructive"
                  : done
                    ? "border-success bg-success/15 text-success"
                    : active
                      ? "border-primary bg-primary/15 text-primary glow-blue"
                      : "border-border bg-card text-muted-foreground",
              )}
            >
              {failed ? (
                <X className="size-4" strokeWidth={3} aria-hidden />
              ) : done ? (
                <Check className="size-4" strokeWidth={3} aria-hidden />
              ) : active ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <span className="mono text-[12px] font-bold">{String(stage.index).padStart(2, "0")}</span>
              )}
            </motion.div>

            {!isLast ? (
              <div className="relative mx-1.5 h-[2px] flex-1 overflow-hidden rounded-full bg-border/70">
                <motion.div
                  className={cn("absolute inset-y-0 left-0", failed ? "bg-destructive" : "bg-primary")}
                  initial={{ width: 0 }}
                  animate={{ width: done ? "100%" : active ? "45%" : "0%" }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            ) : null}
          </div>

          <p
            className={cn(
              "mt-3 max-w-[130px] text-center text-[10.5px] font-bold uppercase leading-tight tracking-[0.08em] transition-colors",
              failed
                ? "text-destructive"
                : done
                  ? "text-foreground"
                  : active
                    ? "text-primary"
                    : "text-muted-foreground/55",
            )}
          >
            {stage.title}
          </p>
          <p className="mt-1 max-w-[140px] text-center text-[10.5px] leading-tight text-muted-foreground/70">
            {stage.description}
          </p>
        </li>
      );
    })}
  </ol>
);

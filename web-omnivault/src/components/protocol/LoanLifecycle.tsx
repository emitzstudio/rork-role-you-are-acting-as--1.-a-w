import { motion } from "framer-motion";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import type { LifecycleStage } from "@/hooks/useFlowState";
import { formatDateTime } from "@/utils/format";

interface LoanLifecycleProps {
  stages: readonly LifecycleStage[];
  className?: string;
  /** Show timestamps under each completed node. */
  detailed?: boolean;
}

/** Only stages that actually occurred are illuminated. */
export const LoanLifecycle = ({ stages, className, detailed = false }: LoanLifecycleProps) => {
  const lastCompleteIndex = stages.reduce(
    (last, stage, index) => (stage.complete ? index : last),
    -1,
  );

  return (
    <ol className={cn("flex items-start", className)} aria-label="Loan lifecycle">
      {stages.map((stage, index) => {
        const isLast = index === stages.length - 1;
        const connectorActive = index < lastCompleteIndex;

        return (
          <li key={stage.id} className={cn("relative flex min-w-0 flex-col items-center", !isLast && "flex-1")}>
            <div className="flex w-full items-center">
              <motion.div
                initial={false}
                animate={{ scale: stage.complete ? 1 : 0.92 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className={cn(
                  "relative z-10 grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors duration-500",
                  stage.complete
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                {stage.complete ? (
                  <Check className="size-3.5" strokeWidth={3} aria-hidden />
                ) : (
                  <span className="size-1.5 rounded-full bg-muted-foreground/40" aria-hidden />
                )}
              </motion.div>

              {!isLast ? (
                <div className="relative mx-1 h-[2px] flex-1 overflow-hidden rounded-full bg-border/70">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: connectorActive ? "100%" : "0%" }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: index * 0.08 }}
                  />
                </div>
              ) : null}
            </div>

            <p
              className={cn(
                "mt-2.5 max-w-[92px] truncate text-center text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors",
                stage.complete ? "text-foreground" : "text-muted-foreground/55",
              )}
              title={stage.label}
            >
              {stage.label}
            </p>

            {detailed ? (
              <p className="mono mt-1 max-w-[110px] text-center text-[9.5px] leading-tight text-muted-foreground/70">
                {stage.complete && stage.timestamp ? formatDateTime(stage.timestamp) : "—"}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
};

import { CheckCircle2 } from "lucide-react";

import { ATTACK_SCENARIOS } from "@/services/mock/attackScenarios";
import { cn } from "@/lib/utils";

interface SecurityMatrixProps {
  className?: string;
  /** Compact variant used for the Overview preview card. */
  compact?: boolean;
}

/** Compact 3×3 protection matrix — the protocol's attack-resistance at a glance. */
export const SecurityMatrix = ({ className, compact = false }: SecurityMatrixProps) => (
  <ul className={cn("grid gap-1.5", compact ? "grid-cols-3" : "grid-cols-3 gap-2", className)}>
    {ATTACK_SCENARIOS.map((scenario) => (
      <li
        key={scenario.id}
        title={`${scenario.title} — ${scenario.description}`}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border border-success/20 bg-success/[0.05] transition-colors hover:border-success/40",
          compact ? "px-2 py-1.5" : "px-2.5 py-2",
        )}
      >
        <CheckCircle2 className="size-3 shrink-0 text-success" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate font-medium", compact ? "text-[10.5px]" : "text-[11.5px]")}>
            {scenario.title}
          </span>
          {!compact ? (
            <span className="block text-[9.5px] uppercase tracking-wider text-success/70">Protected</span>
          ) : null}
        </span>
      </li>
    ))}
  </ul>
);

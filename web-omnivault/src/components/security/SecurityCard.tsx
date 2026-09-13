import {
  Clock,
  FileWarning,
  Layers,
  Link2Off,
  RefreshCcw,
  Scale,
  ServerCog,
  UserRoundX,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { StatusBadge } from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";
import type { AttackScenario, AttackScenarioId } from "@/types/protocol";

export const SCENARIO_ICON: Record<AttackScenarioId, LucideIcon> = {
  double_pledge: Layers,
  replay_attack: RefreshCcw,
  stale_proof: Clock,
  fake_signer: UserRoundX,
  wrong_chain: Link2Off,
  wrong_vault: ServerCog,
  tampered_amount: Scale,
  unauthorized_borrower: UsersRound,
  early_liquidation: FileWarning,
};

interface SecurityCardProps {
  scenario: AttackScenario;
  selected?: boolean;
  onSelect?: (id: AttackScenarioId) => void;
  className?: string;
}

export const SecurityCard = ({ scenario, selected = false, onSelect, className }: SecurityCardProps) => {
  const Icon = SCENARIO_ICON[scenario.id];
  const Component = onSelect ? "button" : "div";

  return (
    <Component
      {...(onSelect ? { type: "button" as const, onClick: () => onSelect(scenario.id) } : {})}
      className={cn(
        "panel panel-hover group flex flex-col p-5 text-left",
        selected && "border-primary/45",
        onSelect && "cursor-pointer",
        className,
      )}
      aria-pressed={onSelect ? selected : undefined}
      title={scenario.protection}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl border transition-colors",
            selected ? "border-primary/40 bg-primary/[0.12]" : "border-primary/25 bg-primary/[0.07]",
          )}
        >
          <Icon className="size-[18px] text-primary" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="display text-[15px] font-bold leading-tight tracking-tight">{scenario.title}</h3>
            <StatusBadge tone="success" label="Protected" className="shrink-0 text-[10px]" />
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{scenario.description}</p>
        </div>
      </div>

      <p className="mono mt-4 border-t border-border/40 pt-3 text-[10.5px] uppercase tracking-wider text-muted-foreground/70">
        {scenario.reasonCode}
      </p>
    </Component>
  );
};

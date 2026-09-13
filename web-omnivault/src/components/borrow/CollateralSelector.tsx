import { Check, ChevronDown, Lock } from "lucide-react";
import { useState, type ReactElement } from "react";

import { CopyButton } from "@/components/common/CopyButton";
import { StatusBadge } from "@/components/common/StatusBadge";
import { getChainById } from "@/config/chains";
import { cn } from "@/lib/utils";
import type { CollateralPosition } from "@/types/protocol";
import { formatToken, formatUsd, shortAddress } from "@/utils/format";

interface CollateralSelectorProps {
  positions: readonly CollateralPosition[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * The user always chooses which collateral backs a loan.
 * A position is never silently selected when several are eligible.
 */
export const CollateralSelector = ({
  positions,
  selectedId,
  onSelect,
  disabled = false,
  className,
}: CollateralSelectorProps) => {
  const [expanded, setExpanded] = useState<boolean>(positions.length > 1 && selectedId === null);

  const selected = positions.find((position) => position.id === selectedId) ?? null;
  const multiple = positions.length > 1;

  const renderRow = (position: CollateralPosition, interactive: boolean): ReactElement => {
    const chain = getChainById(position.chainId);
    const isSelected = position.id === selectedId;

    return (
      <div
        className={cn(
          "flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:gap-6",
          interactive && "transition-colors hover:bg-primary/[0.04]",
        )}
      >
        <div className="flex min-w-0 items-center gap-3.5 lg:w-[230px]">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/[0.08]">
            <Lock className="size-[18px] text-primary" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="display text-lg font-extrabold leading-none num tracking-tight">
              {formatToken(position.amount, position.assetSymbol, 4)}
            </p>
            <p className="mt-1 truncate text-[12px] text-muted-foreground">
              {position.valueUsd !== null ? `≈ ${formatUsd(position.valueUsd)}` : "Valuation unavailable"}
            </p>
          </div>
        </div>

        <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3">
          <div className="min-w-0">
            <dt className="label-tech">Collateral ID</dt>
            <dd className="mono mt-1 truncate text-[12.5px] font-medium">#{position.id}</dd>
          </div>
          <div className="min-w-0">
            <dt className="label-tech">Network</dt>
            <dd className="mt-1 truncate text-[12.5px] font-medium">{chain?.shortName ?? position.chainId}</dd>
          </div>
          <div className="min-w-0">
            <dt className="label-tech">Vault</dt>
            <dd className="mt-1 flex items-center gap-1">
              <span className="mono truncate text-[12px]">{shortAddress(position.vaultAddress, 6, 4)}</span>
              <CopyButton value={position.vaultAddress} label="Copy vault address" />
            </dd>
          </div>
        </dl>

        <div className="flex shrink-0 items-center gap-2.5">
          <StatusBadge tone="info" label="Locked" withIcon={false} />
          {interactive ? (
            <span
              className={cn(
                "grid size-5 place-items-center rounded-full border transition-colors",
                isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border",
              )}
              aria-hidden
            >
              {isSelected ? <Check className="size-3" strokeWidth={3} /> : null}
            </span>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <section className={cn("panel overflow-hidden", className)} aria-label="Select collateral">
      <header className="flex items-center justify-between gap-3 px-5 pt-4">
        <h2 className="label-tech text-foreground/85">Select Collateral</h2>
        {multiple ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            disabled={disabled}
            aria-expanded={expanded}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {expanded ? "Collapse" : `Change (${positions.length} eligible)`}
            <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} aria-hidden />
          </button>
        ) : null}
      </header>

      {expanded || selected === null ? (
        <div role="radiogroup" aria-label="Eligible collateral positions" className="mt-2">
          {positions.map((position) => (
            <button
              key={position.id}
              type="button"
              role="radio"
              aria-checked={position.id === selectedId}
              disabled={disabled}
              onClick={() => {
                onSelect(position.id);
                if (multiple) setExpanded(false);
              }}
              className={cn(
                "block w-full border-t border-border/50 text-left first:border-t-0",
                position.id === selectedId && "bg-primary/[0.05]",
              )}
            >
              {renderRow(position, true)}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-2">{renderRow(selected, false)}</div>
      )}

      {multiple && !expanded ? (
        <p className="hairline-t bg-background/30 px-5 py-2.5 text-[11.5px] text-muted-foreground">
          You have {positions.length} eligible positions. Choose which one backs this loan.
        </p>
      ) : null}
    </section>
  );
};

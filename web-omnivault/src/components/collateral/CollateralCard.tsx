import { Activity, ArrowRight, FileCheck2, Lock, Unlock } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { CopyButton } from "@/components/common/CopyButton";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { getChainById } from "@/config/chains";
import { cn } from "@/lib/utils";
import type { CollateralPosition } from "@/types/protocol";
import { formatDateTime, formatToken, formatUsd, shortAddress } from "@/utils/format";

interface CollateralCardProps {
  position: CollateralPosition;
  onBorrow?: (position: CollateralPosition) => void;
  onUnlock?: (position: CollateralPosition) => void;
  canUnlock?: boolean;
  className?: string;
}

const STATUS_META = {
  locked: { tone: "info" as const, label: "Locked" },
  pledged: { tone: "warning" as const, label: "Collateral in use" },
  unlocked: { tone: "neutral" as const, label: "Unlocked" },
  liquidated: { tone: "danger" as const, label: "Liquidated" },
};

export const CollateralCard = ({ position, onBorrow, onUnlock, canUnlock = false, className }: CollateralCardProps) => {
  const navigate = useNavigate();
  const chain = getChainById(position.chainId);
  const meta = STATUS_META[position.status];
  const isPledged = position.status === "pledged";
  const isUnlocked = position.status === "unlocked";

  return (
    <article
      className={cn(
        "panel panel-hover overflow-hidden",
        isPledged && "border-warning/30",
        isUnlocked && "opacity-70",
        className,
      )}
    >
      <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:gap-6">
        {/* asset identity */}
        <div className="flex min-w-0 items-center gap-3.5 lg:w-[220px]">
          <div
            className={cn(
              "grid size-12 shrink-0 place-items-center rounded-xl border",
              isUnlocked
                ? "border-border/70 bg-muted/20"
                : isPledged
                  ? "border-warning/30 bg-warning/[0.08]"
                  : "border-primary/30 bg-primary/[0.08]",
            )}
          >
            {isUnlocked ? (
              <Unlock className="size-5 text-muted-foreground" aria-hidden />
            ) : (
              <Lock className={cn("size-5", isPledged ? "text-warning" : "text-primary")} aria-hidden />
            )}
          </div>
          <div className="min-w-0">
            <p className="display text-lg font-extrabold leading-none num tracking-tight">
              {formatToken(position.amount, position.assetSymbol, 4)}
            </p>
            <p className="mt-1.5 truncate text-[12px] text-muted-foreground">
              {position.valueUsd !== null ? `≈ ${formatUsd(position.valueUsd)}` : "Valuation unavailable"}
            </p>
          </div>
        </div>

        {/* metadata */}
        <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-4">
          <Field label="Collateral ID" value={`#${position.id}`} mono />
          <Field label="Network" value={chain?.shortName ?? `Chain ${position.chainId}`} />
          <Field label="State Version" value={String(position.stateVersion)} mono />
          <Field
            label="Vault"
            value={shortAddress(position.vaultAddress, 6, 4)}
            mono
            copyValue={position.vaultAddress}
          />
        </dl>

        {/* status + actions */}
        <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
          <StatusBadge tone={meta.tone} label={meta.label} withIcon={false} />
          <div className="flex flex-wrap items-center gap-2">
            {position.status === "locked" && onBorrow ? (
              <Button size="sm" onClick={() => onBorrow(position)} className="h-8 gap-1.5 text-[12.5px]">
                Borrow
                <ArrowRight className="size-3.5" aria-hidden />
              </Button>
            ) : null}
            {isPledged && position.activeLoanId ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/loans/${position.activeLoanId}`)}
                className="h-8 gap-1.5 text-[12.5px]"
              >
                View loan
              </Button>
            ) : null}
            {position.status === "locked" && canUnlock && onUnlock ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUnlock(position)}
                className="h-8 gap-1.5 text-[12.5px]"
              >
                <Unlock className="size-3.5" aria-hidden />
                Unlock
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(`/proofs?collateral=${position.id}`)}
              aria-label="View proofs for this position"
              className="h-8 gap-1.5 px-2 text-[12.5px] text-muted-foreground"
            >
              <FileCheck2 className="size-3.5" aria-hidden />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(`/activity?collateral=${position.id}`)}
              aria-label="View activity for this position"
              className="h-8 gap-1.5 px-2 text-[12.5px] text-muted-foreground"
            >
              <Activity className="size-3.5" aria-hidden />
            </Button>
          </div>
        </div>
      </div>

      {isPledged ? (
        <p className="hairline-t bg-warning/[0.04] px-5 py-2.5 text-[12px] text-warning/90">
          This position is currently backing an active loan. Repay the loan to make it available again.
        </p>
      ) : (
        <p className="hairline-t bg-background/30 px-5 py-2.5 text-[11.5px] text-muted-foreground">
          Locked {formatDateTime(position.lockedAt)}
        </p>
      )}
    </article>
  );
};

const Field = ({
  label,
  value,
  mono = false,
  copyValue,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyValue?: string;
}) => (
  <div className="min-w-0">
    <dt className="label-tech">{label}</dt>
    <dd className="mt-1 flex items-center gap-1">
      <span className={cn("truncate text-[13px] font-medium", mono && "mono text-[12px]")}>{value}</span>
      {copyValue ? <CopyButton value={copyValue} label={`Copy ${label}`} /> : null}
    </dd>
  </div>
);

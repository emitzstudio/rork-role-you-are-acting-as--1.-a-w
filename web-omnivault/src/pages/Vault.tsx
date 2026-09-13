import { Lock, Plus, Vault as VaultIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { CollateralCard } from "@/components/collateral/CollateralCard";
import { LockCollateralDialog } from "@/components/collateral/LockCollateralDialog";
import { Metric } from "@/components/common/DataField";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { RowSkeletonList } from "@/components/common/Skeletons";
import { TransactionProgress } from "@/components/protocol/TransactionProgress";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CHAIN_A } from "@/config/chains";
import {
  useCapabilities,
  useCollateralPositions,
  useRefreshProtocol,
  useSessionOwner,
  useWalletBalance,
} from "@/hooks/useProtocolData";
import { useTransaction } from "@/hooks/useTransaction";
import { getServices } from "@/services";
import type { CollateralPosition } from "@/types/protocol";
import { formatToken, formatUsd } from "@/utils/format";

const Vault = () => {
  const navigate = useNavigate();
  const { mode } = useSessionOwner();
  const positionsQuery = useCollateralPositions();
  const { data: balance } = useWalletBalance();
  const { data: capabilities } = useCapabilities();
  const refresh = useRefreshProtocol();
  const unlockTx = useTransaction(CHAIN_A.chainId);

  const [lockOpen, setLockOpen] = useState<boolean>(false);
  const [unlockTarget, setUnlockTarget] = useState<CollateralPosition | null>(null);

  const positions = positionsQuery.data ?? [];
  const activePositions = useMemo(
    () => positions.filter((position) => position.status !== "unlocked"),
    [positions],
  );
  const historicPositions = useMemo(
    () => positions.filter((position) => position.status === "unlocked"),
    [positions],
  );

  const totals = useMemo(() => {
    const valued = activePositions.some((position) => position.valueUsd !== null);
    return {
      total: valued ? activePositions.reduce((sum, position) => sum + (position.valueUsd ?? 0), 0) : null,
      lockedAmount: activePositions
        .filter((position) => position.status === "locked")
        .reduce((sum, position) => sum + position.amount, 0),
      pledgedAmount: activePositions
        .filter((position) => position.status === "pledged")
        .reduce((sum, position) => sum + position.amount, 0),
      symbol: activePositions[0]?.assetSymbol ?? CHAIN_A.nativeCurrency.symbol,
    };
  }, [activePositions]);

  const handleUnlock = useCallback(async (): Promise<void> => {
    if (!unlockTarget) return;
    const target = unlockTarget;
    setUnlockTarget(null);

    const result = await unlockTx.run((report) => getServices(mode).operations.unlock(target.id, report));

    if (result) {
      await refresh();
      toast.success("Collateral unlocked", {
        description: `${formatToken(result.amount, result.assetSymbol, 4)} released back to your wallet on ${CHAIN_A.name}.`,
      });
    } else if (unlockTx.friendlyError) {
      toast.error(unlockTx.friendlyError.title, { description: unlockTx.friendlyError.next });
    }
  }, [unlockTarget, unlockTx, mode, refresh]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Chain A · ${CHAIN_A.name}`}
        title="Your Vault"
        description="Your assets stay on Chain A. Locking collateral never transfers it to another chain — it only makes its state provable."
        actions={
          capabilities?.lock ? (
            <Button onClick={() => setLockOpen(true)} className="h-10 gap-2 font-semibold">
              <Plus className="size-4" aria-hidden />
              Lock collateral
            </Button>
          ) : null
        }
      />

      {/* summary */}
      <section className="panel grid gap-6 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Wallet Balance"
          value={balance ? formatToken(balance.amount, balance.symbol, 4) : "—"}
          sub={balance?.valueUsd !== null && balance?.valueUsd !== undefined ? `≈ ${formatUsd(balance.valueUsd)}` : "Unlocked and available"}
        />
        <Metric
          label="Total Collateral"
          value={formatUsd(totals.total)}
          tone="accent"
          sub={`${activePositions.length} active position${activePositions.length === 1 ? "" : "s"}`}
        />
        <Metric
          label="Available"
          value={totals.lockedAmount > 0 ? formatToken(totals.lockedAmount, totals.symbol, 4) : "—"}
          sub="Locked, not yet pledged"
        />
        <Metric
          label="Pledged"
          value={totals.pledgedAmount > 0 ? formatToken(totals.pledgedAmount, totals.symbol, 4) : "—"}
          tone={totals.pledgedAmount > 0 ? "warning" : "default"}
          sub="Backing an active loan"
        />
      </section>

      <TransactionProgress state={unlockTx.state} error={unlockTx.friendlyError} />

      {/* positions */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="label-tech text-foreground/85">Collateral Positions</h2>
          {activePositions.length > 0 ? (
            <span className="mono text-[11px] text-muted-foreground">
              {activePositions.length} active
            </span>
          ) : null}
        </div>

        {positionsQuery.error ? (
          <ErrorState error={positionsQuery.error} onRetry={() => void positionsQuery.refetch()} />
        ) : positionsQuery.isLoading ? (
          <RowSkeletonList count={2} />
        ) : activePositions.length === 0 ? (
          <EmptyState
            icon={VaultIcon}
            title="Your vault is empty."
            description="Lock an asset on Chain A to unlock cross-chain borrowing. Your collateral never leaves this chain."
            action={
              capabilities?.lock ? (
                <Button onClick={() => setLockOpen(true)} className="gap-2">
                  <Lock className="size-4" aria-hidden />
                  Lock collateral
                </Button>
              ) : (
                <p className="text-[12.5px] text-muted-foreground">
                  Locking is unavailable until the vault contract is configured.
                </p>
              )
            }
          />
        ) : (
          <div className="space-y-3">
            {activePositions.map((position) => (
              <CollateralCard
                key={position.id}
                position={position}
                onBorrow={(target) => navigate(`/borrow?collateral=${target.id}`)}
                onUnlock={setUnlockTarget}
                canUnlock={capabilities?.unlock ?? false}
              />
            ))}
          </div>
        )}
      </section>

      {/* history */}
      {historicPositions.length > 0 ? (
        <section className="space-y-3">
          <h2 className="label-tech text-foreground/85">Released Positions</h2>
          {historicPositions.map((position) => (
            <CollateralCard key={position.id} position={position} />
          ))}
        </section>
      ) : null}

      <LockCollateralDialog open={lockOpen} onOpenChange={setLockOpen} />

      <AlertDialog open={unlockTarget !== null} onOpenChange={(open) => !open && setUnlockTarget(null)}>
        <AlertDialogContent className="border-border/70 bg-popover/95 backdrop-blur-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="display tracking-tight">Unlock collateral?</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] leading-relaxed">
              {unlockTarget
                ? `This releases ${formatToken(unlockTarget.amount, unlockTarget.assetSymbol, 4)} from the vault back to your wallet on ${CHAIN_A.name}. Collateral can be released only when protocol conditions allow it.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlock}>Unlock collateral</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Vault;

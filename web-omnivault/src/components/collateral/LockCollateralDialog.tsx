import { Lock, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { TransactionProgress } from "@/components/protocol/TransactionProgress";
import { NetworkWarning } from "@/components/wallet/NetworkWarning";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CHAIN_A } from "@/config/chains";
import { useRefreshProtocol, useSessionOwner, useWalletBalance } from "@/hooks/useProtocolData";
import { useTransaction } from "@/hooks/useTransaction";
import { useWallet } from "@/hooks/useWallet";
import { getServices } from "@/services";
import { formatToken, formatUsd } from "@/utils/format";

interface LockCollateralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Real lock flow against the existing CollateralVault interface on Chain A. */
export const LockCollateralDialog = ({ open, onOpenChange }: LockCollateralDialogProps) => {
  const { owner, mode } = useSessionOwner();
  const { chainId, isDemoSession } = useWallet();
  const { data: balance } = useWalletBalance();
  const refresh = useRefreshProtocol();
  const tx = useTransaction(CHAIN_A.chainId);
  const [amount, setAmount] = useState<string>("");

  useEffect(() => {
    if (!open) {
      setAmount("");
      tx.reset();
    }
  }, [open, tx]);

  const parsed = Number.parseFloat(amount);
  const isValidNumber = Number.isFinite(parsed) && parsed > 0;
  const available = balance?.amount ?? 0;
  const exceedsBalance = isValidNumber && parsed > available;
  const pricePerUnit = balance?.valueUsd && balance.amount ? balance.valueUsd / balance.amount : null;

  const estimatedValue = useMemo(
    () => (isValidNumber && pricePerUnit !== null ? pricePerUnit * parsed : null),
    [isValidNumber, pricePerUnit, parsed],
  );

  const wrongNetwork = !isDemoSession && chainId !== CHAIN_A.chainId;

  const handleMax = useCallback((): void => {
    if (!balance) return;
    // Leave headroom for gas when locking the native asset.
    const max = Math.max(0, balance.amount - 0.01);
    setAmount(max > 0 ? String(Number(max.toFixed(6))) : "0");
  }, [balance]);

  const handleLock = useCallback(async (): Promise<void> => {
    if (!owner || !isValidNumber || exceedsBalance) return;

    const result = await tx.run((report) =>
      getServices(mode).operations.lockCollateral(
        { owner, amount: parsed, assetSymbol: balance?.symbol ?? CHAIN_A.nativeCurrency.symbol },
        report,
      ),
    );

    if (result) {
      // Chain A is authoritative — refetch before declaring success.
      await refresh();
      toast.success("Collateral locked", {
        description: `${formatToken(result.amount, result.assetSymbol, 4)} locked in the vault on ${CHAIN_A.name}.`,
      });
      onOpenChange(false);
    }
  }, [owner, isValidNumber, exceedsBalance, tx, mode, parsed, balance, refresh, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={tx.isBusy ? undefined : onOpenChange}>
      <DialogContent className="max-w-[460px] border-border/70 bg-popover/95 backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle className="display flex items-center gap-2 text-lg font-bold tracking-tight">
            <Lock className="size-4 text-primary" aria-hidden />
            Lock collateral
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            Your asset remains on {CHAIN_A.name}. It will never be moved to Chain B.
          </DialogDescription>
        </DialogHeader>

        {wrongNetwork ? (
          <NetworkWarning
            requiredChain={CHAIN_A}
            reason={`OmniVault requires ${CHAIN_A.name} for Chain A collateral operations.`}
          />
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="lock-amount" className="label-tech">
                  Amount
                </label>
                <span className="text-[11.5px] text-muted-foreground">
                  Available: {balance ? formatToken(balance.amount, balance.symbol, 4) : "—"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    id="lock-amount"
                    inputMode="decimal"
                    placeholder="0.0"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))}
                    disabled={tx.isBusy}
                    aria-invalid={exceedsBalance}
                    className="mono h-12 pr-16 text-lg font-semibold"
                  />
                  <span className="mono absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
                    {balance?.symbol ?? CHAIN_A.nativeCurrency.symbol}
                  </span>
                </div>
                <Button variant="outline" onClick={handleMax} disabled={!balance || tx.isBusy} className="h-12 px-4">
                  MAX
                </Button>
              </div>
              {estimatedValue !== null ? (
                <p className="text-[12px] text-muted-foreground">Estimated value ≈ {formatUsd(estimatedValue)}</p>
              ) : null}
              {exceedsBalance ? (
                <p className="text-[12px] text-destructive">Amount exceeds your available balance.</p>
              ) : null}
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-success/25 bg-success/[0.05] p-3">
              <ShieldCheck className="mt-px size-3.5 shrink-0 text-success" aria-hidden />
              <p className="text-[12px] leading-relaxed text-foreground/85">
                Locked collateral stays in the vault contract on {CHAIN_A.name}. Only a signed proof of its state is
                ever sent to another chain.
              </p>
            </div>

            <TransactionProgress state={tx.state} error={tx.friendlyError} />
          </>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={tx.isBusy}>
            Cancel
          </Button>
          <Button
            onClick={handleLock}
            disabled={!isValidNumber || exceedsBalance || tx.isBusy || wrongNetwork}
            className="gap-2"
          >
            <Lock className="size-3.5" aria-hidden />
            {tx.isBusy ? "Locking…" : "Lock collateral"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import { ArrowLeft, ExternalLink, Receipt, Unlock, Wallet } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { DataField, Metric } from "@/components/common/DataField";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingPanel } from "@/components/common/Skeletons";
import { StatusBadge, type BadgeTone } from "@/components/common/StatusBadge";
import { LoanLifecycle } from "@/components/protocol/LoanLifecycle";
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
import { CHAIN_A, CHAIN_B, explorerTxUrl, getChainById } from "@/config/chains";
import { buildLifecycle, deriveFlowState } from "@/hooks/useFlowState";
import {
  useCapabilities,
  useCollateralPosition,
  useLoan,
  useProofs,
  useRefreshProtocol,
  useSessionOwner,
} from "@/hooks/useProtocolData";
import { useTransaction } from "@/hooks/useTransaction";
import { getServices } from "@/services";
import type { LoanStatus } from "@/types/protocol";
import {
  formatDateTime,
  formatHealthFactor,
  formatToken,
  formatUsd,
  healthTone,
  shortAddress,
  shortHash,
} from "@/utils/format";

const STATUS_TONE: Record<LoanStatus, BadgeTone> = {
  active: "success",
  pending: "warning",
  repaid: "neutral",
  liquidated: "danger",
  failed: "danger",
};

const LoanDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { mode } = useSessionOwner();

  const loanQuery = useLoan(id);
  const loan = loanQuery.data ?? null;
  const positionQuery = useCollateralPosition(loan?.collateralId);
  const { data: proofs } = useProofs();
  const { data: capabilities } = useCapabilities();
  const refresh = useRefreshProtocol();
  const repayTx = useTransaction(CHAIN_B.chainId);
  const unlockTx = useTransaction(CHAIN_A.chainId);

  const [confirmRepay, setConfirmRepay] = useState<boolean>(false);
  const [confirmUnlock, setConfirmUnlock] = useState<boolean>(false);

  const position = positionQuery.data ?? null;
  const attestation = useMemo(
    () => (proofs ?? []).find((proof) => proof.id === loan?.attestationId) ?? null,
    [proofs, loan],
  );

  const lifecycle = useMemo(
    () =>
      buildLifecycle({
        state: deriveFlowState(position, attestation, loan),
        position,
        attestation,
        loan,
      }),
    [position, attestation, loan],
  );

  const handleRepay = useCallback(async (): Promise<void> => {
    if (!loan) return;
    setConfirmRepay(false);
    const result = await repayTx.run((report) => getServices(mode).operations.repay(loan.id, report));
    if (result) {
      await refresh();
      toast.success("Loan repaid", {
        description: `${formatUsd(result.principal)} ${result.currencySymbol} repaid. Your collateral is available again.`,
      });
    } else if (repayTx.friendlyError) {
      toast.error(repayTx.friendlyError.title, { description: repayTx.friendlyError.next });
    }
  }, [loan, repayTx, mode, refresh]);

  const handleUnlock = useCallback(async (): Promise<void> => {
    if (!position) return;
    setConfirmUnlock(false);
    const result = await unlockTx.run((report) => getServices(mode).operations.unlock(position.id, report));
    if (result) {
      await refresh();
      toast.success("Collateral unlocked", {
        description: `${formatToken(result.amount, result.assetSymbol, 4)} released back to your wallet.`,
      });
    } else if (unlockTx.friendlyError) {
      toast.error(unlockTx.friendlyError.title, { description: unlockTx.friendlyError.next });
    }
  }, [position, unlockTx, mode, refresh]);

  if (loanQuery.error) {
    return (
      <div className="space-y-5">
        <BackLink onClick={() => navigate("/loans")} />
        <ErrorState error={loanQuery.error} onRetry={() => void loanQuery.refetch()} />
      </div>
    );
  }

  if (loanQuery.isLoading) {
    return (
      <div className="space-y-5">
        <BackLink onClick={() => navigate("/loans")} />
        <LoadingPanel message="Loading loan · Reading Chain B" rows={5} />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="space-y-5">
        <BackLink onClick={() => navigate("/loans")} />
        <EmptyState
          icon={Receipt}
          title="Loan not found"
          description="This loan does not exist in the current protocol state."
          action={<Button onClick={() => navigate("/loans")}>Back to loans</Button>}
        />
      </div>
    );
  }

  const sourceChain = getChainById(loan.sourceChainId);
  const destChain = getChainById(loan.destinationChainId);
  const issueLink = explorerTxUrl(destChain, loan.issueTxHash);
  const repayLink = explorerTxUrl(destChain, loan.repayTxHash);
  const canRepay = loan.status === "active" && (capabilities?.repay ?? false);
  const canUnlock =
    loan.status === "repaid" && position?.status === "locked" && (capabilities?.unlock ?? false);

  return (
    <div className="space-y-6">
      <BackLink onClick={() => navigate("/loans")} />

      {/* header */}
      <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="label-tech mb-2 text-primary/80">Cross-chain loan</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="display text-3xl font-extrabold tracking-tight">Loan #{loan.id}</h1>
            <StatusBadge tone={STATUS_TONE[loan.status]} label={loan.status} className="capitalize" withIcon={false} />
          </div>
          <p className="mt-2 text-[14px] text-muted-foreground">
            Backed by collateral #{loan.collateralId}, still held on {sourceChain?.name ?? "Chain A"}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canRepay ? (
            <Button onClick={() => setConfirmRepay(true)} disabled={repayTx.isBusy} className="gap-2">
              <Wallet className="size-4" aria-hidden />
              {repayTx.isBusy ? "Repaying…" : "Repay loan"}
            </Button>
          ) : null}
          {canUnlock ? (
            <Button variant="outline" onClick={() => setConfirmUnlock(true)} disabled={unlockTx.isBusy} className="gap-2">
              <Unlock className="size-4" aria-hidden />
              {unlockTx.isBusy ? "Unlocking…" : "Unlock collateral"}
            </Button>
          ) : null}
          {loan.attestationId ? (
            <Button variant="outline" onClick={() => navigate(`/proofs/${loan.attestationId}`)}>
              View attestation
            </Button>
          ) : null}
        </div>
      </header>

      <TransactionProgress state={repayTx.state} error={repayTx.friendlyError} />
      <TransactionProgress state={unlockTx.state} error={unlockTx.friendlyError} />

      {/* headline metrics */}
      <section className="panel grid gap-6 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Borrowed" value={formatUsd(loan.principal)} sub={loan.currencySymbol} tone="accent" />
        <Metric
          label="Outstanding"
          value={loan.status === "repaid" ? formatUsd(0) : formatUsd(loan.outstanding)}
          sub={loan.status === "repaid" ? "Fully repaid" : "Currently owed"}
        />
        <Metric
          label="Collateral"
          value={position ? formatToken(position.amount, position.assetSymbol, 4) : "—"}
          sub={position ? `Locked on ${sourceChain?.shortName ?? "Chain A"}` : "Position unavailable"}
        />
        <Metric
          label="Health Factor"
          value={formatHealthFactor(loan.healthFactor)}
          tone={
            healthTone(loan.healthFactor) === "success"
              ? "success"
              : healthTone(loan.healthFactor) === "warning"
                ? "warning"
                : healthTone(loan.healthFactor) === "destructive"
                  ? "danger"
                  : "default"
          }
        />
      </section>

      {/* lifecycle */}
      <section className="panel p-5 lg:p-6">
        <h2 className="label-tech mb-6 text-foreground/85">Lifecycle</h2>
        <div className="overflow-x-auto pb-1">
          <LoanLifecycle stages={lifecycle} detailed className="min-w-[640px]" />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* loan details */}
        <section className="panel p-5">
          <h2 className="label-tech mb-2 text-foreground/85">Loan Details</h2>
          <dl className="divide-y divide-border/40">
            <DataField label="Loan ID" value={`#${loan.id}`} mono />
            <DataField label="Borrower" value={shortAddress(loan.borrower, 8, 6)} mono copyValue={loan.borrower} />
            <DataField label="Source Chain" value={sourceChain?.name ?? String(loan.sourceChainId)} />
            <DataField label="Destination Chain" value={destChain?.name ?? String(loan.destinationChainId)} />
            {loan.lender ? (
              <DataField label="Lender" value={shortAddress(loan.lender, 8, 6)} mono copyValue={loan.lender} />
            ) : null}
            <DataField label="Created" value={formatDateTime(loan.createdAt)} />
            {loan.repaidAt ? <DataField label="Repaid" value={formatDateTime(loan.repaidAt)} /> : null}
          </dl>
        </section>

        {/* collateral + attestation */}
        <section className="panel p-5">
          <h2 className="label-tech mb-2 text-foreground/85">Collateral & Attestation</h2>
          <dl className="divide-y divide-border/40">
            <DataField label="Collateral ID" value={`#${loan.collateralId}`} mono />
            {position ? (
              <>
                <DataField label="Asset" value={`${position.assetName} (${position.assetSymbol})`} />
                <DataField label="Amount" value={formatToken(position.amount, position.assetSymbol, 4)} />
                <DataField label="State Version" value={String(position.stateVersion)} mono />
                <DataField
                  label="Source Vault"
                  value={shortAddress(position.vaultAddress, 8, 6)}
                  mono
                  copyValue={position.vaultAddress}
                />
                <DataField
                  label="Collateral Status"
                  value={position.status === "pledged" ? "In use — backing this loan" : position.status}
                  tone={position.status === "pledged" ? "accent" : "default"}
                  className="capitalize"
                />
              </>
            ) : (
              <p className="py-3 text-[13px] text-muted-foreground">Collateral record is unavailable.</p>
            )}
            {attestation ? (
              <>
                <DataField label="Attestation" value={`#${attestation.id}`} mono />
                <DataField
                  label="Signer"
                  value={shortAddress(attestation.signer, 8, 6)}
                  mono
                  copyValue={attestation.signer}
                />
              </>
            ) : null}
          </dl>
        </section>
      </div>

      {/* transactions */}
      <section className="panel p-5">
        <h2 className="label-tech mb-4 text-foreground/85">Transactions</h2>
        {loan.issueTxHash || loan.repayTxHash || attestation?.verificationTxHash ? (
          <ul className="space-y-2">
            {attestation?.verificationTxHash ? (
              <TxRow
                label="Attestation verified"
                hash={attestation.verificationTxHash}
                link={explorerTxUrl(destChain, attestation.verificationTxHash)}
              />
            ) : null}
            {loan.issueTxHash ? <TxRow label="Loan issued" hash={loan.issueTxHash} link={issueLink} /> : null}
            {loan.repayTxHash ? <TxRow label="Loan repaid" hash={loan.repayTxHash} link={repayLink} /> : null}
          </ul>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            No transaction hashes are available for this loan yet.
          </p>
        )}
      </section>

      {/* repayment / unlock guidance */}
      {loan.status === "active" && !capabilities?.repay ? (
        <p className="rounded-xl border border-border/60 bg-card/30 p-4 text-[12.5px] text-muted-foreground">
          Repayment is not available in the current configuration. Connect a wallet on {CHAIN_B.name} with the lending
          contract configured to repay this loan.
        </p>
      ) : null}

      {loan.status === "repaid" && position?.status === "locked" ? (
        <p className="rounded-xl border border-success/25 bg-success/[0.05] p-4 text-[12.5px] text-foreground/85">
          This loan is fully repaid. Collateral can be released only when protocol conditions allow it — your position
          is now eligible to unlock or back a new loan.
        </p>
      ) : null}

      <AlertDialog open={confirmRepay} onOpenChange={setConfirmRepay}>
        <AlertDialogContent className="border-border/70 bg-popover/95 backdrop-blur-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="display tracking-tight">Repay this loan?</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] leading-relaxed">
              You will repay {formatUsd(loan.outstanding)} {loan.currencySymbol} on {destChain?.name ?? "Chain B"}.
              Once confirmed on-chain, collateral #{loan.collateralId} becomes available again on{" "}
              {sourceChain?.name ?? "Chain A"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRepay}>Repay loan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmUnlock} onOpenChange={setConfirmUnlock}>
        <AlertDialogContent className="border-border/70 bg-popover/95 backdrop-blur-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="display tracking-tight">Unlock collateral?</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] leading-relaxed">
              This releases collateral #{loan.collateralId} from the vault back to your wallet on{" "}
              {sourceChain?.name ?? "Chain A"}. Collateral can be released only when protocol conditions allow it.
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

const BackLink = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
  >
    <ArrowLeft className="size-3.5" aria-hidden />
    Back to loans
  </button>
);

const TxRow = ({ label, hash, link }: { label: string; hash: string; link: string | null }) => (
  <li className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/30 px-3.5 py-2.5">
    <span className="text-[12.5px] text-foreground/85">{label}</span>
    <span className="mono ml-auto truncate text-[11.5px] text-muted-foreground">{shortHash(hash)}</span>
    {link ? (
      <a
        href={link}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={`${label} on block explorer`}
        className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
      >
        <ExternalLink className="size-3" aria-hidden />
      </a>
    ) : null}
  </li>
);

export default LoanDetail;

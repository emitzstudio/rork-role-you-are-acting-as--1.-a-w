import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Coins, Info, ShieldCheck, Vault as VaultIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { BorrowStepper } from "@/components/borrow/BorrowStepper";
import { CollateralSelector } from "@/components/borrow/CollateralSelector";
import { VerificationChecklist } from "@/components/borrow/VerificationChecklist";
import { Metric } from "@/components/common/DataField";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { RowSkeletonList } from "@/components/common/Skeletons";
import { CrossChainFlow } from "@/components/protocol/CrossChainFlow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CHAIN_A, CHAIN_B } from "@/config/chains";
import {
  useBorrowingPower,
  useCapabilities,
  useCollateralPositions,
  useProofs,
  useRefreshProtocol,
  useSessionOwner,
} from "@/hooks/useProtocolData";
import { cn } from "@/lib/utils";
import { getServices } from "@/services";
import { useWallet } from "@/hooks/useWallet";
import type {
  Attestation,
  BorrowStage,
  BorrowStageId,
  FlowState,
  Loan,
  StageStatus,
  VerificationCheck,
} from "@/types/protocol";
import { toFriendlyError, type FriendlyError } from "@/utils/errors";
import { formatHealthFactor, formatPercent, formatToken, formatUsd, healthTone, shortAddress } from "@/utils/format";

const BORROW_CURRENCY = "USDC";

const STAGE_TEMPLATE: readonly { id: BorrowStageId; index: number; title: string; description: string }[] = [
  { id: "verify", index: 1, title: "Verify Collateral", description: "Check collateral state on Chain A" },
  { id: "attest", index: 2, title: "Generate Attestation", description: "Create EIP-712 proof of collateral state" },
  { id: "transmit", index: 3, title: "Send Proof", description: "Transmit proof to Chain B" },
  { id: "verify_chain_b", index: 4, title: "Verify On-Chain", description: `Validate proof on ${CHAIN_B.shortName}` },
  { id: "issue", index: 5, title: "Loan Issued", description: "Mint and transfer funds to your wallet" },
];

const initialStages = (): BorrowStage[] =>
  STAGE_TEMPLATE.map((stage) => ({ ...stage, status: "pending" as StageStatus }));

const Borrow = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mode } = useSessionOwner();
  const { address, isDemoSession } = useWallet();

  const positionsQuery = useCollateralPositions();
  const proofsQuery = useProofs();
  const { data: capabilities } = useCapabilities();
  const refresh = useRefreshProtocol();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState<string>("");
  const [stages, setStages] = useState<BorrowStage[]>(initialStages);
  const [stageDetails, setStageDetails] = useState<Record<string, string>>({});
  const [executing, setExecuting] = useState<boolean>(false);
  const [issuedLoan, setIssuedLoan] = useState<Loan | null>(null);
  const [failure, setFailure] = useState<FriendlyError | null>(null);

  const eligible = useMemo(
    () => (positionsQuery.data ?? []).filter((position) => position.status === "locked"),
    [positionsQuery.data],
  );
  const pledged = useMemo(
    () => (positionsQuery.data ?? []).filter((position) => position.status === "pledged"),
    [positionsQuery.data],
  );

  // Honour a deep link from the Vault, but never silently pick when several exist.
  useEffect(() => {
    if (selectedId !== null) return;
    const requested = searchParams.get("collateral");
    if (requested && eligible.some((position) => position.id === requested)) {
      setSelectedId(requested);
      return;
    }
    if (eligible.length === 1) setSelectedId(eligible[0].id);
  }, [eligible, searchParams, selectedId]);

  const selected = eligible.find((position) => position.id === selectedId) ?? null;
  const power = useBorrowingPower(selected, BORROW_CURRENCY);

  const parsedAmount = Number.parseFloat(amountInput);
  const hasAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const maxBorrow = power?.availableUsd ?? null;
  const exceedsPower = hasAmount && maxBorrow !== null && parsedAmount > maxBorrow;
  const canSubmit = Boolean(selected) && hasAmount && !exceedsPower && !executing && (capabilities?.borrow ?? false);

  const projectedHealth = useMemo(() => {
    if (!selected || !hasAmount || selected.valueUsd === null) return null;
    const totalDebt = (power?.existingDebt ?? 0) + parsedAmount;
    if (totalDebt <= 0) return null;
    return (selected.valueUsd * selected.maxLtv) / totalDebt;
  }, [selected, hasAmount, parsedAmount, power]);

  /** Live view of the proof produced by this borrow, used by the flow visual. */
  const activeAttestation = useMemo<Attestation | null>(() => {
    if (!issuedLoan?.attestationId) return null;
    return (proofsQuery.data ?? []).find((proof) => proof.id === issuedLoan.attestationId) ?? null;
  }, [issuedLoan, proofsQuery.data]);

  const flowState = useMemo<FlowState>(() => {
    const statusOf = (id: BorrowStageId): StageStatus =>
      stages.find((stage) => stage.id === id)?.status ?? "pending";

    if (stages.some((stage) => stage.status === "failed")) return "failed";
    if (statusOf("issue") === "success") return "loan_issued";
    if (statusOf("issue") === "active" || statusOf("verify_chain_b") === "success") return "verified";
    if (statusOf("verify_chain_b") === "active") return "verifying";
    if (statusOf("transmit") === "active" || statusOf("transmit") === "success") return "proof_moving";
    if (statusOf("attest") === "success") return "attestation_ready";
    if (statusOf("attest") === "active") return "attestation_creating";
    return selected ? "collateral_locked" : "idle";
  }, [stages, selected]);

  const verificationChecks = useMemo<readonly VerificationCheck[]>(() => {
    if (!selected) return [];
    const verifyDone = stages.find((stage) => stage.id === "verify")?.status === "success";
    const attestDone = stages.find((stage) => stage.id === "attest")?.status === "success";
    const chainBDone = stages.find((stage) => stage.id === "verify_chain_b")?.status === "success";

    return [
      { label: "Owner", value: shortAddress(selected.owner, 6, 4), passed: verifyDone ? true : null },
      { label: "Asset", value: selected.assetSymbol, passed: verifyDone ? true : null },
      { label: "Amount", value: formatToken(selected.amount, selected.assetSymbol, 4), passed: verifyDone ? true : null },
      { label: "Source Chain", value: CHAIN_A.shortName, passed: chainBDone ? true : null },
      { label: "Source Vault", value: shortAddress(selected.vaultAddress, 5, 4), passed: chainBDone ? true : null },
      { label: "State Version", value: String(selected.stateVersion), passed: verifyDone ? true : null },
      { label: "Signer", value: activeAttestation ? shortAddress(activeAttestation.signer, 5, 4) : "—", passed: attestDone ? true : null },
      { label: "Nonce", value: activeAttestation ? shortAddress(activeAttestation.nonce, 6, 4) : "—", passed: attestDone ? true : null },
    ];
  }, [selected, stages, activeAttestation]);

  const handleMax = useCallback((): void => {
    if (maxBorrow === null) return;
    setAmountInput(String(Math.floor(maxBorrow)));
  }, [maxBorrow]);

  const handleBorrow = useCallback(async (): Promise<void> => {
    if (!selected || !hasAmount) return;

    setExecuting(true);
    setFailure(null);
    setIssuedLoan(null);
    setStageDetails({});
    setStages(initialStages());

    try {
      const loan = await getServices(mode).operations.borrow(
        {
          collateralId: selected.id,
          amount: parsedAmount,
          currencySymbol: BORROW_CURRENCY,
          borrower: isDemoSession ? "demo" : (address ?? ""),
        },
        (update) => {
          setStages((previous) =>
            previous.map((stage) => (stage.id === update.stage ? { ...stage, status: update.status } : stage)),
          );
          if (update.detail) {
            setStageDetails((previous) => ({ ...previous, [update.stage]: update.detail as string }));
          }
        },
      );

      // Refetch authoritative state before presenting the result.
      await refresh();
      setIssuedLoan(loan);
      toast.success("Loan issued", {
        description: `${formatUsd(loan.principal)} ${loan.currencySymbol} issued on ${CHAIN_B.name}. Your collateral never left Chain A.`,
      });
    } catch (error) {
      const friendly = toFriendlyError(error);
      setFailure(friendly);
      setStages((previous) => {
        const firstPending = previous.findIndex((stage) => stage.status === "pending" || stage.status === "active");
        return previous.map((stage, index) =>
          index === (firstPending === -1 ? previous.length - 1 : firstPending)
            ? { ...stage, status: "failed" as StageStatus }
            : stage,
        );
      });
      toast.error(friendly.title, { description: friendly.next });
    } finally {
      setExecuting(false);
    }
  }, [selected, hasAmount, mode, parsedAmount, isDemoSession, address, refresh]);

  const resetFlow = useCallback((): void => {
    setStages(initialStages());
    setStageDetails({});
    setIssuedLoan(null);
    setFailure(null);
    setAmountInput("");
  }, []);

  /* ── success state ──────────────────────────────────────────── */
  if (issuedLoan) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Borrow complete"
          title="Loan issued on Chain B"
          description="Your collateral never left Chain A. A verified attestation unlocked this loan on the destination chain."
        />

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="panel overflow-hidden border-success/30"
        >
          <div className="flex items-center gap-3 border-b border-success/20 bg-success/[0.05] px-5 py-4">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-success/35 bg-success/10">
              <CheckCircle2 className="size-5 text-success" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="display text-base font-bold tracking-tight text-success">Loan issued</p>
              <p className="mono text-[11.5px] text-muted-foreground">Loan #{issuedLoan.id}</p>
            </div>
          </div>

          <div className="grid gap-6 p-5 sm:grid-cols-3">
            <Metric label="Borrowed" value={`${formatUsd(issuedLoan.principal)}`} tone="accent" sub={issuedLoan.currencySymbol} />
            <Metric
              label="Collateral"
              value={selected ? formatToken(selected.amount, selected.assetSymbol, 4) : "—"}
              sub={`Still locked on ${CHAIN_A.shortName}`}
            />
            <Metric
              label="Health Factor"
              value={formatHealthFactor(issuedLoan.healthFactor)}
              tone={healthTone(issuedLoan.healthFactor) === "success" ? "success" : "warning"}
            />
          </div>

          <div className="flex flex-wrap gap-2.5 border-t border-border/50 px-5 py-4">
            <Button onClick={() => navigate(`/loans/${issuedLoan.id}`)} className="gap-2">
              View loan
              <ArrowRight className="size-4" aria-hidden />
            </Button>
            {issuedLoan.attestationId ? (
              <Button variant="outline" onClick={() => navigate(`/proofs/${issuedLoan.attestationId}`)}>
                Inspect proof
              </Button>
            ) : null}
            <Button variant="ghost" onClick={resetFlow}>
              Borrow again
            </Button>
          </div>
        </motion.section>

        <CrossChainFlow
          state="loan_issued"
          position={selected}
          attestation={activeAttestation}
          loan={issuedLoan}
          availableToBorrow={null}
        />
      </div>
    );
  }

  /* ── main flow ──────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cross-chain borrowing"
        title="Borrow against your collateral"
        description={`Turn your locked assets into opportunities. Your collateral stays safely on ${CHAIN_A.name} — we verify the proof and issue your loan on ${CHAIN_B.name}.`}
      />

      {positionsQuery.error ? (
        <ErrorState error={positionsQuery.error} onRetry={() => void positionsQuery.refetch()} />
      ) : positionsQuery.isLoading ? (
        <RowSkeletonList count={2} />
      ) : eligible.length === 0 ? (
        <EmptyState
          icon={VaultIcon}
          title="No eligible collateral"
          description={
            pledged.length > 0
              ? "All of your positions are currently backing active loans. Repay a loan to free up collateral, or lock more on Chain A."
              : "Lock collateral on Chain A to begin borrowing. Your asset stays on Chain A — only a proof of its state ever travels."
          }
          action={
            <Button onClick={() => navigate("/vault")} className="gap-2">
              Go to Vault
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          }
        />
      ) : (
        <>
          {/* STEP 1 — select collateral */}
          <CollateralSelector
            positions={eligible}
            selectedId={selectedId}
            onSelect={setSelectedId}
            disabled={executing}
          />

          {/* STEP 2 — borrowing power */}
          <section className="panel p-5">
            <h2 className="label-tech mb-5 text-foreground/85">Borrowing Power</h2>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
              <Metric label="Collateral Value" value={formatUsd(power?.collateralValueUsd ?? null)} size="sm" />
              <Metric label="LTV" value={power ? formatPercent(power.maxLtv) : "—"} size="sm" />
              <Metric label="Existing Debt" value={formatUsd(power?.existingDebt ?? 0)} size="sm" />
              <Metric
                label="Available Borrowing Power"
                value={formatUsd(maxBorrow)}
                size="sm"
                tone="accent"
              />
              <Metric
                label="Health Factor"
                value={formatHealthFactor(projectedHealth ?? power?.healthFactor ?? null)}
                size="sm"
                tone={
                  healthTone(projectedHealth ?? power?.healthFactor ?? null) === "success"
                    ? "success"
                    : healthTone(projectedHealth ?? power?.healthFactor ?? null) === "warning"
                      ? "warning"
                      : healthTone(projectedHealth ?? power?.healthFactor ?? null) === "destructive"
                        ? "danger"
                        : "default"
                }
                sub={projectedHealth !== null ? "Projected after borrow" : undefined}
              />
            </div>
            {power?.collateralValueUsd === null ? (
              <p className="mt-4 flex items-start gap-2 border-t border-border/50 pt-4 text-[12px] text-muted-foreground">
                <Info className="mt-px size-3.5 shrink-0" aria-hidden />
                No price source is available for this asset, so borrowing power cannot be computed.
              </p>
            ) : null}
          </section>

          {/* STEP 3 — amount */}
          <section className="panel p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="label-tech text-foreground/85">Borrow Amount</h2>
              <span className="text-[11.5px] text-muted-foreground">
                Max: {formatUsd(maxBorrow)}
              </span>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <div className="relative flex-1">
                <Input
                  inputMode="decimal"
                  placeholder="0"
                  aria-label="Borrow amount"
                  aria-invalid={exceedsPower}
                  value={amountInput}
                  disabled={executing || maxBorrow === null}
                  onChange={(event) => setAmountInput(event.target.value.replace(/[^0-9.]/g, ""))}
                  className="mono h-14 pr-24 text-xl font-bold"
                />
                <span className="mono absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-muted-foreground">
                  {BORROW_CURRENCY}
                </span>
              </div>
              <Button
                variant="outline"
                onClick={handleMax}
                disabled={executing || maxBorrow === null}
                className="h-14 px-7 font-semibold"
              >
                MAX
              </Button>
            </div>

            <p
              className={cn(
                "mt-3 flex items-start gap-2 text-[12.5px] leading-relaxed",
                exceedsPower ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {exceedsPower ? (
                <>Amount exceeds your available borrowing power of {formatUsd(maxBorrow)}.</>
              ) : (
                <>
                  <ShieldCheck className="mt-px size-3.5 shrink-0 text-success" aria-hidden />
                  Your collateral remains on Chain A — only a verified proof is sent to Chain B.
                </>
              )}
            </p>
          </section>

          {/* STEP 4 — protocol flow */}
          <section className="panel p-5 lg:p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h2 className="label-tech text-foreground/85">Protocol Flow</h2>
              {executing ? (
                <span className="mono text-[11px] uppercase tracking-wider text-primary">Executing…</span>
              ) : null}
            </div>
            <div className="overflow-x-auto pb-2">
              <BorrowStepper stages={stages} className="min-w-[640px]" />
            </div>

            {Object.keys(stageDetails).length > 0 ? (
              <ul className="mt-6 space-y-1.5 border-t border-border/50 pt-5">
                {STAGE_TEMPLATE.filter((stage) => stageDetails[stage.id]).map((stage) => (
                  <li key={stage.id} className="mono flex items-center gap-2 text-[11.5px] text-muted-foreground">
                    <span className="text-success">✓</span>
                    <span className="text-foreground/70">{stage.title}:</span>
                    {stageDetails[stage.id]}
                  </li>
                ))}
              </ul>
            ) : null}

            {selected ? (
              <div className="mt-6 border-t border-border/50 pt-5">
                <p className="label-tech mb-3">Technical Checks</p>
                <VerificationChecklist checks={verificationChecks} />
              </div>
            ) : null}
          </section>

          {/* the cinematic flow, mirroring Overview */}
          {executing || flowState !== "collateral_locked" ? (
            <CrossChainFlow
              state={flowState}
              position={selected}
              attestation={activeAttestation}
              loan={null}
              availableToBorrow={hasAmount ? parsedAmount : maxBorrow}
            />
          ) : null}

          {failure ? <ErrorState error={new Error(failure.code)} onRetry={resetFlow} /> : null}

          {/* STEP 5 — confirm */}
          <section className="panel p-5">
            <h2 className="label-tech mb-5 text-foreground/85">Confirm Borrow</h2>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <SummaryTile
                  label="Collateral"
                  value={selected ? formatToken(selected.amount, selected.assetSymbol, 4) : "—"}
                  caption={`Chain A · ${CHAIN_A.name}`}
                  tone="primary"
                />
                <ArrowRight className="mx-auto size-4 shrink-0 text-muted-foreground sm:mx-1" aria-hidden />
                <SummaryTile
                  label="Borrow Amount"
                  value={hasAmount ? `${formatUsd(parsedAmount)} ${BORROW_CURRENCY}` : "—"}
                  caption={`Chain B · ${CHAIN_B.name}`}
                  tone="accent"
                />
              </div>

              <div className="shrink-0 lg:w-[260px]">
                <Button
                  onClick={handleBorrow}
                  disabled={!canSubmit}
                  className="h-12 w-full gap-2 text-[14px] font-semibold"
                >
                  <Coins className="size-4" aria-hidden />
                  {executing ? "Processing…" : "Confirm Borrow"}
                </Button>
                <p className="mt-2 text-center text-[11.5px] text-muted-foreground">
                  {capabilities?.borrow === false
                    ? "Borrowing is unavailable until the protocol backend is configured."
                    : "You will be asked to sign a transaction"}
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

const SummaryTile = ({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: string;
  caption: string;
  tone: "primary" | "accent";
}) => (
  <div
    className={cn(
      "flex-1 rounded-xl border p-4",
      tone === "primary" ? "border-primary/25 bg-primary/[0.05]" : "border-accent/25 bg-accent/[0.05]",
    )}
  >
    <p className="label-tech">{label}</p>
    <p className="display mt-1.5 text-lg font-extrabold num tracking-tight">{value}</p>
    <p className="mt-1 text-[11.5px] text-muted-foreground">{caption}</p>
  </div>
);

export default Borrow;

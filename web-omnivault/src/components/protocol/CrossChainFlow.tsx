import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { ProofPacket } from "@/components/protocol/ProofPacket";
import { ProofStream } from "@/components/protocol/ProofStream";
import { ChainModule } from "@/components/protocol/ChainModule";
import { CHAIN_A, CHAIN_B } from "@/config/chains";
import { FLOW_STATE_LABEL } from "@/hooks/useFlowState";
import { cn } from "@/lib/utils";
import type { Attestation, CollateralPosition, FlowState, Loan } from "@/types/protocol";
import { formatToken, formatUsd } from "@/utils/format";

interface CrossChainFlowProps {
  state: FlowState;
  position: CollateralPosition | null;
  attestation: Attestation | null;
  loan: Loan | null;
  /** Borrowing power shown on Chain B when no loan exists yet. */
  availableToBorrow: number | null;
  borrowCurrency?: string;
  className?: string;
}

const OUTBOUND_ACTIVE: readonly FlowState[] = ["attestation_ready", "proof_moving"];
const OUTBOUND_COMPLETE: readonly FlowState[] = [
  "verifying",
  "verified",
  "loan_issued",
  "loan_repaid",
  "collateral_unlocked",
];
const LOAN_STATES: readonly FlowState[] = ["loan_issued", "loan_repaid"];

/**
 * THE signature OmniVault visual.
 *
 * Chain A anchors the collateral. It never moves.
 * The EIP-712 attestation forms in the centre and TRAVELS to Chain B.
 * Chain B verifies the proof and issues the loan.
 */
export const CrossChainFlow = ({
  state,
  position,
  attestation,
  loan,
  availableToBorrow,
  borrowCurrency = "USDC",
  className,
}: CrossChainFlowProps) => {
  const collateralPresent = position !== null && position.status !== "unlocked";

  const outboundActive = OUTBOUND_ACTIVE.includes(state);
  const outboundComplete = OUTBOUND_COMPLETE.includes(state);
  const chainBActive = outboundComplete || state === "verifying";
  const loanIssued = LOAN_STATES.includes(state) && loan !== null;

  const chainAHeadline = collateralPresent ? formatToken(position.amount, position.assetSymbol, 4) : null;
  const chainACaption =
    position?.status === "pledged" ? "LOCKED · BACKING LOAN" : collateralPresent ? "LOCKED" : "NO COLLATERAL";

  const chainBHeadline = loanIssued
    ? `${formatUsd(loan.principal)} ${loan.currencySymbol}`
    : availableToBorrow !== null && availableToBorrow > 0
      ? formatUsd(availableToBorrow)
      : null;

  const chainBCaption = loanIssued
    ? loan.status === "repaid"
      ? "LOAN REPAID"
      : "LOAN ISSUED"
    : "AVAILABLE TO BORROW";

  return (
    <section
      className={cn("relative", className)}
      aria-label="Cross-chain proof flow: collateral stays on Chain A, only the proof moves"
    >
      {/* Ambient field */}
      <div
        className="pointer-events-none absolute inset-x-[8%] top-1/2 h-56 -translate-y-1/2 rounded-[50%] bg-primary/[0.07] blur-[90px]"
        aria-hidden
      />

      <div className="relative grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch lg:gap-0">
        {/* ── CHAIN A — collateral is anchored here ─────────────────── */}
        <ChainModule
          chain={CHAIN_A}
          variant="vault"
          active={collateralPresent}
          headline={chainAHeadline}
          headlineCaption={chainACaption}
          emptyLabel="No eligible collateral"
          emptyHint="Lock collateral on Chain A to begin borrowing."
          rows={
            position
              ? [
                  { label: "Asset", value: `${position.assetName} (${position.assetSymbol})` },
                  { label: "Network", value: CHAIN_A.shortName },
                  { label: "Vault", value: position.vaultAddress, copyValue: position.vaultAddress },
                ]
              : []
          }
          className="lg:mr-[-10px]"
        />

        {/* ── CENTRE — the proof, and the only thing that travels ──── */}
        <div className="relative flex flex-col items-center justify-center gap-2 py-2 lg:w-[300px] lg:py-0 xl:w-[340px]">
          {/* Inbound rail: collateral state → attestation. Always "readonly" state, never the asset. */}
          <div className="hidden w-full items-center px-1 lg:flex">
            <ProofStream
              active={state === "attestation_creating" || outboundActive}
              complete={outboundComplete}
              className="flex-1"
            />
          </div>

          <ProofPacket
            attestation={attestation}
            state={state}
            className="relative z-10 w-full max-w-[300px] lg:-my-1"
          />

          {/* Outbound rail: the proof moves to Chain B */}
          <div className="hidden w-full items-center px-1 lg:flex">
            <ProofStream active={outboundActive || state === "verifying"} complete={outboundComplete} className="flex-1" />
          </div>

          {/* Mobile vertical rail */}
          <div className="flex h-8 items-center justify-center lg:hidden">
            <ProofStream
              direction="down"
              active={outboundActive || state === "verifying"}
              complete={outboundComplete}
              className="h-full"
            />
          </div>

          <motion.p
            key={state}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mono absolute -bottom-1 left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-[10px] uppercase tracking-[0.2em] text-muted-foreground lg:block"
          >
            {state === "idle" ? "Proof moves · asset stays" : FLOW_STATE_LABEL[state]}
          </motion.p>
        </div>

        {/* ── CHAIN B — verifies the proof, issues the loan ─────────── */}
        <ChainModule
          chain={CHAIN_B}
          variant="ledger"
          active={chainBActive}
          headline={chainBHeadline}
          headlineCaption={chainBCaption}
          emptyLabel="Borrow unavailable"
          emptyHint="Chain B issues a loan once a verified proof arrives."
          rows={
            loanIssued
              ? [
                  { label: "Asset", value: `USD Coin (${loan.currencySymbol})` },
                  { label: "Network", value: CHAIN_B.shortName },
                  ...(loan.lender ? [{ label: "Lender", value: loan.lender, copyValue: loan.lender }] : []),
                ]
              : [
                  { label: "Asset", value: `USD Coin (${borrowCurrency})` },
                  { label: "Network", value: CHAIN_B.shortName },
                  { label: "Max LTV", value: position ? `${Math.round(position.maxLtv * 100)}%` : "—" },
                ]
          }
          className="lg:ml-[-10px]"
        />
      </div>

      {/* The core law of the protocol, stated plainly under the diagram */}
      <div className="relative mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center">
        <LawChip label="Asset stays" tone="primary" />
        <ArrowRight className="size-3 text-muted-foreground/60" aria-hidden />
        <LawChip label="Proof moves" tone="accent" active={outboundActive || outboundComplete} />
        <ArrowRight className="size-3 text-muted-foreground/60" aria-hidden />
        <LawChip label="Loan happens" tone="success" active={loanIssued} />
      </div>
    </section>
  );
};

const LawChip = ({
  label,
  tone,
  active = true,
}: {
  label: string;
  tone: "primary" | "accent" | "success";
  active?: boolean;
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition-opacity duration-500",
      tone === "primary" && "border-primary/30 bg-primary/[0.07] text-primary",
      tone === "accent" && "border-accent/30 bg-accent/[0.07] text-accent",
      tone === "success" && "border-success/30 bg-success/[0.07] text-success",
      !active && "opacity-40",
    )}
  >
    {tone === "success" ? <ShieldCheck className="size-3" aria-hidden /> : null}
    {label}
  </span>
);

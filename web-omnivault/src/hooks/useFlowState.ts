import { useMemo } from "react";

import type { Attestation, CollateralPosition, FlowState, Loan } from "@/types/protocol";

export interface FlowSnapshot {
  readonly state: FlowState;
  readonly position: CollateralPosition | null;
  readonly attestation: Attestation | null;
  readonly loan: Loan | null;
}

/** Derive the cross-chain animation state from authoritative protocol data. */
export const deriveFlowState = (
  position: CollateralPosition | null | undefined,
  attestation: Attestation | null | undefined,
  loan: Loan | null | undefined,
): FlowState => {
  if (!position) return "idle";
  if (position.status === "unlocked") return "collateral_unlocked";

  if (loan) {
    if (loan.status === "failed") return "failed";
    if (loan.status === "repaid") return "loan_repaid";
    if (loan.status === "active") return "loan_issued";
  }

  if (attestation) {
    switch (attestation.status) {
      case "failed":
        return "failed";
      case "verified":
      case "consumed":
        return "verified";
      case "transmitted":
        return "verifying";
      case "signed":
        return "attestation_ready";
      case "pending":
        return "attestation_creating";
      default:
        break;
    }
  }

  return "collateral_locked";
};

export const FLOW_STATE_LABEL: Record<FlowState, string> = {
  idle: "Awaiting collateral",
  collateral_locked: "Collateral locked",
  attestation_creating: "Generating attestation",
  attestation_ready: "Attestation signed",
  proof_moving: "Proof in transit",
  verifying: "Verifying on Chain B",
  verified: "Proof verified",
  loan_issued: "Loan issued",
  loan_repaid: "Loan repaid",
  collateral_unlocked: "Collateral unlocked",
  failed: "Verification failed",
};

/** Pick the most relevant position/proof/loan triple to visualise. */
export const useFlowSnapshot = (
  positions: readonly CollateralPosition[] | undefined,
  proofs: readonly Attestation[] | undefined,
  loans: readonly Loan[] | undefined,
): FlowSnapshot => {
  return useMemo(() => {
    const allPositions = positions ?? [];
    const allProofs = proofs ?? [];
    const allLoans = loans ?? [];

    if (allPositions.length === 0) {
      return { state: "idle", position: null, attestation: null, loan: null };
    }

    // Prefer a position with an active loan, then the most recently locked one.
    const pledged = allPositions.find((position) => position.status === "pledged");
    const position = pledged ?? allPositions.find((item) => item.status === "locked") ?? allPositions[0];

    const loan =
      allLoans.find(
        (item) => item.collateralId === position.id && (item.status === "active" || item.status === "pending"),
      ) ??
      allLoans.find((item) => item.collateralId === position.id) ??
      null;

    const loanProof =
      loan?.attestationId !== null && loan?.attestationId !== undefined
        ? (allProofs.find((proof) => proof.id === loan.attestationId) ?? null)
        : null;

    const attestation =
      loanProof ?? allProofs.find((proof) => proof.collateralId === position.id) ?? null;

    return { state: deriveFlowState(position, attestation, loan), position, attestation, loan };
  }, [positions, proofs, loans]);
};

/** Ordered lifecycle nodes; only stages that actually occurred are activated. */
export type LifecycleStageId = "locked" | "attested" | "verified" | "borrowed" | "repaid" | "unlocked";

export interface LifecycleStage {
  readonly id: LifecycleStageId;
  readonly label: string;
  readonly complete: boolean;
  readonly timestamp: string | null;
  readonly txHash: string | null;
}

export const buildLifecycle = (snapshot: FlowSnapshot): readonly LifecycleStage[] => {
  const { position, attestation, loan } = snapshot;

  const attested = attestation !== null;
  const verified = attestation?.status === "verified" || attestation?.status === "consumed";
  const borrowed = loan !== null && loan.status !== "failed";
  const repaid = loan?.status === "repaid";
  const unlocked = position?.status === "unlocked";

  return [
    {
      id: "locked",
      label: "Locked",
      complete: position !== null && position.status !== "unlocked",
      timestamp: position?.lockedAt ?? null,
      txHash: position?.lockTxHash ?? null,
    },
    {
      id: "attested",
      label: "Attested",
      complete: attested,
      timestamp: attestation?.createdAt ?? null,
      txHash: null,
    },
    {
      id: "verified",
      label: "Verified",
      complete: verified,
      timestamp: attestation?.verifiedAt ?? null,
      txHash: attestation?.verificationTxHash ?? null,
    },
    {
      id: "borrowed",
      label: "Borrowed",
      complete: borrowed,
      timestamp: loan?.createdAt ?? null,
      txHash: loan?.issueTxHash ?? null,
    },
    {
      id: "repaid",
      label: "Repaid",
      complete: repaid,
      timestamp: loan?.repaidAt ?? null,
      txHash: loan?.repayTxHash ?? null,
    },
    {
      id: "unlocked",
      label: "Unlocked",
      complete: unlocked,
      timestamp: null,
      txHash: null,
    },
  ];
};

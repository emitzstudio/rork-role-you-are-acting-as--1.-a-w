import { Contract, parseEther } from "ethers";

import { CHAIN_A, CHAIN_B } from "@/config/chains";
import { env, isBackendConfigured, isChainAConfigured, isChainBConfigured } from "@/config/env";
import { apiRequest, BackendNotConfiguredError } from "@/services/api/client";
import { COLLATERAL_VAULT_ABI, CROSS_CHAIN_LENDING_ABI } from "@/services/blockchain/abi";
import { getBrowserProvider } from "@/services/wallet/walletProvider";
import type {
  ActivityEvent,
  Attestation,
  AttackScenarioId,
  CollateralPosition,
  Loan,
  ProtocolVerification,
  SimulationLogEntry,
  SimulationResult,
  SystemStatus,
  WalletBalance,
} from "@/types/protocol";
import type {
  ActivityService,
  BorrowProgressUpdate,
  BorrowRequest,
  CollateralService,
  LoanService,
  LockRequest,
  OperationsService,
  ProofService,
  ProtocolServices,
  SecurityService,
  StatusService,
} from "@/services/types";
import { getScenario, REJECTION_EXPLANATION } from "@/services/mock/attackScenarios";
import { PROTOCOL_VERIFICATION } from "@/services/mock/demoData";

/* ------------------------------------------------------------------
   Backend response shapes (as returned by the existing relayer API).
   Normalizers are defensive: the frontend is never authoritative.
   ------------------------------------------------------------------ */

interface RawCollateral {
  collateralId?: string | number;
  id?: string | number;
  owner?: string;
  asset?: string;
  assetSymbol?: string;
  amount?: string | number;
  valueUsd?: string | number | null;
  status?: string;
  chainId?: number;
  vault?: string;
  vaultAddress?: string;
  stateVersion?: number;
  blockNumber?: number;
  lockedAt?: string;
  createdAt?: string;
  txHash?: string;
  loanId?: string | number | null;
  maxLtv?: number;
  ltv?: number;
}

interface RawLoan {
  loanId?: string | number;
  id?: string | number;
  borrower?: string;
  collateralId?: string | number;
  amount?: string | number;
  principal?: string | number;
  outstanding?: string | number;
  currency?: string;
  symbol?: string;
  status?: string;
  sourceChainId?: number;
  destinationChainId?: number;
  lender?: string | null;
  healthFactor?: number | null;
  attestationId?: string | null;
  proofId?: string | null;
  createdAt?: string;
  repaidAt?: string | null;
  txHash?: string | null;
  repayTxHash?: string | null;
}

interface RawAttestation {
  id?: string;
  proofId?: string;
  attestationId?: string;
  collateralId?: string | number;
  owner?: string;
  sourceChainId?: number;
  destinationChainId?: number;
  sourceVault?: string;
  assetSymbol?: string;
  amount?: string | number;
  stateVersion?: number;
  blockNumber?: number;
  nonce?: string;
  signer?: string;
  signature?: string;
  status?: string;
  createdAt?: string;
  expiresAt?: string | null;
  verifiedAt?: string | null;
  transmittedAt?: string | null;
  verificationTxHash?: string | null;
  txHash?: string | null;
  loanId?: string | null;
  domain?: { name?: string; version?: string; chainId?: number; verifyingContract?: string };
  reason?: string | null;
  error?: string | null;
}

interface RawActivity {
  id?: string;
  type?: string;
  kind?: string;
  title?: string;
  message?: string;
  detail?: string;
  timestamp?: string;
  createdAt?: string;
  chainId?: number;
  collateralId?: string | number | null;
  loanId?: string | null;
  proofId?: string | null;
  txHash?: string | null;
  status?: string;
}

const toNumber = (value: string | number | null | undefined, fallback: number | null = null): number | null => {
  if (value === null || value === undefined) return fallback;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeCollateralStatus = (status: string | undefined): CollateralPosition["status"] => {
  switch ((status ?? "").toLowerCase()) {
    case "pledged":
    case "borrowed":
    case "in_use":
      return "pledged";
    case "unlocked":
    case "released":
      return "unlocked";
    case "liquidated":
      return "liquidated";
    default:
      return "locked";
  }
};

const normalizeCollateral = (raw: RawCollateral): CollateralPosition => ({
  id: String(raw.collateralId ?? raw.id ?? ""),
  owner: raw.owner ?? "",
  assetSymbol: raw.assetSymbol ?? CHAIN_A.nativeCurrency.symbol,
  assetName: raw.assetSymbol === "ETH" || !raw.assetSymbol ? "Ethereum" : raw.assetSymbol,
  assetAddress: raw.asset ?? null,
  amount: toNumber(raw.amount, 0) ?? 0,
  valueUsd: toNumber(raw.valueUsd ?? null, null),
  status: normalizeCollateralStatus(raw.status),
  chainId: raw.chainId ?? CHAIN_A.chainId,
  vaultAddress: raw.vaultAddress ?? raw.vault ?? env.collateralVaultAddress,
  stateVersion: raw.stateVersion ?? 0,
  blockNumber: raw.blockNumber ?? null,
  lockedAt: raw.lockedAt ?? raw.createdAt ?? new Date().toISOString(),
  lockTxHash: raw.txHash ?? null,
  activeLoanId: raw.loanId === null || raw.loanId === undefined ? null : String(raw.loanId),
  maxLtv: raw.maxLtv ?? raw.ltv ?? 0.75,
});

const normalizeLoanStatus = (status: string | undefined): Loan["status"] => {
  switch ((status ?? "").toLowerCase()) {
    case "repaid":
    case "closed":
      return "repaid";
    case "liquidated":
      return "liquidated";
    case "pending":
    case "processing":
      return "pending";
    case "failed":
      return "failed";
    default:
      return "active";
  }
};

const normalizeLoan = (raw: RawLoan): Loan => {
  const principal = toNumber(raw.principal ?? raw.amount, 0) ?? 0;
  return {
    id: String(raw.loanId ?? raw.id ?? ""),
    borrower: raw.borrower ?? "",
    collateralId: String(raw.collateralId ?? ""),
    principal,
    outstanding: toNumber(raw.outstanding, principal) ?? principal,
    currencySymbol: raw.currency ?? raw.symbol ?? "USDC",
    status: normalizeLoanStatus(raw.status),
    sourceChainId: raw.sourceChainId ?? CHAIN_A.chainId,
    destinationChainId: raw.destinationChainId ?? CHAIN_B.chainId,
    lender: raw.lender ?? null,
    healthFactor: raw.healthFactor ?? null,
    attestationId: raw.attestationId ?? raw.proofId ?? null,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    repaidAt: raw.repaidAt ?? null,
    issueTxHash: raw.txHash ?? null,
    repayTxHash: raw.repayTxHash ?? null,
  };
};

const normalizeProofStatus = (status: string | undefined): Attestation["status"] => {
  switch ((status ?? "").toLowerCase()) {
    case "verified":
      return "verified";
    case "consumed":
    case "used":
      return "consumed";
    case "transmitted":
    case "submitted":
      return "transmitted";
    case "signed":
      return "signed";
    case "failed":
    case "rejected":
      return "failed";
    default:
      return "pending";
  }
};

const normalizeAttestation = (raw: RawAttestation): Attestation => ({
  id: String(raw.id ?? raw.proofId ?? raw.attestationId ?? ""),
  collateralId: String(raw.collateralId ?? ""),
  owner: raw.owner ?? "",
  sourceChainId: raw.sourceChainId ?? CHAIN_A.chainId,
  destinationChainId: raw.destinationChainId ?? CHAIN_B.chainId,
  sourceVault: raw.sourceVault ?? env.collateralVaultAddress,
  assetSymbol: raw.assetSymbol ?? CHAIN_A.nativeCurrency.symbol,
  amount: toNumber(raw.amount, 0) ?? 0,
  stateVersion: raw.stateVersion ?? 0,
  blockNumber: raw.blockNumber ?? null,
  nonce: raw.nonce ?? "",
  signer: raw.signer ?? "",
  signature: raw.signature ?? "",
  status: normalizeProofStatus(raw.status),
  createdAt: raw.createdAt ?? new Date().toISOString(),
  expiresAt: raw.expiresAt ?? null,
  verifiedAt: raw.verifiedAt ?? null,
  transmittedAt: raw.transmittedAt ?? null,
  verificationTxHash: raw.verificationTxHash ?? raw.txHash ?? null,
  loanId: raw.loanId ?? null,
  domain: {
    name: raw.domain?.name ?? "OmniVault",
    version: raw.domain?.version ?? "1",
    chainId: raw.domain?.chainId ?? CHAIN_B.chainId,
    verifyingContract: raw.domain?.verifyingContract ?? env.attestationVerifierAddress,
  },
  failureReason: raw.reason ?? raw.error ?? null,
});

const ACTIVITY_KIND_MAP: Record<string, ActivityEvent["kind"]> = {
  collateral_locked: "collateral_locked",
  locked: "collateral_locked",
  attestation_created: "attestation_created",
  attestation: "attestation_created",
  proof_submitted: "proof_submitted",
  relay: "proof_submitted",
  attestation_verified: "attestation_verified",
  verified: "attestation_verified",
  loan_issued: "loan_issued",
  borrow: "loan_issued",
  loan_repaid: "loan_repaid",
  repay: "loan_repaid",
  collateral_unlocked: "collateral_unlocked",
  unlocked: "collateral_unlocked",
  attack_rejected: "attack_rejected",
  relayer_action: "relayer_action",
};

const CATEGORY_BY_KIND: Record<ActivityEvent["kind"], ActivityEvent["category"]> = {
  collateral_locked: "chainA",
  attestation_created: "relayer",
  proof_submitted: "relayer",
  attestation_verified: "chainB",
  loan_issued: "chainB",
  loan_repaid: "loan",
  collateral_unlocked: "chainA",
  attack_rejected: "security",
  relayer_action: "relayer",
};

const TITLE_BY_KIND: Record<ActivityEvent["kind"], string> = {
  collateral_locked: "Collateral locked",
  attestation_created: "Attestation created",
  proof_submitted: "Proof submitted",
  attestation_verified: "Attestation verified",
  loan_issued: "Loan issued",
  loan_repaid: "Loan repaid",
  collateral_unlocked: "Collateral unlocked",
  attack_rejected: "Attack rejected",
  relayer_action: "Relayer action",
};

const normalizeActivity = (raw: RawActivity, index: number): ActivityEvent => {
  const kindKey = (raw.kind ?? raw.type ?? "").toLowerCase();
  const kind = ACTIVITY_KIND_MAP[kindKey] ?? "relayer_action";
  return {
    id: raw.id ?? `activity-${index}`,
    kind,
    category: CATEGORY_BY_KIND[kind],
    title: raw.title ?? TITLE_BY_KIND[kind],
    detail: raw.detail ?? raw.message ?? null,
    timestamp: raw.timestamp ?? raw.createdAt ?? new Date().toISOString(),
    chainId: raw.chainId ?? null,
    collateralId: raw.collateralId === null || raw.collateralId === undefined ? null : String(raw.collateralId),
    loanId: raw.loanId ?? null,
    proofId: raw.proofId ?? null,
    txHash: raw.txHash ?? null,
    status: raw.status === "failed" || raw.status === "rejected" ? "failed" : raw.status === "pending" ? "pending" : "success",
  };
};

/* ------------------------------------------------------------------
   Live services
   ------------------------------------------------------------------ */

const liveCollateral: CollateralService = {
  async listPositions(owner: string): Promise<readonly CollateralPosition[]> {
    if (!isBackendConfigured()) throw new BackendNotConfiguredError();
    const payload = await apiRequest<RawCollateral[] | { collateral?: RawCollateral[] }>(
      `/collateral?owner=${encodeURIComponent(owner)}`,
    );
    const list = Array.isArray(payload) ? payload : (payload.collateral ?? []);
    return list.map(normalizeCollateral).filter((position) => position.id.length > 0);
  },

  async getPosition(id: string): Promise<CollateralPosition | null> {
    if (!isBackendConfigured()) throw new BackendNotConfiguredError();
    const payload = await apiRequest<RawCollateral | { collateral?: RawCollateral }>(
      `/collateral/${encodeURIComponent(id)}`,
    );
    const raw = "collateral" in payload && payload.collateral ? payload.collateral : (payload as RawCollateral);
    return raw && (raw.id ?? raw.collateralId) !== undefined ? normalizeCollateral(raw) : null;
  },

  async getWalletBalance(owner: string): Promise<WalletBalance | null> {
    const provider = getBrowserProvider();
    if (!provider) return null;
    try {
      const raw = await provider.getBalance(owner);
      return {
        symbol: CHAIN_A.nativeCurrency.symbol,
        amount: Number.parseFloat((Number(raw) / 1e18).toFixed(6)),
        valueUsd: null,
      };
    } catch {
      return null;
    }
  },
};

const liveLoans: LoanService = {
  async listLoans(borrower: string): Promise<readonly Loan[]> {
    if (!isBackendConfigured()) throw new BackendNotConfiguredError();
    const payload = await apiRequest<RawLoan[] | { loans?: RawLoan[] }>(`/loan?borrower=${encodeURIComponent(borrower)}`);
    const list = Array.isArray(payload) ? payload : (payload.loans ?? []);
    return list.map(normalizeLoan).filter((loan) => loan.id.length > 0);
  },
  async getLoan(id: string): Promise<Loan | null> {
    if (!isBackendConfigured()) throw new BackendNotConfiguredError();
    const payload = await apiRequest<RawLoan | { loan?: RawLoan }>(`/loan/${encodeURIComponent(id)}`);
    const raw = "loan" in payload && payload.loan ? payload.loan : (payload as RawLoan);
    return raw && (raw.id ?? raw.loanId) !== undefined ? normalizeLoan(raw) : null;
  },
};

const liveProofs: ProofService = {
  async listProofs(owner: string): Promise<readonly Attestation[]> {
    if (!isBackendConfigured()) throw new BackendNotConfiguredError();
    const payload = await apiRequest<RawAttestation[] | { attestations?: RawAttestation[] }>(
      `/attestations?owner=${encodeURIComponent(owner)}`,
    );
    const list = Array.isArray(payload) ? payload : (payload.attestations ?? []);
    return list.map(normalizeAttestation).filter((proof) => proof.id.length > 0);
  },
  async getProof(id: string): Promise<Attestation | null> {
    if (!isBackendConfigured()) throw new BackendNotConfiguredError();
    const payload = await apiRequest<RawAttestation | { attestation?: RawAttestation }>(
      `/attestations/${encodeURIComponent(id)}`,
    );
    const raw = "attestation" in payload && payload.attestation ? payload.attestation : (payload as RawAttestation);
    return raw && (raw.id ?? raw.proofId ?? raw.attestationId) !== undefined ? normalizeAttestation(raw) : null;
  },
};

const liveActivity: ActivityService = {
  async listActivity(): Promise<readonly ActivityEvent[]> {
    if (!isBackendConfigured()) throw new BackendNotConfiguredError();
    const payload = await apiRequest<RawActivity[] | { activity?: RawActivity[] }>("/activity");
    const list = Array.isArray(payload) ? payload : (payload.activity ?? []);
    return list.map(normalizeActivity).sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  },
};

interface RawRelayerStatus {
  status?: string;
  address?: string;
  relayer?: string;
  queue?: number;
  queueDepth?: number;
  lastRelayAt?: string;
  chainA?: boolean;
  chainB?: boolean;
  chainAConnected?: boolean;
  chainBConnected?: boolean;
}

const liveStatus: StatusService = {
  async getSystemStatus(): Promise<SystemStatus> {
    const checkedAt = new Date().toISOString();
    const contracts = {
      collateralVault: isChainAConfigured() ? env.collateralVaultAddress : null,
      attestationVerifier: isChainBConfigured() ? env.attestationVerifierAddress : null,
      crossChainLending: isChainBConfigured() ? env.crossChainLendingAddress : null,
    };

    if (!isBackendConfigured()) {
      return {
        backend: "unavailable",
        chainA: "unknown",
        chainB: "unknown",
        relayer: {
          health: "unavailable",
          address: null,
          queueDepth: null,
          lastRelayAt: null,
          chainAConnected: false,
          chainBConnected: false,
        },
        contracts,
        checkedAt,
      };
    }

    let backend: SystemStatus["backend"] = "unavailable";
    try {
      await apiRequest<unknown>("/health", { timeoutMs: 6000 });
      backend = "operational";
    } catch {
      backend = "unavailable";
    }

    let relayerRaw: RawRelayerStatus | null = null;
    try {
      relayerRaw = await apiRequest<RawRelayerStatus>("/relayer/status", { timeoutMs: 6000 });
    } catch {
      relayerRaw = null;
    }

    const chainAConnected = relayerRaw?.chainAConnected ?? relayerRaw?.chainA ?? false;
    const chainBConnected = relayerRaw?.chainBConnected ?? relayerRaw?.chainB ?? false;

    return {
      backend,
      chainA: relayerRaw === null ? "unknown" : chainAConnected ? "operational" : "unavailable",
      chainB: relayerRaw === null ? "unknown" : chainBConnected ? "operational" : "unavailable",
      relayer: {
        health:
          relayerRaw === null
            ? "unavailable"
            : (relayerRaw.status ?? "").toLowerCase() === "degraded"
              ? "degraded"
              : "operational",
        address: relayerRaw?.address ?? relayerRaw?.relayer ?? null,
        queueDepth: relayerRaw?.queueDepth ?? relayerRaw?.queue ?? null,
        lastRelayAt: relayerRaw?.lastRelayAt ?? null,
        chainAConnected,
        chainBConnected,
      },
      contracts,
      checkedAt,
    };
  },

  async getVerification(): Promise<ProtocolVerification> {
    return PROTOCOL_VERIFICATION;
  },
};

const liveOperations: OperationsService = {
  async capabilities() {
    const hasWallet = getBrowserProvider() !== null;
    return {
      lock: hasWallet && isChainAConfigured(),
      borrow: isBackendConfigured() && isChainAConfigured(),
      repay: hasWallet && isChainBConfigured(),
      unlock: hasWallet && isChainAConfigured(),
    };
  },

  async lockCollateral(request: LockRequest, onProgress): Promise<CollateralPosition> {
    const provider = getBrowserProvider();
    if (!provider) throw new Error("No EVM wallet detected");
    if (!isChainAConfigured()) throw new Error("CollateralVault address is not configured");

    onProgress("preparing");
    const signer = await provider.getSigner();
    const vault = new Contract(env.collateralVaultAddress, COLLATERAL_VAULT_ABI, signer);
    const value = parseEther(String(request.amount));

    onProgress("awaiting_wallet");
    const tx = await vault.lock(value, { value });
    onProgress("submitted", tx.hash);
    onProgress("pending", tx.hash);
    const receipt = await tx.wait();
    onProgress("confirming", tx.hash);
    if (!receipt || receipt.status !== 1) throw new Error("Transaction reverted");

    // Chain A is authoritative — re-read state rather than assuming.
    const positions = await liveCollateral.listPositions(request.owner);
    const created = positions.find((position) => position.lockTxHash === tx.hash) ?? positions[0];
    if (!created) throw new Error("Collateral not found after confirmation");
    onProgress("confirmed", tx.hash);
    return created;
  },

  async borrow(request: BorrowRequest, onProgress: (update: BorrowProgressUpdate) => void): Promise<Loan> {
    if (!isBackendConfigured()) throw new BackendNotConfiguredError();

    onProgress({ stage: "verify", status: "active" });
    const position = await liveCollateral.getPosition(request.collateralId);
    if (!position) {
      onProgress({ stage: "verify", status: "failed", detail: "Collateral not found" });
      throw new Error("Collateral not found");
    }
    if (position.status === "pledged") {
      onProgress({ stage: "verify", status: "failed", detail: "CollateralAlreadyPledged" });
      throw new Error("CollateralAlreadyPledged");
    }
    onProgress({ stage: "verify", status: "success", detail: `State version ${position.stateVersion}` });

    onProgress({ stage: "attest", status: "active" });
    onProgress({ stage: "transmit", status: "active" });

    interface RelayResponse {
      attestation?: RawAttestation;
      loan?: RawLoan;
      loanId?: string;
      txHash?: string;
      error?: string;
    }

    let relay: RelayResponse;
    try {
      relay = await apiRequest<RelayResponse>(`/relay/${encodeURIComponent(request.collateralId)}`, {
        method: "POST",
        body: { amount: request.amount, currency: request.currencySymbol, borrower: request.borrower },
        timeoutMs: 60000,
      });
    } catch (error) {
      onProgress({ stage: "transmit", status: "failed", detail: error instanceof Error ? error.message : "Relay failed" });
      throw error;
    }

    const proofId = relay.attestation?.id ?? relay.attestation?.proofId ?? null;
    onProgress({ stage: "attest", status: "success", detail: proofId ? `Proof #${proofId} signed` : "Attestation signed" });
    onProgress({ stage: "transmit", status: "success", detail: "Relayer submitted proof to Chain B" });

    onProgress({ stage: "verify_chain_b", status: "active" });
    onProgress({
      stage: "verify_chain_b",
      status: "success",
      detail: "Attestation verified",
      txHash: relay.txHash ?? undefined,
    });

    onProgress({ stage: "issue", status: "active" });
    const loanId = relay.loan ? String(relay.loan.loanId ?? relay.loan.id ?? "") : (relay.loanId ?? "");
    if (!loanId) {
      onProgress({ stage: "issue", status: "failed", detail: "Loan was not issued" });
      throw new Error("Loan was not issued");
    }

    // Chain B / backend is authoritative — re-read the loan.
    const loan = await liveLoans.getLoan(loanId);
    if (!loan) {
      onProgress({ stage: "issue", status: "failed", detail: "Loan not found after issuance" });
      throw new Error("Loan not found after issuance");
    }
    onProgress({ stage: "issue", status: "success", detail: "Loan issued", txHash: loan.issueTxHash ?? undefined });
    return loan;
  },

  async repay(loanId: string, onProgress): Promise<Loan> {
    const provider = getBrowserProvider();
    if (!provider) throw new Error("No EVM wallet detected");
    if (!isChainBConfigured()) throw new Error("CrossChainLending address is not configured");

    onProgress("preparing");
    const signer = await provider.getSigner();
    const lending = new Contract(env.crossChainLendingAddress, CROSS_CHAIN_LENDING_ABI, signer);

    onProgress("awaiting_wallet");
    const tx = await lending.repay(loanId);
    onProgress("submitted", tx.hash);
    onProgress("pending", tx.hash);
    const receipt = await tx.wait();
    onProgress("confirming", tx.hash);
    if (!receipt || receipt.status !== 1) throw new Error("Transaction reverted");

    const loan = await liveLoans.getLoan(loanId);
    if (!loan) throw new Error("Loan not found after repayment");
    onProgress("confirmed", tx.hash);
    return loan;
  },

  async unlock(collateralId: string, onProgress): Promise<CollateralPosition> {
    const provider = getBrowserProvider();
    if (!provider) throw new Error("No EVM wallet detected");
    if (!isChainAConfigured()) throw new Error("CollateralVault address is not configured");

    onProgress("preparing");
    const signer = await provider.getSigner();
    const vault = new Contract(env.collateralVaultAddress, COLLATERAL_VAULT_ABI, signer);

    onProgress("awaiting_wallet");
    const tx = await vault.unlock(collateralId);
    onProgress("submitted", tx.hash);
    onProgress("pending", tx.hash);
    const receipt = await tx.wait();
    onProgress("confirming", tx.hash);
    if (!receipt || receipt.status !== 1) throw new Error("Transaction reverted");

    const position = await liveCollateral.getPosition(collateralId);
    if (!position) throw new Error("Collateral not found after unlock");
    onProgress("confirmed", tx.hash);
    return position;
  },
};

/**
 * Attack simulation is an explicit, clearly-labelled UI demonstration of the
 * protocol's protection rules. It never submits a transaction in LIVE mode.
 */
const liveSecurity: SecurityService = {
  async runSimulation(
    scenarioId: AttackScenarioId,
    onStep: (label: string, status: "running" | "passed" | "blocked") => void,
  ): Promise<SimulationResult> {
    const scenario = getScenario(scenarioId);
    const log: SimulationLogEntry[] = [];
    const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

    onStep("Initializing attack simulation...", "running");
    await wait(450);
    onStep("Initializing attack simulation...", "passed");
    log.push({ label: "Initializing attack simulation...", status: "passed", timestamp: new Date().toISOString() });

    for (let index = 0; index < scenario.checks.length; index += 1) {
      const label = scenario.checks[index];
      const isFinal = index === scenario.checks.length - 1;
      onStep(label, "running");
      await wait(600);
      const status = isFinal ? "blocked" : "passed";
      onStep(label, status);
      log.push({ label, status, timestamp: new Date().toISOString() });
    }

    return {
      scenarioId,
      rejected: true,
      reasonCode: scenario.reasonCode,
      explanation: REJECTION_EXPLANATION[scenarioId],
      log,
    };
  },
};

export const liveServices: ProtocolServices = {
  collateral: liveCollateral,
  loans: liveLoans,
  proofs: liveProofs,
  activity: liveActivity,
  status: liveStatus,
  operations: liveOperations,
  security: liveSecurity,
};

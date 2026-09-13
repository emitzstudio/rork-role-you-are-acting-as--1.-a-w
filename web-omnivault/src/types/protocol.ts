/** Domain model shared by live and demo service implementations. */

export type DataMode = "live" | "demo";

export type CollateralStatus = "locked" | "pledged" | "unlocked" | "liquidated";

export interface CollateralPosition {
  readonly id: string;
  readonly owner: string;
  readonly assetSymbol: string;
  readonly assetName: string;
  readonly assetAddress: string | null;
  /** Human-readable amount, already formatted from on-chain decimals. */
  readonly amount: number;
  /** Fiat valuation, or null when no price source is available. */
  readonly valueUsd: number | null;
  readonly status: CollateralStatus;
  readonly chainId: number;
  readonly vaultAddress: string;
  readonly stateVersion: number;
  readonly blockNumber: number | null;
  readonly lockedAt: string;
  readonly lockTxHash: string | null;
  /** Loan currently backed by this position, when pledged. */
  readonly activeLoanId: string | null;
  /** Maximum loan-to-value ratio (0-1) enforced by the lending contract. */
  readonly maxLtv: number;
}

export type LoanStatus = "pending" | "active" | "repaid" | "liquidated" | "failed";

export interface Loan {
  readonly id: string;
  readonly borrower: string;
  readonly collateralId: string;
  readonly principal: number;
  readonly outstanding: number;
  readonly currencySymbol: string;
  readonly status: LoanStatus;
  readonly sourceChainId: number;
  readonly destinationChainId: number;
  readonly lender: string | null;
  readonly healthFactor: number | null;
  readonly attestationId: string | null;
  readonly createdAt: string;
  readonly repaidAt: string | null;
  readonly issueTxHash: string | null;
  readonly repayTxHash: string | null;
}

export type ProofStatus = "pending" | "signed" | "transmitted" | "verified" | "failed" | "consumed";

export interface Attestation {
  readonly id: string;
  readonly collateralId: string;
  readonly owner: string;
  readonly sourceChainId: number;
  readonly destinationChainId: number;
  readonly sourceVault: string;
  readonly assetSymbol: string;
  readonly amount: number;
  readonly stateVersion: number;
  readonly blockNumber: number | null;
  readonly nonce: string;
  readonly signer: string;
  readonly signature: string;
  readonly status: ProofStatus;
  readonly createdAt: string;
  readonly expiresAt: string | null;
  readonly verifiedAt: string | null;
  readonly transmittedAt: string | null;
  readonly verificationTxHash: string | null;
  readonly loanId: string | null;
  readonly domain: Eip712Domain;
  readonly failureReason: string | null;
}

export interface Eip712Domain {
  readonly name: string;
  readonly version: string;
  readonly chainId: number;
  readonly verifyingContract: string;
}

export type ActivityKind =
  | "collateral_locked"
  | "attestation_created"
  | "proof_submitted"
  | "attestation_verified"
  | "loan_issued"
  | "loan_repaid"
  | "collateral_unlocked"
  | "attack_rejected"
  | "relayer_action";

export type ActivityCategory = "chainA" | "chainB" | "collateral" | "loan" | "security" | "relayer";

export interface ActivityEvent {
  readonly id: string;
  readonly kind: ActivityKind;
  readonly category: ActivityCategory;
  readonly title: string;
  readonly detail: string | null;
  readonly timestamp: string;
  readonly chainId: number | null;
  readonly collateralId: string | null;
  readonly loanId: string | null;
  readonly proofId: string | null;
  readonly txHash: string | null;
  readonly status: "success" | "pending" | "failed";
}

export type ServiceHealth = "operational" | "degraded" | "unavailable" | "unknown";

export interface RelayerStatus {
  readonly health: ServiceHealth;
  readonly address: string | null;
  readonly queueDepth: number | null;
  readonly lastRelayAt: string | null;
  readonly chainAConnected: boolean;
  readonly chainBConnected: boolean;
}

export interface SystemStatus {
  readonly backend: ServiceHealth;
  readonly chainA: ServiceHealth;
  readonly chainB: ServiceHealth;
  readonly relayer: RelayerStatus;
  readonly contracts: {
    readonly collateralVault: string | null;
    readonly attestationVerifier: string | null;
    readonly crossChainLending: string | null;
  };
  readonly checkedAt: string;
}

/** The state machine that drives the signature cross-chain animation. */
export type FlowState =
  | "idle"
  | "collateral_locked"
  | "attestation_creating"
  | "attestation_ready"
  | "proof_moving"
  | "verifying"
  | "verified"
  | "loan_issued"
  | "loan_repaid"
  | "collateral_unlocked"
  | "failed";

export type TxPhase =
  | "idle"
  | "preparing"
  | "awaiting_wallet"
  | "submitted"
  | "pending"
  | "confirming"
  | "confirmed"
  | "failed"
  | "rejected";

export interface TxState {
  readonly phase: TxPhase;
  readonly hash: string | null;
  readonly chainId: number | null;
  readonly error: string | null;
}

export type BorrowStageId = "verify" | "attest" | "transmit" | "verify_chain_b" | "issue";

export type StageStatus = "pending" | "active" | "success" | "failed";

export interface BorrowStage {
  readonly id: BorrowStageId;
  readonly index: number;
  readonly title: string;
  readonly description: string;
  readonly status: StageStatus;
}

export interface VerificationCheck {
  readonly label: string;
  readonly value: string | null;
  readonly passed: boolean | null;
}

export interface BorrowingPower {
  readonly collateralValueUsd: number | null;
  readonly maxLtv: number;
  readonly existingDebt: number;
  readonly availableUsd: number | null;
  readonly healthFactor: number | null;
  readonly currencySymbol: string;
}

export interface WalletBalance {
  readonly symbol: string;
  readonly amount: number;
  readonly valueUsd: number | null;
}

export type AttackScenarioId =
  | "double_pledge"
  | "replay_attack"
  | "stale_proof"
  | "fake_signer"
  | "wrong_chain"
  | "wrong_vault"
  | "tampered_amount"
  | "unauthorized_borrower"
  | "early_liquidation";

export interface AttackScenario {
  readonly id: AttackScenarioId;
  readonly title: string;
  readonly description: string;
  readonly protection: string;
  readonly reasonCode: string;
  readonly checks: readonly string[];
}

export interface SimulationLogEntry {
  readonly label: string;
  readonly status: "running" | "passed" | "blocked";
  readonly timestamp: string;
}

export interface SimulationResult {
  readonly scenarioId: AttackScenarioId;
  readonly rejected: boolean;
  readonly reasonCode: string;
  readonly explanation: string;
  readonly log: readonly SimulationLogEntry[];
}

/** Static, verifiable facts about the protocol implementation itself. */
export interface ProtocolVerification {
  readonly totalTests: number;
  readonly passingTests: number;
  readonly blockchainTests: number;
  readonly backendTests: number;
  readonly attackScenarios: number;
  readonly chains: number;
  readonly endToEndSeconds: number;
}

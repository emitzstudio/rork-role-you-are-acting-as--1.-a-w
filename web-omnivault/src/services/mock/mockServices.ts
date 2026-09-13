import { CHAIN_A, CHAIN_B } from "@/config/chains";
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

import { getScenario, REJECTION_EXPLANATION } from "./attackScenarios";
import {
  DEMO_ACTIVITY,
  DEMO_COLLATERAL,
  DEMO_LENDER,
  DEMO_LENDING_B,
  DEMO_LOANS,
  DEMO_OWNER,
  DEMO_PROOFS,
  DEMO_RELAYER_SIGNER,
  DEMO_VAULT_A,
  DEMO_VERIFIER_B,
  DEMO_WALLET_BALANCE,
  PROTOCOL_VERIFICATION,
} from "./demoData";

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Mutable in-memory demo state so the demo flow can progress realistically. */
interface DemoState {
  collateral: CollateralPosition[];
  loans: Loan[];
  proofs: Attestation[];
  activity: ActivityEvent[];
  balance: WalletBalance;
  sequence: number;
}

const state: DemoState = {
  collateral: [...DEMO_COLLATERAL],
  loans: [...DEMO_LOANS],
  proofs: [...DEMO_PROOFS],
  activity: [...DEMO_ACTIVITY],
  balance: { ...DEMO_WALLET_BALANCE },
  sequence: 1000,
};

export const resetDemoState = (): void => {
  state.collateral = [...DEMO_COLLATERAL];
  state.loans = [...DEMO_LOANS];
  state.proofs = [...DEMO_PROOFS];
  state.activity = [...DEMO_ACTIVITY];
  state.balance = { ...DEMO_WALLET_BALANCE };
  state.sequence = 1000;
};

const nextId = (): string => {
  state.sequence += 1;
  return String(state.sequence);
};

const fakeHexOfLength = (length: number): string => {
  const chars = "0123456789abcdef";
  let out = "0x";
  for (let i = 0; i < length; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

const pushActivity = (event: ActivityEvent): void => {
  state.activity = [event, ...state.activity];
};

const mockCollateral: CollateralService = {
  async listPositions(): Promise<readonly CollateralPosition[]> {
    await wait(220);
    return [...state.collateral].sort((a, b) => (a.lockedAt < b.lockedAt ? 1 : -1));
  },
  async getPosition(id: string): Promise<CollateralPosition | null> {
    await wait(140);
    return state.collateral.find((position) => position.id === id) ?? null;
  },
  async getWalletBalance(): Promise<WalletBalance | null> {
    await wait(120);
    return state.balance;
  },
};

const mockLoans: LoanService = {
  async listLoans(): Promise<readonly Loan[]> {
    await wait(200);
    return [...state.loans].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
  async getLoan(id: string): Promise<Loan | null> {
    await wait(130);
    return state.loans.find((loan) => loan.id === id) ?? null;
  },
};

const mockProofs: ProofService = {
  async listProofs(): Promise<readonly Attestation[]> {
    await wait(210);
    return [...state.proofs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
  async getProof(id: string): Promise<Attestation | null> {
    await wait(130);
    return state.proofs.find((proof) => proof.id.toLowerCase() === id.toLowerCase()) ?? null;
  },
};

const mockActivity: ActivityService = {
  async listActivity(): Promise<readonly ActivityEvent[]> {
    await wait(180);
    return [...state.activity].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  },
};

const mockStatus: StatusService = {
  async getSystemStatus(): Promise<SystemStatus> {
    await wait(160);
    return {
      backend: "operational",
      chainA: "operational",
      chainB: "operational",
      relayer: {
        health: "operational",
        address: DEMO_RELAYER_SIGNER,
        queueDepth: 0,
        lastRelayAt: new Date(Date.now() - 48 * 60_000).toISOString(),
        chainAConnected: true,
        chainBConnected: true,
      },
      contracts: {
        collateralVault: DEMO_VAULT_A,
        attestationVerifier: DEMO_VERIFIER_B,
        crossChainLending: DEMO_LENDING_B,
      },
      checkedAt: new Date().toISOString(),
    };
  },
  async getVerification(): Promise<ProtocolVerification> {
    return PROTOCOL_VERIFICATION;
  },
};

const mockOperations: OperationsService = {
  async capabilities() {
    return { lock: true, borrow: true, repay: true, unlock: true };
  },

  async lockCollateral(request: LockRequest, onProgress): Promise<CollateralPosition> {
    onProgress("preparing");
    await wait(500);
    onProgress("awaiting_wallet");
    await wait(900);
    const hash = fakeHexOfLength(64);
    onProgress("submitted", hash);
    await wait(700);
    onProgress("pending", hash);
    await wait(900);
    onProgress("confirming", hash);
    await wait(700);

    const pricePerUnit = state.balance.valueUsd && state.balance.amount ? state.balance.valueUsd / state.balance.amount : null;
    const position: CollateralPosition = {
      id: nextId(),
      owner: DEMO_OWNER,
      assetSymbol: request.assetSymbol,
      assetName: "Ethereum",
      assetAddress: null,
      amount: request.amount,
      valueUsd: pricePerUnit === null ? null : pricePerUnit * request.amount,
      status: "locked",
      chainId: CHAIN_A.chainId,
      vaultAddress: DEMO_VAULT_A,
      stateVersion: 1,
      blockNumber: 18432000 + Math.floor(Math.random() * 500),
      lockedAt: new Date().toISOString(),
      lockTxHash: hash,
      activeLoanId: null,
      maxLtv: 0.75,
    };

    state.collateral = [position, ...state.collateral];
    state.balance = {
      ...state.balance,
      amount: Math.max(0, state.balance.amount - request.amount),
      valueUsd:
        pricePerUnit === null ? null : pricePerUnit * Math.max(0, state.balance.amount - request.amount),
    };

    pushActivity({
      id: `ev-${Date.now()}`,
      kind: "collateral_locked",
      category: "chainA",
      title: "Collateral locked",
      detail: `${request.amount} ${request.assetSymbol} locked in vault`,
      timestamp: new Date().toISOString(),
      chainId: CHAIN_A.chainId,
      collateralId: position.id,
      loanId: null,
      proofId: null,
      txHash: hash,
      status: "success",
    });

    onProgress("confirmed", hash);
    return position;
  },

  async borrow(request: BorrowRequest, onProgress: (update: BorrowProgressUpdate) => void): Promise<Loan> {
    const position = state.collateral.find((item) => item.id === request.collateralId);
    if (!position) throw new Error("Collateral not found");
    if (position.status === "pledged") throw new Error("CollateralAlreadyPledged");

    onProgress({ stage: "verify", status: "active" });
    await wait(1200);
    onProgress({ stage: "verify", status: "success", detail: `State version ${position.stateVersion}` });

    onProgress({ stage: "attest", status: "active" });
    await wait(1400);
    const proofId = fakeHexOfLength(4).slice(2).toUpperCase();
    onProgress({ stage: "attest", status: "success", detail: `Proof #${proofId} signed` });

    onProgress({ stage: "transmit", status: "active" });
    await wait(1300);
    onProgress({ stage: "transmit", status: "success", detail: "Relayer submitted proof to Chain B" });

    onProgress({ stage: "verify_chain_b", status: "active" });
    await wait(1500);
    const verifyHash = fakeHexOfLength(64);
    onProgress({ stage: "verify_chain_b", status: "success", detail: "Attestation verified", txHash: verifyHash });

    onProgress({ stage: "issue", status: "active" });
    await wait(1200);
    const issueHash = fakeHexOfLength(64);

    const now = new Date().toISOString();
    const loanId = `L-${nextId()}`;
    const collateralValue = position.valueUsd ?? 0;
    const loan: Loan = {
      id: loanId,
      borrower: DEMO_OWNER,
      collateralId: position.id,
      principal: request.amount,
      outstanding: request.amount,
      currencySymbol: request.currencySymbol,
      status: "active",
      sourceChainId: CHAIN_A.chainId,
      destinationChainId: CHAIN_B.chainId,
      lender: DEMO_LENDER,
      healthFactor: request.amount > 0 ? (collateralValue * position.maxLtv) / request.amount : null,
      attestationId: proofId,
      createdAt: now,
      repaidAt: null,
      issueTxHash: issueHash,
      repayTxHash: null,
    };

    const attestation: Attestation = {
      id: proofId,
      collateralId: position.id,
      owner: DEMO_OWNER,
      sourceChainId: CHAIN_A.chainId,
      destinationChainId: CHAIN_B.chainId,
      sourceVault: position.vaultAddress,
      assetSymbol: position.assetSymbol,
      amount: position.amount,
      stateVersion: position.stateVersion,
      blockNumber: position.blockNumber,
      nonce: fakeHexOfLength(64),
      signer: DEMO_RELAYER_SIGNER,
      signature: fakeHexOfLength(130),
      status: "verified",
      createdAt: now,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      verifiedAt: now,
      transmittedAt: now,
      verificationTxHash: verifyHash,
      loanId,
      domain: { name: "OmniVault", version: "1", chainId: CHAIN_B.chainId, verifyingContract: DEMO_VERIFIER_B },
      failureReason: null,
    };

    state.proofs = [attestation, ...state.proofs];
    state.loans = [loan, ...state.loans];
    state.collateral = state.collateral.map((item) =>
      item.id === position.id ? { ...item, status: "pledged", activeLoanId: loanId } : item,
    );

    pushActivity({
      id: `ev-${Date.now()}`,
      kind: "loan_issued",
      category: "chainB",
      title: "Loan issued",
      detail: `${request.amount.toLocaleString()} ${request.currencySymbol} issued on ${CHAIN_B.name}`,
      timestamp: now,
      chainId: CHAIN_B.chainId,
      collateralId: position.id,
      loanId,
      proofId,
      txHash: issueHash,
      status: "success",
    });

    onProgress({ stage: "issue", status: "success", detail: "Loan issued", txHash: issueHash });
    return loan;
  },

  async repay(loanId: string, onProgress): Promise<Loan> {
    const loan = state.loans.find((item) => item.id === loanId);
    if (!loan) throw new Error("Loan not found");

    onProgress("preparing");
    await wait(400);
    onProgress("awaiting_wallet");
    await wait(900);
    const hash = fakeHexOfLength(64);
    onProgress("submitted", hash);
    await wait(700);
    onProgress("pending", hash);
    await wait(800);
    onProgress("confirming", hash);
    await wait(600);

    const now = new Date().toISOString();
    const repaid: Loan = {
      ...loan,
      status: "repaid",
      outstanding: 0,
      healthFactor: null,
      repaidAt: now,
      repayTxHash: hash,
    };
    state.loans = state.loans.map((item) => (item.id === loanId ? repaid : item));
    state.collateral = state.collateral.map((item) =>
      item.id === loan.collateralId ? { ...item, status: "locked", activeLoanId: null } : item,
    );

    pushActivity({
      id: `ev-${Date.now()}`,
      kind: "loan_repaid",
      category: "loan",
      title: "Loan repaid",
      detail: `${loan.principal.toLocaleString()} ${loan.currencySymbol} repaid in full`,
      timestamp: now,
      chainId: CHAIN_B.chainId,
      collateralId: loan.collateralId,
      loanId,
      proofId: loan.attestationId,
      txHash: hash,
      status: "success",
    });

    onProgress("confirmed", hash);
    return repaid;
  },

  async unlock(collateralId: string, onProgress): Promise<CollateralPosition> {
    const position = state.collateral.find((item) => item.id === collateralId);
    if (!position) throw new Error("Collateral not found");
    if (position.status === "pledged") throw new Error("CollateralAlreadyPledged");

    onProgress("preparing");
    await wait(400);
    onProgress("awaiting_wallet");
    await wait(900);
    const hash = fakeHexOfLength(64);
    onProgress("submitted", hash);
    await wait(700);
    onProgress("pending", hash);
    await wait(800);
    onProgress("confirming", hash);
    await wait(600);

    const now = new Date().toISOString();
    const unlocked: CollateralPosition = { ...position, status: "unlocked", activeLoanId: null };
    state.collateral = state.collateral.map((item) => (item.id === collateralId ? unlocked : item));

    const pricePerUnit = position.valueUsd !== null ? position.valueUsd / position.amount : null;
    state.balance = {
      ...state.balance,
      amount: state.balance.amount + position.amount,
      valueUsd: pricePerUnit === null ? state.balance.valueUsd : pricePerUnit * (state.balance.amount + position.amount),
    };

    pushActivity({
      id: `ev-${Date.now()}`,
      kind: "collateral_unlocked",
      category: "chainA",
      title: "Collateral unlocked",
      detail: `${position.amount} ${position.assetSymbol} released back to owner`,
      timestamp: now,
      chainId: CHAIN_A.chainId,
      collateralId,
      loanId: null,
      proofId: null,
      txHash: hash,
      status: "success",
    });

    onProgress("confirmed", hash);
    return unlocked;
  },
};

const mockSecurity: SecurityService = {
  async runSimulation(
    scenarioId: AttackScenarioId,
    onStep: (label: string, status: "running" | "passed" | "blocked") => void,
  ): Promise<SimulationResult> {
    const scenario = getScenario(scenarioId);
    const log: SimulationLogEntry[] = [];

    onStep("Initializing attack simulation...", "running");
    await wait(500);
    onStep("Initializing attack simulation...", "passed");
    log.push({ label: "Initializing attack simulation...", status: "passed", timestamp: new Date().toISOString() });

    for (let index = 0; index < scenario.checks.length; index += 1) {
      const label = scenario.checks[index];
      const isFinal = index === scenario.checks.length - 1;
      onStep(label, "running");
      await wait(650);
      const status = isFinal ? "blocked" : "passed";
      onStep(label, status);
      log.push({ label, status, timestamp: new Date().toISOString() });
    }

    await wait(350);

    pushActivity({
      id: `ev-${Date.now()}`,
      kind: "attack_rejected",
      category: "security",
      title: `${scenario.title} rejected`,
      detail: scenario.reasonCode,
      timestamp: new Date().toISOString(),
      chainId: CHAIN_B.chainId,
      collateralId: null,
      loanId: null,
      proofId: null,
      txHash: null,
      status: "failed",
    });

    return {
      scenarioId,
      rejected: true,
      reasonCode: scenario.reasonCode,
      explanation: REJECTION_EXPLANATION[scenarioId],
      log,
    };
  },
};

export const mockServices: ProtocolServices = {
  collateral: mockCollateral,
  loans: mockLoans,
  proofs: mockProofs,
  activity: mockActivity,
  status: mockStatus,
  operations: mockOperations,
  security: mockSecurity,
};

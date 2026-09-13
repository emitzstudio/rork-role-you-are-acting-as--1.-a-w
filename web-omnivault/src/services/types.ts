import type {
  ActivityEvent,
  Attestation,
  AttackScenarioId,
  BorrowStageId,
  CollateralPosition,
  Loan,
  ProtocolVerification,
  SimulationResult,
  SystemStatus,
  WalletBalance,
} from "@/types/protocol";

/** Contract every data provider (live or demo) must satisfy. */
export interface CollateralService {
  listPositions(owner: string): Promise<readonly CollateralPosition[]>;
  getPosition(id: string): Promise<CollateralPosition | null>;
  getWalletBalance(owner: string): Promise<WalletBalance | null>;
}

export interface LoanService {
  listLoans(borrower: string): Promise<readonly Loan[]>;
  getLoan(id: string): Promise<Loan | null>;
}

export interface ProofService {
  listProofs(owner: string): Promise<readonly Attestation[]>;
  getProof(id: string): Promise<Attestation | null>;
}

export interface ActivityService {
  listActivity(owner: string): Promise<readonly ActivityEvent[]>;
}

export interface StatusService {
  getSystemStatus(): Promise<SystemStatus>;
  getVerification(): Promise<ProtocolVerification>;
}

export interface BorrowProgressUpdate {
  readonly stage: BorrowStageId;
  readonly status: "active" | "success" | "failed";
  readonly detail?: string;
  readonly txHash?: string;
}

export interface BorrowRequest {
  readonly collateralId: string;
  readonly amount: number;
  readonly currencySymbol: string;
  readonly borrower: string;
}

export interface LockRequest {
  readonly owner: string;
  readonly amount: number;
  readonly assetSymbol: string;
}

export interface OperationsService {
  /** Whether the connected backend/contracts expose this capability. */
  capabilities(): Promise<{
    lock: boolean;
    borrow: boolean;
    repay: boolean;
    unlock: boolean;
  }>;
  lockCollateral(request: LockRequest, onProgress: (phase: string, hash?: string) => void): Promise<CollateralPosition>;
  borrow(request: BorrowRequest, onProgress: (update: BorrowProgressUpdate) => void): Promise<Loan>;
  repay(loanId: string, onProgress: (phase: string, hash?: string) => void): Promise<Loan>;
  unlock(collateralId: string, onProgress: (phase: string, hash?: string) => void): Promise<CollateralPosition>;
}

export interface SecurityService {
  runSimulation(
    scenario: AttackScenarioId,
    onStep: (label: string, status: "running" | "passed" | "blocked") => void,
  ): Promise<SimulationResult>;
}

export interface ProtocolServices {
  readonly collateral: CollateralService;
  readonly loans: LoanService;
  readonly proofs: ProofService;
  readonly activity: ActivityService;
  readonly status: StatusService;
  readonly operations: OperationsService;
  readonly security: SecurityService;
}

/** Translate raw wallet/RPC/backend failures into user-facing guidance. */

export interface FriendlyError {
  readonly title: string;
  readonly what: string;
  readonly next: string;
  readonly code: string;
  readonly recoverable: boolean;
}

const CONTRACT_REASONS: Record<string, FriendlyError> = {
  AttestationAlreadyConsumed: {
    title: "Attestation already used",
    what: "This proof was already consumed by Chain B and cannot be replayed.",
    next: "Generate a fresh attestation for the current collateral state.",
    code: "AttestationAlreadyConsumed",
    recoverable: true,
  },
  CollateralAlreadyPledged: {
    title: "Collateral already in use",
    what: "This position is currently backing an active loan.",
    next: "Repay the existing loan or choose a different collateral position.",
    code: "CollateralAlreadyPledged",
    recoverable: true,
  },
  StaleStateVersion: {
    title: "Outdated collateral state",
    what: "Your attestation references an outdated collateral state.",
    next: "Refresh the collateral state and generate a new proof.",
    code: "StaleStateVersion",
    recoverable: true,
  },
  InvalidSigner: {
    title: "Untrusted signer",
    what: "The attestation was not signed by an authorized relayer key.",
    next: "Request a new attestation from the protocol relayer.",
    code: "InvalidSigner",
    recoverable: false,
  },
  InvalidSourceChain: {
    title: "Wrong source chain",
    what: "The proof does not originate from the expected collateral chain.",
    next: "Verify the protocol network configuration and retry.",
    code: "InvalidSourceChain",
    recoverable: false,
  },
  InvalidSourceVault: {
    title: "Wrong source vault",
    what: "The proof references a vault that Chain B does not recognise.",
    next: "Verify the deployed vault address and retry.",
    code: "InvalidSourceVault",
    recoverable: false,
  },
  UnauthorizedBorrower: {
    title: "Unauthorized borrower",
    what: "Only the collateral owner can borrow against this position.",
    next: "Connect the wallet that owns this collateral.",
    code: "UnauthorizedBorrower",
    recoverable: true,
  },
  HealthyLoan: {
    title: "Loan is healthy",
    what: "This loan cannot be liquidated while its health factor is above the threshold.",
    next: "No action required.",
    code: "HealthyLoan",
    recoverable: false,
  },
};

const UNKNOWN: FriendlyError = {
  title: "Something went wrong",
  what: "The protocol returned an unexpected response.",
  next: "Refresh and try again. If it persists, check System Status.",
  code: "UnknownError",
  recoverable: true,
};

const messageOf = (error: unknown): string => {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const candidate = error as { shortMessage?: string; reason?: string; message?: string; code?: unknown };
    return candidate.shortMessage ?? candidate.reason ?? candidate.message ?? "";
  }
  return "";
};

const codeOf = (error: unknown): string | number | undefined => {
  if (error && typeof error === "object") {
    const candidate = error as { code?: string | number };
    return candidate.code;
  }
  return undefined;
};

export const toFriendlyError = (error: unknown): FriendlyError => {
  const raw = messageOf(error);
  const code = codeOf(error);

  if (code === 4001 || code === "ACTION_REJECTED" || /user (rejected|denied)/i.test(raw)) {
    return {
      title: "Transaction rejected",
      what: "You declined the request in your wallet.",
      next: "Approve the request in your wallet to continue.",
      code: "UserRejected",
      recoverable: true,
    };
  }

  for (const key of Object.keys(CONTRACT_REASONS)) {
    if (raw.includes(key)) return CONTRACT_REASONS[key];
  }

  if (/insufficient funds/i.test(raw)) {
    return {
      title: "Insufficient funds",
      what: "Your wallet does not have enough balance to cover this transaction and its gas.",
      next: "Top up the connected account on this network and retry.",
      code: "InsufficientFunds",
      recoverable: true,
    };
  }

  if (/network|fetch|Failed to fetch|ECONNREFUSED|NetworkError/i.test(raw)) {
    return {
      title: "Protocol service unavailable",
      what: "The OmniVault backend could not be reached.",
      next: "Check System Status, then retry once the service is reachable.",
      code: "BackendUnavailable",
      recoverable: true,
    };
  }

  if (/timeout|timed out/i.test(raw)) {
    return {
      title: "Transaction timed out",
      what: "The network did not confirm this transaction in time.",
      next: "It may still confirm. Check the explorer before retrying.",
      code: "Timeout",
      recoverable: true,
    };
  }

  if (/revert|execution reverted|CALL_EXCEPTION/i.test(raw)) {
    return {
      title: "Transaction reverted",
      what: "The contract rejected this transaction.",
      next: "Refresh protocol state and confirm your position is still eligible.",
      code: "Reverted",
      recoverable: true,
    };
  }

  if (/not found|404/i.test(raw)) {
    return {
      title: "Not found",
      what: "The requested protocol record does not exist.",
      next: "Return to the list and select an existing item.",
      code: "NotFound",
      recoverable: true,
    };
  }

  return UNKNOWN;
};

export const isUserRejection = (error: unknown): boolean => toFriendlyError(error).code === "UserRejected";

import { useCallback, useRef, useState } from "react";

import type { TxPhase, TxState } from "@/types/protocol";
import { toFriendlyError, type FriendlyError } from "@/utils/errors";

const IDLE: TxState = { phase: "idle", hash: null, chainId: null, error: null };

export const TX_PHASE_LABEL: Record<TxPhase, string> = {
  idle: "Ready",
  preparing: "Preparing transaction",
  awaiting_wallet: "Waiting for wallet confirmation",
  submitted: "Transaction submitted",
  pending: "Pending on network",
  confirming: "Confirming",
  confirmed: "Confirmed",
  failed: "Failed",
  rejected: "Rejected in wallet",
};

export interface TransactionController {
  state: TxState;
  friendlyError: FriendlyError | null;
  isBusy: boolean;
  /** Run an operation, wiring its progress callbacks into the transaction lifecycle. */
  run: <T>(operation: (report: (phase: string, hash?: string) => void) => Promise<T>) => Promise<T | null>;
  reset: () => void;
}

const PHASE_BY_KEY: Record<string, TxPhase> = {
  preparing: "preparing",
  awaiting_wallet: "awaiting_wallet",
  submitted: "submitted",
  pending: "pending",
  confirming: "confirming",
  confirmed: "confirmed",
};

/** Truthful transaction lifecycle: success is only reported after confirmation. */
export const useTransaction = (chainId: number | null = null): TransactionController => {
  const [state, setState] = useState<TxState>(IDLE);
  const [friendlyError, setFriendlyError] = useState<FriendlyError | null>(null);
  const busyRef = useRef(false);

  const reset = useCallback((): void => {
    setState(IDLE);
    setFriendlyError(null);
    busyRef.current = false;
  }, []);

  const run = useCallback(
    async <T,>(operation: (report: (phase: string, hash?: string) => void) => Promise<T>): Promise<T | null> => {
      if (busyRef.current) return null;
      busyRef.current = true;
      setFriendlyError(null);
      setState({ phase: "preparing", hash: null, chainId, error: null });

      const report = (phase: string, hash?: string): void => {
        const mapped = PHASE_BY_KEY[phase];
        if (!mapped) return;
        setState((previous) => ({
          phase: mapped,
          hash: hash ?? previous.hash,
          chainId,
          error: null,
        }));
      };

      try {
        const result = await operation(report);
        setState((previous) => ({ ...previous, phase: "confirmed", error: null }));
        return result;
      } catch (caught) {
        const friendly = toFriendlyError(caught);
        setFriendlyError(friendly);
        setState((previous) => ({
          ...previous,
          phase: friendly.code === "UserRejected" ? "rejected" : "failed",
          error: friendly.what,
        }));
        return null;
      } finally {
        busyRef.current = false;
      }
    },
    [chainId],
  );

  const isBusy =
    state.phase !== "idle" && state.phase !== "confirmed" && state.phase !== "failed" && state.phase !== "rejected";

  return { state, friendlyError, isBusy, run, reset };
};

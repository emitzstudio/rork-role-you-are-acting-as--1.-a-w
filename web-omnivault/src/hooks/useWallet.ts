import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";

import { CHAIN_A, getChainById, isSupportedChain, type ChainConfig } from "@/config/chains";
import {
  getAccounts,
  getChainId,
  hasInjectedWallet,
  requestAccounts,
  subscribeToWalletEvents,
  switchNetwork,
} from "@/services/wallet/walletProvider";
import { useAppStore } from "@/stores/useAppStore";
import { useWalletStore } from "@/stores/useWalletStore";
import { toFriendlyError } from "@/utils/errors";

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export interface WalletApi {
  address: string | null;
  chainId: number | null;
  chain: ChainConfig | undefined;
  phase: ReturnType<typeof useWalletStore.getState>["phase"];
  error: string | null;
  isConnected: boolean;
  isDemoSession: boolean;
  hasWallet: boolean;
  isWrongNetwork: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  switchToChain: (chain: ChainConfig) => Promise<boolean>;
  enterDemo: () => void;
}

/** Wallet connection is the only authentication mechanism. No keys are ever requested. */
export const useWallet = (): WalletApi => {
  const queryClient = useQueryClient();
  const address = useWalletStore((state) => state.address);
  const chainId = useWalletStore((state) => state.chainId);
  const phase = useWalletStore((state) => state.phase);
  const error = useWalletStore((state) => state.error);
  const demoSession = useWalletStore((state) => state.demoSession);
  const setAddress = useWalletStore((state) => state.setAddress);
  const setChainId = useWalletStore((state) => state.setChainId);
  const setPhase = useWalletStore((state) => state.setPhase);
  const setError = useWalletStore((state) => state.setError);
  const startDemoSession = useWalletStore((state) => state.startDemoSession);
  const reset = useWalletStore((state) => state.reset);
  const setMode = useAppStore((state) => state.setMode);

  const hasWallet = useMemo(() => hasInjectedWallet(), []);

  const connect = useCallback(async (): Promise<boolean> => {
    if (!hasInjectedWallet()) {
      setError("No EVM wallet detected. Install a MetaMask-compatible wallet to continue.");
      setPhase("error");
      return false;
    }

    try {
      setError(null);
      setPhase("connecting");
      const accounts = await requestAccounts();
      if (accounts.length === 0) {
        setError("No account was authorized.");
        setPhase("error");
        return false;
      }
      setAddress(accounts[0]);

      setPhase("detecting_network");
      await delay(320);
      const detectedChain = await getChainId();
      setChainId(detectedChain);

      setPhase("reading_chain_a");
      await delay(360);

      setPhase("loading_protocol");
      await delay(320);

      setMode("live");
      setPhase("connected");
      return true;
    } catch (caught) {
      const friendly = toFriendlyError(caught);
      setError(`${friendly.what} ${friendly.next}`);
      setPhase("error");
      return false;
    }
  }, [setAddress, setChainId, setError, setPhase, setMode]);

  const disconnect = useCallback((): void => {
    reset();
    queryClient.clear();
  }, [reset, queryClient]);

  const switchToChain = useCallback(
    async (chain: ChainConfig): Promise<boolean> => {
      try {
        setError(null);
        await switchNetwork(chain);
        // Never assume the switch succeeded — re-read the chain id.
        await delay(400);
        const current = await getChainId();
        setChainId(current);
        return current === chain.chainId;
      } catch (caught) {
        const friendly = toFriendlyError(caught);
        setError(`${friendly.what} ${friendly.next}`);
        return false;
      }
    },
    [setChainId, setError],
  );

  const enterDemo = useCallback((): void => {
    setMode("demo");
    startDemoSession();
  }, [setMode, startDemoSession]);

  // Restore a previously authorized session and track wallet events.
  useEffect(() => {
    let cancelled = false;

    const restore = async (): Promise<void> => {
      if (!hasInjectedWallet()) return;
      if (useWalletStore.getState().demoSession) return;
      const accounts = await getAccounts();
      if (cancelled || accounts.length === 0) return;
      const current = await getChainId();
      if (cancelled) return;
      setAddress(accounts[0]);
      setChainId(current);
      setPhase("connected");
    };

    void restore();

    const unsubscribe = subscribeToWalletEvents({
      onAccountsChanged: (accounts) => {
        if (accounts.length === 0) {
          reset();
          queryClient.clear();
          return;
        }
        setAddress(accounts[0]);
        queryClient.clear();
      },
      onChainChanged: (nextChainId) => {
        setChainId(nextChainId);
        queryClient.clear();
      },
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [setAddress, setChainId, setPhase, reset, queryClient]);

  const chain = getChainById(chainId);
  const isConnected = demoSession || (address !== null && phase === "connected");
  const isWrongNetwork = !demoSession && address !== null && !isSupportedChain(chainId);

  return {
    address,
    chainId,
    chain,
    phase,
    error,
    isConnected,
    isDemoSession: demoSession,
    hasWallet,
    isWrongNetwork,
    connect,
    disconnect,
    switchToChain,
    enterDemo,
  };
};

export const REQUIRED_COLLATERAL_CHAIN = CHAIN_A;

import { create } from "zustand";

export type WalletPhase =
  | "disconnected"
  | "connecting"
  | "detecting_network"
  | "reading_chain_a"
  | "loading_protocol"
  | "connected"
  | "error";

interface WalletState {
  address: string | null;
  chainId: number | null;
  phase: WalletPhase;
  error: string | null;
  /** True when the session is a demo session rather than a real wallet connection. */
  demoSession: boolean;
  setAddress: (address: string | null) => void;
  setChainId: (chainId: number | null) => void;
  setPhase: (phase: WalletPhase) => void;
  setError: (error: string | null) => void;
  startDemoSession: () => void;
  reset: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  chainId: null,
  phase: "disconnected",
  error: null,
  demoSession: false,
  setAddress: (address) => set({ address }),
  setChainId: (chainId) => set({ chainId }),
  setPhase: (phase) => set({ phase }),
  setError: (error) => set({ error }),
  startDemoSession: () => set({ demoSession: true, phase: "connected", error: null }),
  reset: () => set({ address: null, chainId: null, phase: "disconnected", error: null, demoSession: false }),
}));

import { BrowserProvider, formatEther, type Eip1193Provider } from "ethers";

import { CHAIN_A, getChainById, type ChainConfig } from "@/config/chains";

interface InjectedProvider extends Eip1193Provider {
  isMetaMask?: boolean;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: InjectedProvider;
  }
}

export const getInjectedProvider = (): InjectedProvider | null =>
  typeof window !== "undefined" && window.ethereum ? window.ethereum : null;

export const hasInjectedWallet = (): boolean => getInjectedProvider() !== null;

export const getBrowserProvider = (): BrowserProvider | null => {
  const injected = getInjectedProvider();
  return injected ? new BrowserProvider(injected) : null;
};

/** Request accounts. Never asks for keys, seeds, or passwords. */
export const requestAccounts = async (): Promise<readonly string[]> => {
  const injected = getInjectedProvider();
  if (!injected) throw new Error("No EVM wallet detected");
  const accounts = (await injected.request({ method: "eth_requestAccounts" })) as string[];
  return accounts;
};

export const getAccounts = async (): Promise<readonly string[]> => {
  const injected = getInjectedProvider();
  if (!injected) return [];
  try {
    return (await injected.request({ method: "eth_accounts" })) as string[];
  } catch {
    return [];
  }
};

export const getChainId = async (): Promise<number | null> => {
  const injected = getInjectedProvider();
  if (!injected) return null;
  try {
    const hex = (await injected.request({ method: "eth_chainId" })) as string;
    return Number.parseInt(hex, 16);
  } catch {
    return null;
  }
};

export const getNativeBalance = async (address: string): Promise<number | null> => {
  const provider = getBrowserProvider();
  if (!provider) return null;
  try {
    const raw = await provider.getBalance(address);
    return Number.parseFloat(formatEther(raw));
  } catch {
    return null;
  }
};

/** Ask the wallet to switch networks; adds the chain when the wallet does not know it. */
export const switchNetwork = async (chain: ChainConfig): Promise<void> => {
  const injected = getInjectedProvider();
  if (!injected) throw new Error("No EVM wallet detected");

  try {
    await injected.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chain.hexChainId }] });
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code === 4902 && chain.rpcUrl) {
      await injected.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chain.hexChainId,
            chainName: chain.name,
            nativeCurrency: chain.nativeCurrency,
            rpcUrls: [chain.rpcUrl],
            blockExplorerUrls: chain.explorerUrl ? [chain.explorerUrl] : undefined,
          },
        ],
      });
      return;
    }
    throw error;
  }
};

export const subscribeToWalletEvents = (handlers: {
  onAccountsChanged: (accounts: readonly string[]) => void;
  onChainChanged: (chainId: number) => void;
}): (() => void) => {
  const injected = getInjectedProvider();
  if (!injected?.on) return () => undefined;

  const accountsHandler = (...args: unknown[]): void => handlers.onAccountsChanged((args[0] as string[]) ?? []);
  const chainHandler = (...args: unknown[]): void => {
    const hex = args[0] as string;
    handlers.onChainChanged(Number.parseInt(hex, 16));
  };

  injected.on("accountsChanged", accountsHandler);
  injected.on("chainChanged", chainHandler);

  return () => {
    injected.removeListener?.("accountsChanged", accountsHandler);
    injected.removeListener?.("chainChanged", chainHandler);
  };
};

/** Chain A is where collateral operations must happen. */
export const requiredChainFor = (operation: "collateral" | "lending"): ChainConfig =>
  operation === "collateral" ? CHAIN_A : getChainById(84532) ?? CHAIN_A;

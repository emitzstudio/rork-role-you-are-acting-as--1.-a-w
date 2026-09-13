import { env } from "./env";

export interface ChainConfig {
  /** Protocol role: chain A holds collateral, chain B verifies proofs and lends. */
  readonly role: "A" | "B";
  readonly chainId: number;
  readonly hexChainId: string;
  readonly name: string;
  readonly shortName: string;
  readonly nativeCurrency: { name: string; symbol: string; decimals: number };
  readonly explorerUrl: string;
  readonly rpcUrl: string;
  readonly purpose: string;
}

export const CHAIN_A: ChainConfig = {
  role: "A",
  chainId: 11155111,
  hexChainId: "0xaa36a7",
  name: "Ethereum Sepolia",
  shortName: "Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  explorerUrl: "https://sepolia.etherscan.io",
  rpcUrl: env.chainARpcUrl,
  purpose: "Your collateral stays here",
};

export const CHAIN_B: ChainConfig = {
  role: "B",
  chainId: 84532,
  hexChainId: "0x14a34",
  name: "Base Sepolia",
  shortName: "Base Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  explorerUrl: "https://sepolia.basescan.org",
  rpcUrl: env.chainBRpcUrl,
  purpose: "Verifies proof & issues loan",
};

export const LOCAL_CHAIN: ChainConfig = {
  role: "A",
  chainId: 31337,
  hexChainId: "0x7a69",
  name: "Hardhat Local",
  shortName: "Hardhat",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  explorerUrl: "",
  rpcUrl: "http://127.0.0.1:8545",
  purpose: "Local development network",
};

export const SUPPORTED_CHAINS: readonly ChainConfig[] = [CHAIN_A, CHAIN_B, LOCAL_CHAIN];

export const getChainById = (chainId: number | null): ChainConfig | undefined =>
  chainId === null ? undefined : SUPPORTED_CHAINS.find((chain) => chain.chainId === chainId);

export const isSupportedChain = (chainId: number | null): boolean => getChainById(chainId) !== undefined;

/** Build an explorer transaction link, or null when the chain has no explorer. */
export const explorerTxUrl = (chain: ChainConfig | undefined, hash: string | null | undefined): string | null => {
  if (!chain || !chain.explorerUrl || !hash) return null;
  return `${chain.explorerUrl}/tx/${hash}`;
};

export const explorerAddressUrl = (chain: ChainConfig | undefined, address: string | null | undefined): string | null => {
  if (!chain || !chain.explorerUrl || !address) return null;
  return `${chain.explorerUrl}/address/${address}`;
};

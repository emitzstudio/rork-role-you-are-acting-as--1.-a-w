/**
 * Runtime configuration read from Vite env vars.
 * Never place deployment addresses or endpoints directly in components.
 */

const read = (key: string): string | undefined => {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  return value && value.length > 0 ? value : undefined;
};

export const env = {
  /** Backend REST API base URL (Node.js relayer service). */
  apiBaseUrl: read("VITE_OMNIVAULT_API_URL") ?? "",
  /** Chain A JSON-RPC endpoint (read-only fallback when no wallet is present). */
  chainARpcUrl: read("VITE_CHAIN_A_RPC_URL") ?? "",
  /** Chain B JSON-RPC endpoint. */
  chainBRpcUrl: read("VITE_CHAIN_B_RPC_URL") ?? "",
  /** Deployed CollateralVault address on Chain A. */
  collateralVaultAddress: read("VITE_COLLATERAL_VAULT_ADDRESS") ?? "",
  /** Deployed AttestationVerifier address on Chain B. */
  attestationVerifierAddress: read("VITE_ATTESTATION_VERIFIER_ADDRESS") ?? "",
  /** Deployed CrossChainLending address on Chain B. */
  crossChainLendingAddress: read("VITE_CROSS_CHAIN_LENDING_ADDRESS") ?? "",
  /** Build/release identifier surfaced in Settings → About. */
  appVersion: read("VITE_APP_VERSION") ?? "0.1.0",
  environment: read("VITE_APP_ENV") ?? (import.meta.env.DEV ? "development" : "production"),
  docsUrl: read("VITE_DOCS_URL") ?? "",
  repositoryUrl: read("VITE_REPOSITORY_URL") ?? "",
} as const;

/** True when the frontend has enough configuration to talk to the real protocol. */
export const isBackendConfigured = (): boolean => env.apiBaseUrl.length > 0;

export const isChainAConfigured = (): boolean => env.collateralVaultAddress.length > 0;

export const isChainBConfigured = (): boolean =>
  env.attestationVerifierAddress.length > 0 && env.crossChainLendingAddress.length > 0;

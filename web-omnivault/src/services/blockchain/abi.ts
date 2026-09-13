/** Minimal human-readable ABI fragments for the existing deployed contracts. */

export const COLLATERAL_VAULT_ABI = [
  "function getCollateralIds(address owner) view returns (uint256[])",
  "function getCollateral(uint256 collateralId) view returns (address owner, address asset, uint256 amount, uint256 stateVersion, uint8 status)",
  "function lock(uint256 amount) payable returns (uint256 collateralId)",
  "function unlock(uint256 collateralId)",
  "event CollateralLocked(uint256 indexed collateralId, address indexed owner, uint256 amount)",
  "event CollateralUnlocked(uint256 indexed collateralId, address indexed owner)",
] as const;

export const CROSS_CHAIN_LENDING_ABI = [
  "function getLoanIds(address borrower) view returns (uint256[])",
  "function getLoan(uint256 loanId) view returns (address borrower, uint256 collateralId, uint256 principal, uint256 outstanding, uint8 status)",
  "function maxLtvBps() view returns (uint256)",
  "function repay(uint256 loanId) payable",
  "event LoanIssued(uint256 indexed loanId, address indexed borrower, uint256 principal)",
  "event LoanRepaid(uint256 indexed loanId, address indexed borrower)",
] as const;

export const ATTESTATION_VERIFIER_ABI = [
  "function isConsumed(bytes32 nonce) view returns (bool)",
  "function trustedSigner() view returns (address)",
  "function sourceChainId() view returns (uint256)",
  "function sourceVault() view returns (address)",
] as const;

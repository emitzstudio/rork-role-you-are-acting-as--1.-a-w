import type { AttackScenario, AttackScenarioId } from "@/types/protocol";

/**
 * The nine protection scenarios enforced by the protocol contracts.
 * Reason codes mirror the custom errors raised by AttestationVerifier / CrossChainLending.
 */
export const ATTACK_SCENARIOS: readonly AttackScenario[] = [
  {
    id: "double_pledge",
    title: "Double Pledge",
    description: "Prevents the same collateral from being used twice.",
    protection: "The lending contract marks collateral as pledged and refuses a second loan against it.",
    reasonCode: "CollateralAlreadyPledged",
    checks: [
      "Loading collateral record...",
      "Checking pledge status on Chain B...",
      "Collateral already backing an active loan",
    ],
  },
  {
    id: "replay_attack",
    title: "Replay Attack",
    description: "Blocks reuse of consumed attestations.",
    protection: "Each attestation nonce is recorded on consumption and can never be presented again.",
    reasonCode: "AttestationAlreadyConsumed",
    checks: [
      "Loading previous attestation...",
      "Checking signature...",
      "Checking consumed status...",
      "Attestation already consumed",
    ],
  },
  {
    id: "stale_proof",
    title: "Stale Proof",
    description: "Rejects expired or outdated attestations.",
    protection: "Chain B compares the attested state version against the latest known version and enforces expiry.",
    reasonCode: "StaleStateVersion",
    checks: [
      "Loading attestation...",
      "Checking expiry window...",
      "Comparing state version...",
      "Attested state version is behind current state",
    ],
  },
  {
    id: "fake_signer",
    title: "Fake Signer",
    description: "Validates signatures against authorized signers only.",
    protection: "Only the registered relayer key can produce a valid EIP-712 signature for the verifier.",
    reasonCode: "InvalidSigner",
    checks: [
      "Recovering EIP-712 signer...",
      "Comparing against authorized relayer...",
      "Recovered signer is not authorized",
    ],
  },
  {
    id: "wrong_chain",
    title: "Wrong Chain",
    description: "Ensures proofs are from the correct source chain.",
    protection: "The attestation binds the source chain ID; a mismatch is rejected before any lending logic runs.",
    reasonCode: "InvalidSourceChain",
    checks: ["Reading attested source chain...", "Comparing with configured Chain A...", "Source chain ID mismatch"],
  },
  {
    id: "wrong_vault",
    title: "Wrong Vault",
    description: "Verifies the proof matches the intended vault.",
    protection: "The verifier only trusts attestations referencing the registered CollateralVault address.",
    reasonCode: "InvalidSourceVault",
    checks: ["Reading attested source vault...", "Comparing with registered vault...", "Source vault is not registered"],
  },
  {
    id: "tampered_amount",
    title: "Tampered Amount",
    description: "Detects any modification to collateral amounts.",
    protection: "Amount is part of the signed typed data — editing it invalidates the signature entirely.",
    reasonCode: "InvalidSigner",
    checks: [
      "Rebuilding EIP-712 digest...",
      "Recovering signer from tampered payload...",
      "Digest mismatch — signature no longer recovers a trusted signer",
    ],
  },
  {
    id: "unauthorized_borrower",
    title: "Unauthorized Borrower",
    description: "Blocks unapproved borrowers from accessing loans.",
    protection: "The borrower address must equal the collateral owner encoded in the attestation.",
    reasonCode: "UnauthorizedBorrower",
    checks: ["Reading attested owner...", "Comparing with transaction sender...", "Sender is not the collateral owner"],
  },
  {
    id: "early_liquidation",
    title: "Early Liquidation",
    description: "Protects healthy loans from premature liquidation.",
    protection: "Liquidation reverts while the loan's health factor stays above the liquidation threshold.",
    reasonCode: "HealthyLoan",
    checks: [
      "Loading loan position...",
      "Computing health factor...",
      "Health factor above liquidation threshold — loan is healthy",
    ],
  },
];

export const getScenario = (id: AttackScenarioId): AttackScenario =>
  ATTACK_SCENARIOS.find((scenario) => scenario.id === id) ?? ATTACK_SCENARIOS[0];

export const REJECTION_EXPLANATION: Record<AttackScenarioId, string> = {
  double_pledge: "The collateral is already backing an active loan and cannot be pledged again.",
  replay_attack: "The attestation has already been used and cannot be replayed.",
  stale_proof: "The attestation references an outdated collateral state version.",
  fake_signer: "The signature did not recover an authorized relayer signer.",
  wrong_chain: "The proof did not originate from the configured collateral chain.",
  wrong_vault: "The proof references a vault the verifier does not trust.",
  tampered_amount: "Any field modification invalidates the EIP-712 signature.",
  unauthorized_borrower: "Only the collateral owner encoded in the attestation may borrow.",
  early_liquidation: "The loan's health factor is above the liquidation threshold.",
};

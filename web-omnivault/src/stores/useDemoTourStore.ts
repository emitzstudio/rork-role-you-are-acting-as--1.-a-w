import { create } from "zustand";

export type DemoTourStep =
  | "idle"
  | "collateral_appears"
  | "collateral_locks"
  | "attestation_forms"
  | "proof_travels"
  | "chain_b_verifies"
  | "loan_appears"
  | "security_opens"
  | "attack_selected"
  | "attack_runs"
  | "attack_rejected"
  | "proof_explorer"
  | "complete";

export const DEMO_TOUR_SEQUENCE: readonly DemoTourStep[] = [
  "collateral_appears",
  "collateral_locks",
  "attestation_forms",
  "proof_travels",
  "chain_b_verifies",
  "loan_appears",
  "security_opens",
  "attack_selected",
  "attack_runs",
  "attack_rejected",
  "proof_explorer",
  "complete",
];

export const DEMO_TOUR_LABELS: Record<DemoTourStep, string> = {
  idle: "Ready",
  collateral_appears: "Collateral appears on Chain A",
  collateral_locks: "Collateral locks",
  attestation_forms: "EIP-712 attestation forms",
  proof_travels: "Proof travels to Chain B",
  chain_b_verifies: "Chain B verifies the proof",
  loan_appears: "Loan issued on Chain B",
  security_opens: "Opening Security Center",
  attack_selected: "Replay attack selected",
  attack_runs: "Running attack simulation",
  attack_rejected: "Attack rejected",
  proof_explorer: "Opening Proof Explorer",
  complete: "Demo complete",
};

interface DemoTourState {
  running: boolean;
  paused: boolean;
  step: DemoTourStep;
  start: () => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  skip: () => void;
  stop: () => void;
  setStep: (step: DemoTourStep) => void;
}

export const useDemoTourStore = create<DemoTourState>((set, get) => ({
  running: false,
  paused: false,
  step: "idle",
  start: () => set({ running: true, paused: false, step: DEMO_TOUR_SEQUENCE[0] }),
  pause: () => set({ paused: true }),
  resume: () => set({ paused: false }),
  next: () => {
    const { step } = get();
    const index = DEMO_TOUR_SEQUENCE.indexOf(step);
    const nextStep = DEMO_TOUR_SEQUENCE[index + 1];
    if (!nextStep) {
      set({ running: false, step: "complete" });
      return;
    }
    set({ step: nextStep, running: nextStep !== "complete" });
  },
  skip: () => set({ running: false, paused: false, step: "complete" }),
  stop: () => set({ running: false, paused: false, step: "idle" }),
  setStep: (step) => set({ step }),
}));

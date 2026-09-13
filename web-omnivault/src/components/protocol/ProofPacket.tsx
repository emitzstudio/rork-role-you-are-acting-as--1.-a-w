import { motion } from "framer-motion";
import { CheckCircle2, FileSignature, Loader2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import type { Attestation, FlowState } from "@/types/protocol";
import { shortAddress } from "@/utils/format";

interface ProofPacketProps {
  attestation: Attestation | null;
  state: FlowState;
  className?: string;
  compact?: boolean;
}

const FORMING_STATES: readonly FlowState[] = ["attestation_creating"];
const VERIFIED_STATES: readonly FlowState[] = ["verified", "loan_issued", "loan_repaid", "collateral_unlocked"];

/**
 * The floating EIP-712 attestation packet. This is the object that MOVES —
 * it carries proof of the collateral's state, never the collateral itself.
 */
export const ProofPacket = ({ attestation, state, className, compact = false }: ProofPacketProps) => {
  const reduced = useAppStore((store) => store.motion) === "reduced";

  const forming = FORMING_STATES.includes(state);
  const failed = state === "failed";
  const verified = VERIFIED_STATES.includes(state);
  const inTransit = state === "proof_moving" || state === "verifying";
  const hasPacket = attestation !== null || forming;

  const tone = failed ? "danger" : verified ? "success" : inTransit ? "cyan" : forming ? "violet" : "idle";

  const toneRing = {
    danger: "border-destructive/50 glow-red",
    success: "border-success/45 glow-emerald",
    cyan: "border-accent/50 glow-cyan",
    violet: "border-violet/50 glow-violet",
    idle: "border-border/70",
  }[tone];

  const statusLabel = failed
    ? "REJECTED"
    : verified
      ? "SIGNED · VERIFIED"
      : inTransit
        ? "SIGNED · IN TRANSIT"
        : forming
          ? "SIGNING…"
          : attestation
            ? "SIGNED · VERIFIABLE"
            : "AWAITING STATE";

  const StatusIcon = failed ? XCircle : verified ? CheckCircle2 : forming || inTransit ? Loader2 : FileSignature;

  return (
    <motion.article
      className={cn(
        "panel relative overflow-hidden border bg-background/70",
        toneRing,
        !reduced && hasPacket && "animate-drift",
        className,
      )}
      initial={reduced ? false : { opacity: 0, scale: 0.94 }}
      animate={{ opacity: hasPacket ? 1 : 0.55, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      aria-label="EIP-712 attestation"
    >
      <div className="pointer-events-none absolute inset-0 scanline opacity-60" aria-hidden />
      {forming && !reduced ? (
        <motion.div
          className="pointer-events-none absolute inset-x-0 h-px bg-violet/70"
          animate={{ top: ["0%", "100%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          aria-hidden
        />
      ) : null}

      <header className="relative flex items-center gap-2.5 px-4 pt-4">
        <div
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg border",
            failed
              ? "border-destructive/35 bg-destructive/10 text-destructive"
              : verified
                ? "border-success/35 bg-success/10 text-success"
                : "border-violet/35 bg-violet/10 text-violet",
          )}
        >
          <StatusIcon className={cn("size-4", (forming || inTransit) && "animate-spin")} aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="display text-[13px] font-bold uppercase tracking-wide">EIP-712 Attestation</p>
          <p
            className={cn(
              "label-tech mt-0.5",
              failed ? "text-destructive/85" : verified ? "text-success/85" : "text-violet/85",
            )}
          >
            {statusLabel}
          </p>
        </div>
      </header>

      <dl className="relative mt-3 space-y-[3px] px-4 pb-4">
        {attestation ? (
          <>
            <PacketRow label="State Version" value={String(attestation.stateVersion)} />
            <PacketRow label="Nonce" value={shortAddress(attestation.nonce, 8, 4)} />
            <PacketRow label="Signer" value={shortAddress(attestation.signer, 6, 4)} />
            {!compact ? <PacketRow label="Signature" value={shortAddress(attestation.signature, 8, 4)} /> : null}
          </>
        ) : (
          <>
            <PacketRow label="State Version" value={forming ? "…" : "—"} muted />
            <PacketRow label="Nonce" value={forming ? "…" : "—"} muted />
            <PacketRow label="Signer" value={forming ? "…" : "—"} muted />
            {!compact ? <PacketRow label="Signature" value={forming ? "…" : "—"} muted /> : null}
          </>
        )}
      </dl>
    </motion.article>
  );
};

const PacketRow = ({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) => (
  <div className="flex items-baseline justify-between gap-3">
    <dt className="mono text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</dt>
    <dd className={cn("mono truncate text-[11px]", muted ? "text-muted-foreground/60" : "text-foreground/90")}>
      {value}
    </dd>
  </div>
);

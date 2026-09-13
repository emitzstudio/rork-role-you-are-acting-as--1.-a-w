import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  FileCheck2,
  FlaskConical,
  Link2,
  PlayCircle,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Metric } from "@/components/common/DataField";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingPanel } from "@/components/common/Skeletons";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CrossChainFlow } from "@/components/protocol/CrossChainFlow";
import { LoanLifecycle } from "@/components/protocol/LoanLifecycle";
import { SecurityMatrix } from "@/components/security/SecurityMatrix";
import { Button } from "@/components/ui/button";
import { buildLifecycle, useFlowSnapshot } from "@/hooks/useFlowState";
import {
  useCollateralPositions,
  useLoans,
  usePortfolioSummary,
  useProofs,
  useProtocolVerification,
} from "@/hooks/useProtocolData";
import { cn } from "@/lib/utils";
import { ATTACK_SCENARIOS } from "@/services/mock/attackScenarios";
import { useAppStore } from "@/stores/useAppStore";
import {
  formatDateTime,
  formatHealthFactor,
  formatUsd,
  healthTone,
  shortAddress,
} from "@/utils/format";

const Overview = () => {
  const navigate = useNavigate();
  const mode = useAppStore((state) => state.mode);

  const positionsQuery = useCollateralPositions();
  const proofsQuery = useProofs();
  const loansQuery = useLoans();
  const { data: verification } = useProtocolVerification();
  const summary = usePortfolioSummary();

  const snapshot = useFlowSnapshot(positionsQuery.data, proofsQuery.data, loansQuery.data);
  const lifecycle = buildLifecycle(snapshot);

  const latestProof = (proofsQuery.data ?? [])[0] ?? null;
  const isLoading = positionsQuery.isLoading || loansQuery.isLoading || proofsQuery.isLoading;
  const error = positionsQuery.error ?? loansQuery.error ?? proofsQuery.error;

  const hf = summary.healthFactor;
  const hfTone = healthTone(hf);

  return (
    <div className="space-y-6">
      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl">
        <div className="relative grid gap-8 py-4 lg:grid-cols-[1.55fr_1fr] lg:items-start lg:gap-12 lg:py-6">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="label-tech text-primary/85"
            >
              Cross-Chain Lending
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="display mt-3 text-4xl font-black leading-[0.98] tracking-[-0.035em] sm:text-5xl xl:text-[3.5rem]"
            >
              <span className="block">Collateral doesn&apos;t move.</span>
              <span className="mt-1 block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Trust does.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground"
            >
              Unlock liquidity across chains without moving your assets. Lock on one chain, borrow on another —
              powered by cryptographic attestations.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-7 flex flex-wrap items-center gap-3"
            >
              <Button onClick={() => navigate("/borrow")} className="h-11 gap-2 px-5 font-semibold">
                Start Borrowing
                <ArrowRight className="size-4" aria-hidden />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/docs")}
                className="h-11 gap-2 border-border/70 bg-card/40 px-5 font-semibold hover:border-primary/40"
              >
                <PlayCircle className="size-4" aria-hidden />
                How it works
              </Button>
            </motion.div>
          </div>

          <motion.aside
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="relative lg:border-l lg:border-border/60 lg:pl-10 lg:pt-2"
          >
            <p className="display text-[13px] font-bold uppercase leading-snug tracking-[0.08em]">
              Same assets.
              <br />
              More possibilities.
            </p>
            <p className="mt-3 max-w-sm text-[13.5px] leading-relaxed text-muted-foreground">
              Your collateral stays secure on one chain while cryptographic proofs unlock liquidity across
              ecosystems. No bridges, no wrapped assets, no custody transfer.
            </p>
          </motion.aside>
        </div>
      </section>

      {/* ── SIGNATURE CROSS-CHAIN VISUAL ─────────────────────────── */}
      {error ? (
        <ErrorState error={error} onRetry={() => void positionsQuery.refetch()} />
      ) : isLoading ? (
        <LoadingPanel message="Reading Chain A · Loading protocol state" rows={4} />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <CrossChainFlow
            state={snapshot.state}
            position={snapshot.position}
            attestation={snapshot.attestation}
            loan={snapshot.loan}
            availableToBorrow={summary.borrowingPowerUsd}
          />
        </motion.div>
      )}

      {/* ── POSITION · PROOF · SECURITY ──────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Your position */}
        <section className="panel panel-hover p-5">
          <header className="flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" aria-hidden />
            <h2 className="label-tech text-foreground/85">Your Position</h2>
          </header>

          {summary.isLoading ? (
            <div className="mt-6 space-y-3">
              <div className="shimmer h-8 w-32 rounded-md bg-muted/40" />
              <div className="shimmer h-3 w-full rounded-md bg-muted/40" />
            </div>
          ) : !summary.hasAnyCollateral ? (
            <div className="mt-6">
              <p className="display text-sm font-bold uppercase tracking-wide text-muted-foreground">
                No eligible collateral
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                Lock collateral on Chain A to begin borrowing.
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate("/vault")} className="mt-4 gap-2">
                Go to Vault
                <ArrowRight className="size-3.5" aria-hidden />
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-2 gap-5">
                <Metric
                  label="Collateral Value"
                  value={formatUsd(summary.totalCollateralUsd)}
                  size="md"
                  sub={`${summary.lockedCount + summary.pledgedCount} position${summary.lockedCount + summary.pledgedCount === 1 ? "" : "s"}`}
                />
                <Metric
                  label="Borrowing Power"
                  value={formatUsd(summary.borrowingPowerUsd)}
                  size="md"
                  tone="accent"
                  sub={summary.totalDebt > 0 ? `${formatUsd(summary.totalDebt)} borrowed` : "Nothing borrowed"}
                />
              </div>
              <div className="mt-5 flex items-end justify-between border-t border-border/50 pt-4">
                <Metric
                  label="Health Factor"
                  value={formatHealthFactor(hf)}
                  size="sm"
                  tone={hfTone === "muted" ? "default" : hfTone === "destructive" ? "danger" : hfTone}
                />
                {hf !== null ? (
                  <StatusBadge
                    tone={hfTone === "success" ? "success" : hfTone === "warning" ? "warning" : "danger"}
                    label={hfTone === "success" ? "Healthy" : hfTone === "warning" ? "Watch" : "At risk"}
                  />
                ) : (
                  <span className="text-[11.5px] text-muted-foreground">No active debt</span>
                )}
              </div>
            </>
          )}
        </section>

        {/* Latest proof */}
        <section className="panel panel-hover p-5">
          <header className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileCheck2 className="size-4 text-violet" aria-hidden />
              <h2 className="label-tech text-foreground/85">Latest Proof</h2>
            </div>
            {latestProof ? (
              <StatusBadge
                tone={
                  latestProof.status === "verified" || latestProof.status === "consumed"
                    ? "success"
                    : latestProof.status === "failed"
                      ? "danger"
                      : "warning"
                }
                label={latestProof.status === "consumed" ? "Verified" : latestProof.status}
                className="capitalize"
              />
            ) : null}
          </header>

          {proofsQuery.isLoading ? (
            <div className="mt-6 space-y-3">
              <div className="shimmer h-3 w-full rounded-md bg-muted/40" />
              <div className="shimmer h-3 w-4/5 rounded-md bg-muted/40" />
            </div>
          ) : !latestProof ? (
            <div className="mt-6">
              <p className="display text-sm font-bold uppercase tracking-wide text-muted-foreground">
                No attestations yet
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                Attestations are created when you borrow against locked collateral.
              </p>
            </div>
          ) : (
            <>
              <dl className="mt-4 space-y-2">
                <ProofRow label="Proof ID" value={`#${latestProof.id}`} />
                <ProofRow label="State Version" value={String(latestProof.stateVersion)} />
                <ProofRow label="Created" value={formatDateTime(latestProof.createdAt)} />
                <ProofRow label="Signer" value={shortAddress(latestProof.signer, 6, 4)} />
              </dl>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/proofs/${latestProof.id}`)}
                className="mt-5 w-full gap-2"
              >
                View Proof
                <ArrowRight className="size-3.5" aria-hidden />
              </Button>
            </>
          )}
        </section>

        {/* Security */}
        <section className="panel panel-hover p-5">
          <header className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-success" aria-hidden />
              <h2 className="label-tech text-foreground/85">Security</h2>
            </div>
            <span className="mono text-[11px] font-semibold text-success">
              {ATTACK_SCENARIOS.length}/{ATTACK_SCENARIOS.length}
            </span>
          </header>

          <SecurityMatrix compact className="mt-4" />

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/security")}
            className="mt-4 w-full gap-2"
          >
            Run attack simulation
            <ArrowRight className="size-3.5" aria-hidden />
          </Button>
        </section>
      </div>

      {/* ── LOAN LIFECYCLE ───────────────────────────────────────── */}
      <section className="panel p-5 lg:p-6">
        <header className="mb-6 flex items-center justify-between gap-3">
          <h2 className="label-tech text-foreground/85">Loan Lifecycle</h2>
          <p className="hidden text-[11.5px] text-muted-foreground sm:block">
            Only stages that actually occurred are illuminated
          </p>
        </header>
        <div className="overflow-x-auto pb-1">
          <LoanLifecycle stages={lifecycle} className="min-w-[520px]" />
        </div>
      </section>

      {/* ── PROTOCOL VERIFICATION ────────────────────────────────── */}
      <section>
        <p className="label-tech mb-3">Protocol Verification</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <VerificationTile
            icon={FlaskConical}
            value={verification ? `${verification.passingTests}/${verification.totalTests}` : "—"}
            label="Automated Tests"
            detail={
              verification
                ? `${verification.blockchainTests} blockchain · ${verification.backendTests} backend`
                : undefined
            }
            tone="primary"
          />
          <VerificationTile
            icon={Link2}
            value={verification ? String(verification.chains) : "—"}
            label="Chains Integrated"
            detail="Ethereum Sepolia · Base Sepolia"
            tone="accent"
          />
          <VerificationTile
            icon={ShieldCheck}
            value={verification ? String(verification.attackScenarios) : "—"}
            label="Attack Scenarios Covered"
            detail="All rejected by the protocol"
            tone="success"
            onClick={() => navigate("/security")}
          />
          <VerificationTile
            icon={Zap}
            value={verification ? `<${verification.endToEndSeconds}s` : "—"}
            label="End-to-End Flow"
            detail="Lock → attest → verify → borrow"
            tone="violet"
          />
        </div>
        <p className="mt-3 text-[11.5px] text-muted-foreground/75">
          These are implementation verification metrics for the OmniVault protocol, not your account activity.
        </p>
      </section>
    </div>
  );
};

const ProofRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3">
    <dt className="text-[12.5px] text-muted-foreground">{label}</dt>
    <dd className="mono truncate text-[11.5px] text-foreground/90">{value}</dd>
  </div>
);

const TONE_MAP = {
  primary: { icon: "text-primary", border: "hover:border-primary/40", glow: "bg-primary/10" },
  accent: { icon: "text-accent", border: "hover:border-accent/40", glow: "bg-accent/10" },
  success: { icon: "text-success", border: "hover:border-success/40", glow: "bg-success/10" },
  violet: { icon: "text-violet", border: "hover:border-violet/40", glow: "bg-violet/10" },
} as const;

interface VerificationTileProps {
  icon: typeof Zap;
  value: string;
  label: string;
  detail?: string;
  tone: keyof typeof TONE_MAP;
  onClick?: () => void;
}

const VerificationTile = ({ icon: Icon, value, label, detail, tone, onClick }: VerificationTileProps) => {
  const styles = TONE_MAP[tone];
  const Component = onClick ? "button" : "div";

  return (
    <Component
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "panel panel-hover group flex items-center gap-3.5 p-4 text-left transition-all",
        styles.border,
        onClick && "cursor-pointer",
      )}
    >
      <div className={cn("grid size-10 shrink-0 place-items-center rounded-lg", styles.glow)}>
        <Icon className={cn("size-[18px]", styles.icon)} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="display text-xl font-extrabold leading-none num tracking-tight">{value}</p>
        <p className="mt-1.5 truncate text-[12px] text-muted-foreground">{label}</p>
        {detail ? <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground/60">{detail}</p> : null}
      </div>
      {onClick ? (
        <ArrowUpRight
          className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-foreground"
          aria-hidden
        />
      ) : null}
    </Component>
  );
};

export default Overview;

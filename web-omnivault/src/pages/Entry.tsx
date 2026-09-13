import { motion } from "framer-motion";
import { ArrowRight, PlayCircle, ShieldCheck, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BrandMark } from "@/components/layout/BrandMark";
import { WalletModal } from "@/components/wallet/WalletModal";
import { Button } from "@/components/ui/button";
import { CHAIN_A, CHAIN_B } from "@/config/chains";
import { useWallet } from "@/hooks/useWallet";
import { useAppStore } from "@/stores/useAppStore";

interface Particle {
  readonly left: number;
  readonly top: number;
  readonly size: number;
  readonly delay: number;
  readonly duration: number;
  readonly opacity: number;
}

/**
 * Cinematic entry. Wallet connection is the authentication mechanism —
 * there is no email/password path anywhere in OmniVault.
 */
const Entry = () => {
  const navigate = useNavigate();
  const { isConnected, enterDemo } = useWallet();
  const reduced = useAppStore((state) => state.motion) === "reduced";
  const [walletOpen, setWalletOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isConnected) navigate("/overview", { replace: true });
  }, [isConnected, navigate]);

  const particles = useMemo<readonly Particle[]>(
    () =>
      Array.from({ length: 26 }, (_, index) => ({
        left: (index * 37.7) % 100,
        top: (index * 61.3) % 100,
        size: index % 5 === 0 ? 2.5 : 1.5,
        delay: (index % 9) * 0.7,
        duration: 7 + (index % 6),
        opacity: index % 4 === 0 ? 0.5 : 0.25,
      })),
    [],
  );

  const handleDemo = useCallback((): void => {
    enterDemo();
    navigate("/overview");
  }, [enterDemo, navigate]);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      {/* ── atmosphere ───────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 grid-field opacity-[0.35]" />

        {/* horizon glow */}
        <div className="absolute left-1/2 top-[38%] h-[560px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-primary/[0.09] blur-[130px]" />
        <div className="absolute left-[18%] top-[62%] h-[380px] w-[520px] rounded-[50%] bg-accent/[0.06] blur-[120px]" />
        <div className="absolute right-[12%] top-[30%] h-[340px] w-[420px] rounded-[50%] bg-violet/[0.05] blur-[120px]" />

        {/* distant floating chain environments */}
        <div className="absolute inset-x-0 bottom-0 h-[46vh]">
          <svg viewBox="0 0 1440 420" preserveAspectRatio="none" className="size-full">
            <defs>
              <linearGradient id="ridge-far" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(217 60% 40%)" stopOpacity="0.18" />
                <stop offset="100%" stopColor="hsl(225 44% 4%)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="ridge-near" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(220 50% 22%)" stopOpacity="0.6" />
                <stop offset="100%" stopColor="hsl(225 44% 4%)" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <path d="M0 300 L180 180 L330 268 L470 140 L640 280 L800 190 L960 300 L1130 200 L1290 290 L1440 210 L1440 420 L0 420Z" fill="url(#ridge-far)" />
            <path d="M0 360 L150 268 L300 340 L460 250 L620 350 L780 272 L940 356 L1100 280 L1280 350 L1440 300 L1440 420 L0 420Z" fill="url(#ridge-near)" />
          </svg>
        </div>

        {/* particles */}
        {!reduced
          ? particles.map((particle, index) => (
              <motion.span
                key={index}
                className="absolute rounded-full bg-cyan-200/70"
                style={{
                  left: `${particle.left}%`,
                  top: `${particle.top}%`,
                  width: particle.size,
                  height: particle.size,
                }}
                animate={{ y: [0, -28, 0], opacity: [0, particle.opacity, 0] }}
                transition={{ duration: particle.duration, repeat: Infinity, delay: particle.delay, ease: "easeInOut" }}
              />
            ))
          : null}
      </div>

      {/* ── content ──────────────────────────────────────────────── */}
      <div className="relative mx-auto flex min-h-dvh max-w-[1280px] flex-col px-6 py-8 lg:px-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark className="size-9" />
            <span className="display text-[18px] font-extrabold tracking-tight">OmniVault</span>
          </div>
          <p className="mono hidden text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:block">
            Secure · Verifiable · No Bridges
          </p>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center py-14 text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mono mb-7 rounded-full border border-primary/25 bg-primary/[0.06] px-4 py-1.5 text-[10.5px] uppercase tracking-[0.24em] text-primary/90"
          >
            Cross-Chain Lending Protocol
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="display text-[13vw] font-black leading-[0.94] tracking-[-0.04em] sm:text-6xl lg:text-[5.25rem]"
          >
            <span className="block">Collateral doesn&apos;t move.</span>
            <span className="mt-1 block bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              Trust does.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="mt-7 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base"
          >
            Borrow across chains without moving your collateral. Your asset stays locked on{" "}
            {CHAIN_A.name}, while a signed EIP-712 attestation unlocks liquidity on {CHAIN_B.name}.
          </motion.p>

          {/* the protocol law, stated as three beats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-9 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-3"
          >
            {["Asset stays", "Proof moves", "Loan happens"].map((beat, index) => (
              <div key={beat} className="flex items-center gap-2.5">
                {index > 0 ? <ArrowRight className="size-3.5 text-muted-foreground/50" aria-hidden /> : null}
                <span className="rounded-full border border-border/70 bg-card/40 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80 backdrop-blur-sm">
                  {beat}
                </span>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mt-11 flex flex-col items-center gap-3 sm:flex-row"
          >
            <Button size="lg" onClick={() => setWalletOpen(true)} className="h-12 min-w-[190px] gap-2 text-[14px] font-semibold">
              <Wallet className="size-4" aria-hidden />
              Connect Wallet
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleDemo}
              className="h-12 min-w-[190px] gap-2 border-border/70 bg-card/40 text-[14px] font-semibold backdrop-blur-sm hover:border-primary/45"
            >
              <PlayCircle className="size-4" aria-hidden />
              Explore Demo
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="mt-5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground"
          >
            <ShieldCheck className="size-3.5 text-success" aria-hidden />
            Wallet authentication — no keys or seed phrases are ever requested
          </motion.p>
        </main>

        <footer className="flex flex-col items-center gap-3 border-t border-border/50 pt-6 sm:flex-row sm:justify-between">
          <p className="mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground/70">
            Chain A · {CHAIN_A.name} &nbsp;→&nbsp; Chain B · {CHAIN_B.name}
          </p>
          <p className="text-[11.5px] text-muted-foreground/70">Secure. Verifiable. No bridges.</p>
        </footer>
      </div>

      <WalletModal open={walletOpen} onOpenChange={setWalletOpen} onConnected={() => navigate("/overview")} />
    </div>
  );
};

export default Entry;

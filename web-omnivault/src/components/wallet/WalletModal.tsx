import { motion } from "framer-motion";
import { CheckCircle2, Download, Loader2, ShieldCheck, Wallet, XCircle } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWallet } from "@/hooks/useWallet";
import { cn } from "@/lib/utils";
import type { WalletPhase } from "@/stores/useWalletStore";

interface WalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}

const CONNECT_STEPS: readonly { phase: WalletPhase; label: string }[] = [
  { phase: "connecting", label: "Connecting wallet" },
  { phase: "detecting_network", label: "Detecting network" },
  { phase: "reading_chain_a", label: "Reading Chain A" },
  { phase: "loading_protocol", label: "Loading protocol state" },
];

const PHASE_ORDER: readonly WalletPhase[] = [
  "disconnected",
  "connecting",
  "detecting_network",
  "reading_chain_a",
  "loading_protocol",
  "connected",
];

export const WalletModal = ({ open, onOpenChange, onConnected }: WalletModalProps) => {
  const { connect, phase, error, hasWallet, isConnected } = useWallet();

  useEffect(() => {
    if (open && isConnected) onConnected();
  }, [open, isConnected, onConnected]);

  const currentIndex = PHASE_ORDER.indexOf(phase);
  const isConnecting = currentIndex > 0 && phase !== "connected" && phase !== "error";

  const handleConnect = async (): Promise<void> => {
    const ok = await connect();
    if (ok) onConnected();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] border-border/70 bg-popover/95 backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle className="display text-lg font-bold tracking-tight">Connect wallet</DialogTitle>
          <DialogDescription className="text-[13px]">
            Wallet connection is how you sign in. OmniVault never asks for a private key, seed phrase, or password.
          </DialogDescription>
        </DialogHeader>

        {!hasWallet ? (
          <div className="rounded-xl border border-warning/35 bg-warning/[0.06] p-4">
            <p className="text-[13px] font-semibold text-warning">No EVM wallet detected</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              Install a MetaMask-compatible browser wallet, then reload this page to connect.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3 gap-2">
              <a href="https://metamask.io/download/" target="_blank" rel="noreferrer noopener">
                <Download className="size-3.5" aria-hidden />
                Get a wallet
              </a>
            </Button>
          </div>
        ) : isConnecting ? (
          <ol className="space-y-1 py-1" aria-live="polite">
            {CONNECT_STEPS.map((step) => {
              const stepIndex = PHASE_ORDER.indexOf(step.phase);
              const done = currentIndex > stepIndex;
              const active = currentIndex === stepIndex;
              return (
                <li
                  key={step.phase}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors",
                    active && "bg-primary/[0.08]",
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                  ) : active ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
                  ) : (
                    <span className="size-4 shrink-0 rounded-full border border-border" aria-hidden />
                  )}
                  <span
                    className={cn(
                      "text-[13px]",
                      done ? "text-muted-foreground" : active ? "font-medium text-foreground" : "text-muted-foreground/60",
                    )}
                  >
                    {step.label}
                    {active ? "…" : ""}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <>
            <motion.button
              type="button"
              onClick={handleConnect}
              whileTap={{ scale: 0.985 }}
              className="flex w-full items-center gap-3 rounded-xl border border-border/70 bg-card/50 p-4 text-left transition-colors hover:border-primary/45 hover:bg-primary/[0.06]"
            >
              <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10">
                <Wallet className="size-5 text-primary" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold">Browser wallet</p>
                <p className="text-[12px] text-muted-foreground">MetaMask & compatible injected wallets</p>
              </div>
            </motion.button>

            {phase === "error" && error ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/[0.06] p-3">
                <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                <p className="text-[12.5px] leading-relaxed text-foreground/85">{error}</p>
              </div>
            ) : null}
          </>
        )}

        <div className="flex items-start gap-2 border-t border-border/60 pt-4">
          <ShieldCheck className="mt-px size-3.5 shrink-0 text-success" aria-hidden />
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            OmniVault only requests your public address and network. Signing requests are always shown in your wallet
            before anything is submitted on-chain.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

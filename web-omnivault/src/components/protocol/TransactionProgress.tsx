import { motion } from "framer-motion";
import { CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react";

import { CopyButton } from "@/components/common/CopyButton";
import { TX_PHASE_LABEL } from "@/hooks/useTransaction";
import { explorerTxUrl, getChainById } from "@/config/chains";
import { cn } from "@/lib/utils";
import type { TxPhase, TxState } from "@/types/protocol";
import type { FriendlyError } from "@/utils/errors";
import { shortHash } from "@/utils/format";

const SEQUENCE: readonly TxPhase[] = ["preparing", "awaiting_wallet", "submitted", "pending", "confirming", "confirmed"];

interface TransactionProgressProps {
  state: TxState;
  error: FriendlyError | null;
  className?: string;
}

/** Truthful transaction lifecycle. Success is shown only after confirmation. */
export const TransactionProgress = ({ state, error, className }: TransactionProgressProps) => {
  if (state.phase === "idle") return null;

  const chain = getChainById(state.chainId);
  const link = explorerTxUrl(chain, state.hash);
  const failed = state.phase === "failed" || state.phase === "rejected";
  const currentIndex = SEQUENCE.indexOf(state.phase);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "rounded-xl border p-4",
        failed ? "border-destructive/30 bg-destructive/[0.05]" : "border-primary/25 bg-primary/[0.04]",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        {failed ? (
          <XCircle className="size-4 shrink-0 text-destructive" aria-hidden />
        ) : state.phase === "confirmed" ? (
          <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
        ) : (
          <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
        )}
        <p
          className={cn(
            "text-[13px] font-semibold",
            failed ? "text-destructive" : state.phase === "confirmed" ? "text-success" : "text-foreground",
          )}
        >
          {TX_PHASE_LABEL[state.phase]}
        </p>
      </div>

      {!failed ? (
        <ol className="mt-3.5 flex items-center gap-1" aria-label="Transaction stages">
          {SEQUENCE.map((phase, index) => (
            <li key={phase} className="flex flex-1 items-center gap-1">
              <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-border/70">
                <motion.div
                  className={cn("absolute inset-y-0 left-0", state.phase === "confirmed" ? "bg-success" : "bg-primary")}
                  initial={{ width: 0 }}
                  animate={{ width: index <= currentIndex ? "100%" : "0%" }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      {state.hash ? (
        <div className="mt-3 flex items-center gap-1.5 border-t border-border/50 pt-3">
          <span className="text-[11.5px] text-muted-foreground">Transaction</span>
          <span className="mono ml-auto text-[11px] text-foreground/85">{shortHash(state.hash)}</span>
          <CopyButton value={state.hash} label="Copy transaction hash" />
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="View on block explorer"
              className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <ExternalLink className="size-3" aria-hidden />
            </a>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 border-t border-destructive/20 pt-3">
          <p className="text-[12.5px] leading-relaxed text-foreground/85">{error.what}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{error.next}</p>
          <p className="mono mt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/70">{error.code}</p>
        </div>
      ) : null}
    </div>
  );
};

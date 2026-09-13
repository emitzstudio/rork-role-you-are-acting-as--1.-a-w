import { motion } from "framer-motion";
import { DollarSign, Lock, ShieldOff } from "lucide-react";
import type { ReactNode } from "react";

import { ChainGlyph } from "@/components/common/ChainGlyph";
import { CopyButton } from "@/components/common/CopyButton";
import type { ChainConfig } from "@/config/chains";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { shortAddress } from "@/utils/format";

interface ChainModuleRow {
  readonly label: string;
  readonly value: string;
  readonly copyValue?: string;
}

interface ChainModuleProps {
  chain: ChainConfig;
  /** Headline value, e.g. "4.72 ETH" or "$10,000 USDC". Null renders the empty treatment. */
  headline: string | null;
  headlineCaption: string;
  rows: readonly ChainModuleRow[];
  /** Visual emphasis — Chain A anchors collateral, Chain B issues loans. */
  variant: "vault" | "ledger";
  active: boolean;
  emptyLabel: string;
  emptyHint: string;
  footer?: ReactNode;
  className?: string;
}

/**
 * A chain environment: Chain A is a secure vault that ANCHORS the collateral,
 * Chain B is a ledger that issues the loan. Neither ever exchanges the asset.
 */
export const ChainModule = ({
  chain,
  headline,
  headlineCaption,
  rows,
  variant,
  active,
  emptyLabel,
  emptyHint,
  footer,
  className,
}: ChainModuleProps) => {
  const reduced = useAppStore((state) => state.motion) === "reduced";
  const isVault = variant === "vault";
  const accent = isVault ? "primary" : "accent";

  return (
    <section
      className={cn(
        "panel relative flex flex-col overflow-hidden transition-all duration-500",
        active && (isVault ? "border-primary/40" : "border-accent/40"),
        className,
      )}
      aria-label={`${chain.name} — ${chain.purpose}`}
    >
      <div className="pointer-events-none absolute inset-0 grid-field opacity-50" aria-hidden />
      <div
        className={cn(
          "pointer-events-none absolute -top-24 h-48 w-48 rounded-full blur-3xl transition-opacity duration-700",
          isVault ? "-left-16 bg-primary/15" : "-right-16 bg-accent/15",
          active ? "opacity-100" : "opacity-35",
        )}
        aria-hidden
      />

      {/* chain identity */}
      <header className="relative flex items-start gap-3 px-5 pt-5">
        <div
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg border",
            isVault ? "border-primary/30 bg-primary/10 text-primary" : "border-accent/30 bg-accent/10 text-accent",
          )}
        >
          <ChainGlyph role={chain.role} active={active} />
        </div>
        <div className="min-w-0">
          <p className="display text-sm font-bold tracking-tight">
            Chain {chain.role} — {chain.name}
          </p>
          <p className={cn("label-tech mt-1", isVault ? "text-primary/75" : "text-accent/75")}>{chain.purpose}</p>
        </div>
      </header>

      {/* headline state */}
      <div className="relative flex flex-1 items-center justify-center px-5 py-7">
        {headline === null ? (
          <div className="flex flex-col items-center text-center">
            <div className="grid size-12 place-items-center rounded-xl border border-border/70 bg-muted/25">
              <ShieldOff className="size-5 text-muted-foreground" aria-hidden />
            </div>
            <p className="display mt-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">{emptyLabel}</p>
            <p className="mt-1.5 max-w-[220px] text-xs leading-relaxed text-muted-foreground/75">{emptyHint}</p>
          </div>
        ) : (
          <div className="flex w-full items-center gap-5">
            {/* the anchored object — it pulses, it never travels */}
            <div className="relative shrink-0">
              {active && !reduced ? (
                <span
                  className={cn(
                    "absolute inset-0 rounded-2xl",
                    isVault ? "bg-primary/25" : "bg-accent/25",
                    "animate-pulse-ring",
                  )}
                  aria-hidden
                />
              ) : null}
              <motion.div
                animate={reduced ? undefined : { y: [0, -5, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className={cn(
                  "relative grid size-[68px] place-items-center rounded-2xl border backdrop-blur-sm",
                  isVault
                    ? "border-primary/40 bg-primary/[0.09]"
                    : "border-accent/40 bg-accent/[0.09]",
                  active && (isVault ? "glow-blue" : "glow-cyan"),
                )}
              >
                {isVault ? (
                  <Lock className="size-6 text-primary" aria-hidden />
                ) : (
                  <DollarSign className="size-6 text-accent" aria-hidden />
                )}
              </motion.div>
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "display text-2xl font-extrabold leading-none num tracking-tight lg:text-[1.75rem]",
                  isVault ? "text-foreground" : "text-accent",
                  active && (isVault ? "text-glow-blue" : "text-glow-cyan"),
                )}
              >
                {headline}
              </p>
              <p className={cn("label-tech mt-2", isVault ? "text-primary/80" : "text-accent/80")}>{headlineCaption}</p>
            </div>
          </div>
        )}
      </div>

      {/* technical metadata */}
      {rows.length > 0 ? (
        <dl className="relative hairline-t bg-background/35 px-5 py-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 py-[5px]">
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd className="flex min-w-0 items-center gap-1">
                <span className={cn("truncate text-xs font-medium", row.copyValue && "mono")}>
                  {row.copyValue ? shortAddress(row.value, 6, 4) : row.value}
                </span>
                {row.copyValue ? <CopyButton value={row.copyValue} label={`Copy ${row.label}`} /> : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {footer ? <div className="relative hairline-t px-5 py-3">{footer}</div> : null}
    </section>
  );
};

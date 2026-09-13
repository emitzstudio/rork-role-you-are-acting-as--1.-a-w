import { ChevronDown } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CHAIN_A, CHAIN_B, SUPPORTED_CHAINS } from "@/config/chains";
import { useWallet } from "@/hooks/useWallet";
import { cn } from "@/lib/utils";

/** Compact network chip in the system bar. Demo sessions show the protocol target network. */
export const NetworkSelector = () => {
  const { chain, chainId, isDemoSession, switchToChain } = useWallet();

  const label = isDemoSession ? CHAIN_B.shortName : (chain?.name ?? "Wrong network");
  const healthy = isDemoSession || chain !== undefined;

  if (isDemoSession) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-2.5 py-1.5">
        <span className="size-1.5 rounded-full bg-success" aria-hidden />
        <span className="text-[12.5px] font-medium text-foreground/85">{label}</span>
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors",
            healthy
              ? "border-border/60 bg-card/40 hover:border-primary/40"
              : "border-destructive/50 bg-destructive/10 hover:border-destructive",
          )}
          aria-label="Select network"
        >
          <span className={cn("size-1.5 rounded-full", healthy ? "bg-success" : "bg-destructive")} aria-hidden />
          <span className="hidden text-[12.5px] font-medium text-foreground/85 sm:inline">{label}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[248px] border-border/70 bg-popover/95 p-1.5 backdrop-blur-xl">
        <p className="label-tech px-2.5 py-1.5">Protocol networks</p>
        {SUPPORTED_CHAINS.filter((entry) => entry.chainId !== 31337 || chainId === 31337).map((entry) => (
          <button
            key={entry.chainId}
            type="button"
            onClick={() => void switchToChain(entry)}
            disabled={chainId === entry.chainId}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
              chainId === entry.chainId ? "bg-primary/10" : "hover:bg-secondary",
            )}
          >
            <span
              className={cn("size-1.5 shrink-0 rounded-full", chainId === entry.chainId ? "bg-success" : "bg-muted-foreground/40")}
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{entry.name}</span>
              <span className="mono block text-[10.5px] text-muted-foreground">
                Chain {entry.role} · {entry.chainId}
              </span>
            </span>
          </button>
        ))}
        <p className="mt-1 border-t border-border/60 px-2.5 pb-1 pt-2 text-[11px] leading-relaxed text-muted-foreground">
          Collateral operations require {CHAIN_A.name}.
        </p>
      </PopoverContent>
    </Popover>
  );
};

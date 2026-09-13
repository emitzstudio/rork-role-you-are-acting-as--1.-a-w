import { AlertTriangle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { ChainConfig } from "@/config/chains";
import { useWallet } from "@/hooks/useWallet";
import { cn } from "@/lib/utils";

interface NetworkWarningProps {
  requiredChain: ChainConfig;
  reason: string;
  className?: string;
}

/** Blocks an operation until the wallet is on the chain that owns it. */
export const NetworkWarning = ({ requiredChain, reason, className }: NetworkWarningProps) => {
  const { switchToChain, chain } = useWallet();
  const [switching, setSwitching] = useState<boolean>(false);

  const handleSwitch = async (): Promise<void> => {
    setSwitching(true);
    await switchToChain(requiredChain);
    setSwitching(false);
  };

  return (
    <div
      role="alert"
      className={cn("rounded-xl border border-warning/35 bg-warning/[0.06] p-5", className)}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-warning/35 bg-warning/10">
            <AlertTriangle className="size-4 text-warning" aria-hidden />
          </div>
          <div>
            <p className="display text-sm font-bold uppercase tracking-wide text-warning">Wrong network</p>
            <p className="mt-1 text-[13px] leading-relaxed text-foreground/80">{reason}</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Currently connected to {chain?.name ?? "an unsupported network"}.
            </p>
          </div>
        </div>
        <Button onClick={handleSwitch} disabled={switching} className="shrink-0 gap-2">
          {switching ? "Switching…" : `Switch to ${requiredChain.shortName}`}
        </Button>
      </div>
    </div>
  );
};

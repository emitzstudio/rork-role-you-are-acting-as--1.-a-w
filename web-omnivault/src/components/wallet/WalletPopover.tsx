import { ChevronDown, ExternalLink, LogOut, Settings as SettingsIcon, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { CopyButton } from "@/components/common/CopyButton";
import { ModeBadge } from "@/components/common/ModeBadge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CHAIN_A, CHAIN_B, explorerAddressUrl, getChainById } from "@/config/chains";
import { useWalletBalance } from "@/hooks/useProtocolData";
import { useWallet } from "@/hooks/useWallet";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { DEMO_OWNER } from "@/services/mock/demoData";
import { formatToken, shortAddress } from "@/utils/format";

/** Account menu. Exposes address, network, balance and disconnect — never secrets. */
export const WalletPopover = () => {
  const { address, chainId, chain, isDemoSession, disconnect, switchToChain } = useWallet();
  const mode = useAppStore((state) => state.mode);
  const { data: balance } = useWalletBalance();
  const navigate = useNavigate();

  const displayAddress = isDemoSession ? DEMO_OWNER : address;
  const explorerLink = explorerAddressUrl(chain ?? getChainById(CHAIN_A.chainId), displayAddress);

  const handleDisconnect = (): void => {
    disconnect();
    navigate("/", { replace: true });
  };

  if (!displayAddress) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-border/70 bg-card/50 px-2 py-1.5 transition-colors hover:border-primary/40 hover:bg-primary/[0.06]"
          aria-label="Account menu"
        >
          <span
            className="size-5 shrink-0 rounded-full border border-primary/30"
            style={{
              background: "conic-gradient(from 140deg, hsl(217 91% 60%), hsl(187 85% 53%), hsl(247 81% 68%))",
            }}
            aria-hidden
          />
          <span className="mono hidden text-[12px] text-foreground/85 sm:inline">
            {shortAddress(displayAddress, 6, 4)}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[292px] border-border/70 bg-popover/95 p-0 backdrop-blur-xl">
        <div className="hairline-b p-4">
          <div className="flex items-center justify-between">
            <p className="label-tech">Wallet</p>
            <ModeBadge mode={mode} size="sm" />
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <span
              className="size-8 shrink-0 rounded-full border border-primary/30"
              style={{
                background: "conic-gradient(from 140deg, hsl(217 91% 60%), hsl(187 85% 53%), hsl(247 81% 68%))",
              }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="mono truncate text-[12.5px] text-foreground">{shortAddress(displayAddress, 10, 6)}</p>
              <p className="text-[11px] text-muted-foreground">
                {isDemoSession ? "Demo session — not a real wallet" : "Connected"}
              </p>
            </div>
            <CopyButton value={displayAddress} label="Copy address" />
          </div>
        </div>

        <dl className="hairline-b px-4 py-3">
          <div className="flex items-center justify-between py-1">
            <dt className="text-[12.5px] text-muted-foreground">Network</dt>
            <dd className="flex items-center gap-1.5 text-[12.5px] font-medium">
              <span
                className={cn("size-1.5 rounded-full", chain || isDemoSession ? "bg-success" : "bg-destructive")}
                aria-hidden
              />
              {isDemoSession ? CHAIN_B.shortName : (chain?.name ?? `Unsupported (${chainId ?? "unknown"})`)}
            </dd>
          </div>
          <div className="flex items-center justify-between py-1">
            <dt className="text-[12.5px] text-muted-foreground">Balance</dt>
            <dd className="num text-[12.5px] font-medium">
              {balance ? formatToken(balance.amount, balance.symbol, 4) : "—"}
            </dd>
          </div>
        </dl>

        {!isDemoSession ? (
          <div className="hairline-b px-4 py-3">
            <p className="label-tech mb-2">Switch network</p>
            <div className="grid grid-cols-2 gap-2">
              {[CHAIN_A, CHAIN_B].map((target) => (
                <Button
                  key={target.chainId}
                  variant="outline"
                  size="sm"
                  disabled={chainId === target.chainId}
                  onClick={() => void switchToChain(target)}
                  className="h-8 justify-start gap-1.5 px-2 text-[11.5px]"
                >
                  <span
                    className={cn("size-1.5 rounded-full", chainId === target.chainId ? "bg-success" : "bg-muted-foreground/50")}
                    aria-hidden
                  />
                  <span className="truncate">Chain {target.role}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="p-1.5">
          {explorerLink ? (
            <a
              href={explorerLink}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-foreground/85 transition-colors hover:bg-secondary"
            >
              <ExternalLink className="size-4 text-muted-foreground" aria-hidden />
              View on explorer
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-foreground/85 transition-colors hover:bg-secondary"
          >
            <SettingsIcon className="size-4 text-muted-foreground" aria-hidden />
            Settings
          </button>
          <button
            type="button"
            onClick={handleDisconnect}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="size-4" aria-hidden />
            Disconnect wallet
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const WalletButtonSkeleton = () => (
  <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-card/40 px-2 py-1.5">
    <Wallet className="size-4 text-muted-foreground" aria-hidden />
    <span className="text-[12px] text-muted-foreground">Not connected</span>
  </div>
);

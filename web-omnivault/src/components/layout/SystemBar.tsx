import { Menu, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";

import { ModeBadge } from "@/components/common/ModeBadge";
import { NetworkSelector } from "@/components/wallet/NetworkSelector";
import { WalletPopover } from "@/components/wallet/WalletPopover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { titleForPath } from "@/config/navigation";
import { useRefreshProtocol, useSystemStatus } from "@/hooks/useProtocolData";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";

/** Thin protocol status strip. Deliberately not a navbar. */
export const SystemBar = () => {
  const location = useLocation();
  const mode = useAppStore((state) => state.mode);
  const setMobileSidebarOpen = useAppStore((state) => state.setMobileSidebarOpen);
  const { data: status, isFetching } = useSystemStatus();
  const refresh = useRefreshProtocol();
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const title = titleForPath(location.pathname);
  const health = status?.backend ?? "unknown";

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <header
      className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-xl lg:px-6"
      style={{ borderColor: "hsl(var(--hairline))" }}
    >
      <button
        type="button"
        onClick={() => setMobileSidebarOpen(true)}
        aria-label="Open navigation"
        className="grid size-8 shrink-0 place-items-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground lg:hidden"
      >
        <Menu className="size-4" aria-hidden />
      </button>

      <div className="flex min-w-0 items-center gap-2.5">
        <h2 className="display truncate text-[15px] font-bold tracking-tight">{title}</h2>
        <ModeBadge mode={mode} />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleRefresh}
              aria-label="Refresh protocol data"
              className="hidden size-8 place-items-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground sm:grid"
            >
              <RefreshCw className={cn("size-3.5", (refreshing || isFetching) && "animate-spin")} aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent>Refresh protocol data</TooltipContent>
        </Tooltip>

        <NetworkSelector />
        <WalletPopover />

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="hidden items-center gap-1.5 rounded-lg border border-border/60 bg-card/40 px-2.5 py-1.5 xl:flex">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  health === "operational"
                    ? "bg-success"
                    : health === "degraded"
                      ? "bg-warning"
                      : health === "unknown"
                        ? "bg-muted-foreground"
                        : "bg-destructive",
                )}
                aria-hidden
              />
              <span className="text-[12px] text-muted-foreground">
                {health === "operational"
                  ? "Protocol Online"
                  : health === "degraded"
                    ? "Degraded"
                    : health === "unknown"
                      ? "Status Unknown"
                      : "Unavailable"}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>Backend, relayer and chain connectivity</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
};

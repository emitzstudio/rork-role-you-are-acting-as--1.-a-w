import {
  Bell,
  Database,
  ExternalLink,
  Info,
  LogOut,
  Monitor,
  Network,
  Palette,
  RefreshCw,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { CopyButton } from "@/components/common/CopyButton";
import { ModeBadge } from "@/components/common/ModeBadge";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CHAIN_A, CHAIN_B } from "@/config/chains";
import { env } from "@/config/env";
import { useRefreshProtocol, useSystemStatus } from "@/hooks/useProtocolData";
import { useWallet } from "@/hooks/useWallet";
import { cn } from "@/lib/utils";
import { DEMO_OWNER } from "@/services/mock/demoData";
import { useAppStore } from "@/stores/useAppStore";
import { shortAddress } from "@/utils/format";

const Settings = () => {
  const navigate = useNavigate();
  const { address, chain, chainId, isDemoSession, disconnect, switchToChain, enterDemo } = useWallet();
  const { data: status } = useSystemStatus();
  const refresh = useRefreshProtocol();

  const mode = useAppStore((state) => state.mode);
  const setMode = useAppStore((state) => state.setMode);
  const motion = useAppStore((state) => state.motion);
  const setMotion = useAppStore((state) => state.setMotion);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const notifications = useAppStore((state) => state.notifications);
  const setNotification = useAppStore((state) => state.setNotification);

  const [refreshing, setRefreshing] = useState<boolean>(false);

  const displayAddress = isDemoSession ? DEMO_OWNER : address;

  const handleRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
    toast.success("Protocol data refreshed");
  }, [refresh]);

  const handleDisconnect = useCallback((): void => {
    disconnect();
    navigate("/", { replace: true });
  }, [disconnect, navigate]);

  const handleModeChange = useCallback(
    (next: "live" | "demo"): void => {
      if (next === "demo") {
        enterDemo();
        toast.info("Demo mode enabled", {
          description: "All data is isolated sample data and is labelled DEMO throughout the app.",
        });
        return;
      }
      if (!address) {
        toast.error("Wallet required", { description: "Connect a wallet to use Live mode." });
        return;
      }
      setMode("live");
      toast.success("Live mode enabled");
    },
    [enterDemo, address, setMode],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Manage your session, network, appearance, and how OmniVault reads protocol data."
      />

      {/* ACCOUNT */}
      <Section icon={Wallet} title="Account" description="Wallet authentication and session control.">
        <Row label="Wallet" description={isDemoSession ? "Demo session — not a real wallet" : "Connected account"}>
          {displayAddress ? (
            <div className="flex items-center gap-1.5">
              <code className="mono text-[12.5px] text-foreground/85">{shortAddress(displayAddress, 8, 6)}</code>
              <CopyButton value={displayAddress} label="Copy address" />
            </div>
          ) : (
            <span className="text-[12.5px] text-muted-foreground">Not connected</span>
          )}
        </Row>
        <Row label="Connection" description="How you are authenticated">
          <span className="text-[12.5px] text-foreground/85">
            {isDemoSession ? "Demo session" : address ? "Injected browser wallet" : "None"}
          </span>
        </Row>
        <Row label="Disconnect" description="Clears your session and returns to the entry screen">
          <Button variant="outline" size="sm" onClick={handleDisconnect} className="gap-2 text-destructive">
            <LogOut className="size-3.5" aria-hidden />
            Disconnect
          </Button>
        </Row>
      </Section>

      {/* NETWORK */}
      <Section icon={Network} title="Network" description="Protocol target chains and wallet network.">
        <Row label="Current network" description="The chain your wallet is connected to">
          <span className="flex items-center gap-1.5 text-[12.5px]">
            <span className={cn("size-1.5 rounded-full", chain ? "bg-success" : "bg-destructive")} aria-hidden />
            {isDemoSession ? "Demo (no wallet)" : (chain?.name ?? `Unsupported (${chainId ?? "unknown"})`)}
          </span>
        </Row>
        <Row label={`Chain A — ${CHAIN_A.name}`} description={`Chain ID ${CHAIN_A.chainId} · ${CHAIN_A.purpose}`}>
          <Button
            variant="outline"
            size="sm"
            disabled={isDemoSession || chainId === CHAIN_A.chainId}
            onClick={() => void switchToChain(CHAIN_A)}
            className="text-[12px]"
          >
            {chainId === CHAIN_A.chainId ? "Active" : "Switch"}
          </Button>
        </Row>
        <Row label={`Chain B — ${CHAIN_B.name}`} description={`Chain ID ${CHAIN_B.chainId} · ${CHAIN_B.purpose}`}>
          <Button
            variant="outline"
            size="sm"
            disabled={isDemoSession || chainId === CHAIN_B.chainId}
            onClick={() => void switchToChain(CHAIN_B)}
            className="text-[12px]"
          >
            {chainId === CHAIN_B.chainId ? "Active" : "Switch"}
          </Button>
        </Row>
      </Section>

      {/* APPEARANCE */}
      <Section icon={Palette} title="Appearance" description="Dark is the primary OmniVault theme.">
        <Row label="Theme" description="Choose how the console renders">
          <div className="flex gap-1.5">
            {(["dark", "light"] as const).map((option) => (
              <Button
                key={option}
                variant={theme === option ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme(option)}
                className="min-w-[76px] capitalize text-[12px]"
              >
                {option}
              </Button>
            ))}
          </div>
        </Row>
      </Section>

      {/* MOTION */}
      <Section icon={Sparkles} title="Motion" description="Animation intensity across the protocol visuals.">
        <Row
          label="Reduced motion"
          description="Disables particles, drifting and proof-stream animation. Your system preference is always respected."
        >
          <Switch
            checked={motion === "reduced"}
            onCheckedChange={(checked) => setMotion(checked ? "reduced" : "full")}
            aria-label="Reduced motion"
          />
        </Row>
      </Section>

      {/* DATA */}
      <Section icon={Database} title="Data" description="Where OmniVault reads protocol state from.">
        <Row
          label="Data mode"
          description={
            mode === "demo"
              ? "Demo data is isolated sample data. It is never presented as live blockchain state."
              : "Live data is read from the protocol backend and chains."
          }
        >
          <div className="flex items-center gap-2">
            <ModeBadge mode={mode} />
            <div className="flex gap-1.5">
              {(["live", "demo"] as const).map((option) => (
                <Button
                  key={option}
                  variant={mode === option ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleModeChange(option)}
                  className="min-w-[64px] capitalize text-[12px]"
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        </Row>
        <Row label="API status" description={env.apiBaseUrl || "Backend API URL is not configured"}>
          <span
            className={cn(
              "text-[12.5px] font-medium capitalize",
              status?.backend === "operational"
                ? "text-success"
                : status?.backend === "degraded"
                  ? "text-warning"
                  : status?.backend === "unavailable"
                    ? "text-destructive"
                    : "text-muted-foreground",
            )}
          >
            {status?.backend ?? "unknown"}
          </span>
        </Row>
        <Row label="Refresh data" description="Re-read collateral, loans, proofs and activity">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-2 text-[12px]">
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} aria-hidden />
            Refresh
          </Button>
        </Row>
      </Section>

      {/* NOTIFICATIONS */}
      <Section icon={Bell} title="Notifications" description="In-app toast notifications.">
        <Row label="Transaction updates" description="Confirmations, failures and rejections">
          <Switch
            checked={notifications.transactions}
            onCheckedChange={(checked) => setNotification("transactions", checked)}
            aria-label="Transaction updates"
          />
        </Row>
        <Row label="Security alerts" description="Rejected attacks and protection events">
          <Switch
            checked={notifications.security}
            onCheckedChange={(checked) => setNotification("security", checked)}
            aria-label="Security alerts"
          />
        </Row>
        <Row label="Protocol activity" description="Relayer actions and attestation lifecycle">
          <Switch
            checked={notifications.activity}
            onCheckedChange={(checked) => setNotification("activity", checked)}
            aria-label="Protocol activity"
          />
        </Row>
      </Section>

      {/* ABOUT */}
      <Section icon={Info} title="About" description="Build and deployment information.">
        <Row label="Version" description="OmniVault frontend build">
          <code className="mono text-[12.5px] text-foreground/85">{env.appVersion}</code>
        </Row>
        <Row label="Environment" description="Active runtime environment">
          <code className="mono text-[12.5px] capitalize text-foreground/85">{env.environment}</code>
        </Row>
        <Row label="Documentation" description="How the protocol works">
          <Button variant="outline" size="sm" onClick={() => navigate("/docs")} className="gap-2 text-[12px]">
            <Monitor className="size-3.5" aria-hidden />
            Open docs
          </Button>
        </Row>
        {env.repositoryUrl ? (
          <Row label="Repository" description="Source code">
            <Button asChild variant="outline" size="sm" className="gap-2 text-[12px]">
              <a href={env.repositoryUrl} target="_blank" rel="noreferrer noopener">
                <ExternalLink className="size-3.5" aria-hidden />
                View
              </a>
            </Button>
          </Row>
        ) : null}
        <Row label="Deployed contracts" description="Addresses come from the deployment configuration">
          <Button variant="outline" size="sm" onClick={() => navigate("/status")} className="text-[12px]">
            View on Status
          </Button>
        </Row>
      </Section>

      <p className="rounded-xl border border-border/60 bg-card/30 p-4 text-[12px] leading-relaxed text-muted-foreground">
        OmniVault never stores private keys, seed phrases or backend secrets in the browser. Only your public address,
        network and display preferences are kept locally.
      </p>
    </div>
  );
};

const Section = ({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Wallet;
  title: string;
  description: string;
  children: ReactNode;
}) => (
  <section className="panel overflow-hidden">
    <header className="flex items-start gap-3 border-b border-border/50 p-5">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/[0.07]">
        <Icon className="size-4 text-primary" aria-hidden />
      </div>
      <div>
        <h2 className="display text-[15px] font-bold uppercase tracking-wide">{title}</h2>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">{description}</p>
      </div>
    </header>
    <div className="divide-y divide-border/40">{children}</div>
  </section>
);

const Row = ({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: ReactNode;
}) => (
  <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
    <div className="min-w-0">
      <p className="text-[13.5px] font-medium">{label}</p>
      <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{description}</p>
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

export default Settings;

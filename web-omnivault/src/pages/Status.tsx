import {
  CircleHelp,
  Cloud,
  Cpu,
  Globe,
  Link2,
  RefreshCw,
  Server,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useState } from "react";

import { CopyButton } from "@/components/common/CopyButton";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingPanel } from "@/components/common/Skeletons";
import { Button } from "@/components/ui/button";
import { CHAIN_A, CHAIN_B } from "@/config/chains";
import { env } from "@/config/env";
import { useSystemStatus } from "@/hooks/useProtocolData";
import { cn } from "@/lib/utils";
import type { ServiceHealth } from "@/types/protocol";
import { formatDateTime, shortAddress } from "@/utils/format";

const HEALTH_META: Record<ServiceHealth, { label: string; dot: string; text: string; border: string }> = {
  operational: {
    label: "Operational",
    dot: "bg-success",
    text: "text-success",
    border: "border-success/25 bg-success/[0.04]",
  },
  degraded: { label: "Degraded", dot: "bg-warning", text: "text-warning", border: "border-warning/25 bg-warning/[0.04]" },
  unavailable: {
    label: "Unavailable",
    dot: "bg-destructive",
    text: "text-destructive",
    border: "border-destructive/25 bg-destructive/[0.04]",
  },
  unknown: {
    label: "Unknown",
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
    border: "border-border/60 bg-card/30",
  },
};

const Status = () => {
  const { data, isLoading, error, refetch, isFetching } = useSystemStatus();
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const handleRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Service health"
        title="System Status"
        description="Live connectivity for every component OmniVault depends on. Status is reported as observed — never assumed."
        actions={
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing || isFetching} className="gap-2">
            <RefreshCw className={cn("size-4", (refreshing || isFetching) && "animate-spin")} aria-hidden />
            Refresh
          </Button>
        }
      />

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <LoadingPanel message="Checking services" rows={5} />
      ) : data ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <ServiceTile
              icon={Globe}
              name="Frontend"
              detail="This application"
              health="operational"
              note={`Environment: ${env.environment}`}
            />
            <ServiceTile
              icon={Server}
              name="Backend API"
              detail="Relayer REST service"
              health={data.backend}
              note={env.apiBaseUrl ? env.apiBaseUrl : "API URL not configured"}
            />
            <ServiceTile
              icon={Cpu}
              name="Trusted Relayer"
              detail="Attestation signing service"
              health={data.relayer.health}
              note={
                data.relayer.address
                  ? `Signer ${shortAddress(data.relayer.address, 6, 4)}`
                  : "Signer address unavailable"
              }
            />
            <ServiceTile
              icon={Link2}
              name={`Chain A — ${CHAIN_A.name}`}
              detail="Collateral vault chain"
              health={data.chainA}
              note={`Chain ID ${CHAIN_A.chainId}`}
            />
            <ServiceTile
              icon={Link2}
              name={`Chain B — ${CHAIN_B.name}`}
              detail="Verification & lending chain"
              health={data.chainB}
              note={`Chain ID ${CHAIN_B.chainId}`}
            />
            <ServiceTile
              icon={Cloud}
              name="Relayer Queue"
              detail="Pending cross-chain jobs"
              health={data.relayer.health}
              note={
                data.relayer.queueDepth === null
                  ? "Queue depth unavailable"
                  : `${data.relayer.queueDepth} job${data.relayer.queueDepth === 1 ? "" : "s"} queued`
              }
            />
          </div>

          {/* contracts */}
          <section className="panel p-5">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" aria-hidden />
              <h2 className="label-tech text-foreground/85">Deployed Contracts</h2>
            </div>
            <dl className="space-y-2">
              <ContractRow label="CollateralVault" chain={CHAIN_A.name} address={data.contracts.collateralVault} />
              <ContractRow
                label="AttestationVerifier"
                chain={CHAIN_B.name}
                address={data.contracts.attestationVerifier}
              />
              <ContractRow
                label="CrossChainLending"
                chain={CHAIN_B.name}
                address={data.contracts.crossChainLending}
              />
            </dl>
          </section>

          {/* relayer detail */}
          <section className="panel p-5">
            <h2 className="label-tech mb-4 text-foreground/85">Relayer Detail</h2>
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              <Detail label="Chain A connection" value={data.relayer.chainAConnected ? "Connected" : "Not connected"} tone={data.relayer.chainAConnected ? "success" : "danger"} />
              <Detail label="Chain B connection" value={data.relayer.chainBConnected ? "Connected" : "Not connected"} tone={data.relayer.chainBConnected ? "success" : "danger"} />
              <Detail label="Last relay" value={data.relayer.lastRelayAt ? formatDateTime(data.relayer.lastRelayAt) : "—"} />
              <Detail label="Checked at" value={formatDateTime(data.checkedAt)} />
            </dl>
          </section>

          {data.backend === "unavailable" ? (
            <p className="rounded-xl border border-destructive/25 bg-destructive/[0.05] p-4 text-[12.5px] leading-relaxed text-foreground/85">
              The protocol service is unavailable, so live collateral, loan and proof data cannot be read. Demo mode
              remains fully available and is clearly labelled wherever it is shown.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
};

interface ServiceTileProps {
  icon: LucideIcon;
  name: string;
  detail: string;
  health: ServiceHealth;
  note: string;
}

const ServiceTile = ({ icon: Icon, name, detail, health, note }: ServiceTileProps) => {
  const meta = HEALTH_META[health];

  return (
    <article className={cn("panel p-5", meta.border)}>
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-border/60 bg-card/50">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-semibold">{name}</h3>
          <p className="truncate text-[11.5px] text-muted-foreground">{detail}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden />
          <span className={cn("text-[11.5px] font-semibold", meta.text)}>{meta.label}</span>
        </div>
      </div>
      <p className="mono mt-3.5 truncate border-t border-border/40 pt-3 text-[10.5px] text-muted-foreground/75" title={note}>
        {note}
      </p>
    </article>
  );
};

const ContractRow = ({ label, chain, address }: { label: string; chain: string; address: string | null }) => (
  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-card/30 px-4 py-3">
    <div className="min-w-0 flex-1">
      <dt className="text-[13px] font-medium">{label}</dt>
      <dd className="text-[11.5px] text-muted-foreground">{chain}</dd>
    </div>
    {address ? (
      <div className="flex items-center gap-1.5">
        <code className="mono text-[11.5px] text-foreground/80">{shortAddress(address, 8, 6)}</code>
        <CopyButton value={address} label={`Copy ${label} address`} />
      </div>
    ) : (
      <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        <CircleHelp className="size-3.5" aria-hidden />
        Not configured
      </span>
    )}
  </div>
);

const Detail = ({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
}) => (
  <div className="min-w-0">
    <dt className="label-tech">{label}</dt>
    <dd
      className={cn(
        "mt-1 truncate text-[13px] font-medium",
        tone === "success" && "text-success",
        tone === "danger" && "text-destructive",
      )}
    >
      {value}
    </dd>
  </div>
);

export default Status;

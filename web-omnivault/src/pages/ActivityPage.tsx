import {
  Activity as ActivityIcon,
  ArrowDownToLine,
  ArrowUpFromLine,
  ExternalLink,
  FileSignature,
  Lock,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { RowSkeletonList } from "@/components/common/Skeletons";
import { StatusBadge, type BadgeTone } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { explorerTxUrl, getChainById } from "@/config/chains";
import { useActivity } from "@/hooks/useProtocolData";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import type { ActivityCategory, ActivityEvent, ActivityKind } from "@/types/protocol";
import { formatDateTime, relativeTime, shortHash } from "@/utils/format";

const KIND_ICON: Record<ActivityKind, LucideIcon> = {
  collateral_locked: Lock,
  attestation_created: FileSignature,
  proof_submitted: Send,
  attestation_verified: ShieldCheck,
  loan_issued: ArrowDownToLine,
  loan_repaid: ArrowUpFromLine,
  collateral_unlocked: Unlock,
  attack_rejected: ShieldAlert,
  relayer_action: ActivityIcon,
};

const KIND_TONE: Record<ActivityKind, string> = {
  collateral_locked: "text-primary border-primary/25 bg-primary/[0.07]",
  attestation_created: "text-violet border-violet/25 bg-violet/[0.07]",
  proof_submitted: "text-violet border-violet/25 bg-violet/[0.07]",
  attestation_verified: "text-accent border-accent/25 bg-accent/[0.07]",
  loan_issued: "text-success border-success/25 bg-success/[0.07]",
  loan_repaid: "text-success border-success/25 bg-success/[0.07]",
  collateral_unlocked: "text-primary border-primary/25 bg-primary/[0.07]",
  attack_rejected: "text-destructive border-destructive/25 bg-destructive/[0.07]",
  relayer_action: "text-muted-foreground border-border/70 bg-muted/20",
};

const FILTERS: readonly { id: "all" | ActivityCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "chainA", label: "Chain A" },
  { id: "chainB", label: "Chain B" },
  { id: "collateral", label: "Collateral" },
  { id: "loan", label: "Loans" },
  { id: "security", label: "Security" },
  { id: "relayer", label: "Relayer" },
];

const STATUS_TONE: Record<ActivityEvent["status"], BadgeTone> = {
  success: "success",
  pending: "warning",
  failed: "danger",
};

const ActivityPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data, isLoading, error, refetch } = useActivity();
  const markActivitySeen = useAppStore((state) => state.markActivitySeen);

  const [filter, setFilter] = useState<"all" | ActivityCategory>("all");
  const [query, setQuery] = useState<string>("");

  const collateralFilter = searchParams.get("collateral");

  // Viewing the log clears the sidebar "new activity" indicator.
  useEffect(() => {
    markActivitySeen();
  }, [markActivitySeen, data]);

  const events = useMemo(() => {
    let list = data ?? [];
    if (collateralFilter) list = list.filter((event) => event.collateralId === collateralFilter);
    if (filter !== "all") {
      list = list.filter((event) => {
        if (filter === "collateral") return event.collateralId !== null;
        if (filter === "loan") return event.loanId !== null || event.category === "loan";
        return event.category === filter;
      });
    }
    const needle = query.trim().toLowerCase();
    if (needle.length > 0) {
      list = list.filter(
        (event) =>
          event.title.toLowerCase().includes(needle) ||
          (event.detail ?? "").toLowerCase().includes(needle) ||
          (event.txHash ?? "").toLowerCase().includes(needle) ||
          (event.collateralId ?? "").toLowerCase().includes(needle) ||
          (event.loanId ?? "").toLowerCase().includes(needle),
      );
    }
    return list;
  }, [data, filter, query, collateralFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Protocol event log"
        title="Activity"
        description="Every important protocol action, traceable — from the moment collateral is locked to the moment it is released."
      />

      {collateralFilter ? (
        <div className="flex items-center gap-3 rounded-lg border border-primary/25 bg-primary/[0.05] px-4 py-2.5">
          <p className="text-[12.5px] text-foreground/85">Filtered to collateral #{collateralFilter}</p>
          <Button variant="ghost" size="sm" onClick={() => navigate("/activity")} className="ml-auto h-7 text-[12px]">
            Clear filter
          </Button>
        </div>
      ) : null}

      {/* controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {FILTERS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setFilter(entry.id)}
              aria-pressed={filter === entry.id}
              className={cn(
                "shrink-0 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                filter === entry.id
                  ? "border-primary/40 bg-primary/[0.1] text-foreground"
                  : "border-border/60 bg-card/30 text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="relative lg:w-[280px]">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search events, hashes, IDs"
            aria-label="Search activity"
            className="h-9 pl-9 text-[13px]"
          />
        </div>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <RowSkeletonList count={6} />
      ) : events.length === 0 ? (
        <EmptyState
          icon={ActivityIcon}
          title={query || filter !== "all" ? "No matching events." : "No protocol activity yet."}
          description={
            query || filter !== "all"
              ? "Try a different filter or search term."
              : "Locking collateral, generating proofs and issuing loans will all appear here."
          }
        />
      ) : (
        <section className="panel overflow-hidden">
          {/* desktop table header */}
          <div
            className="hidden grid-cols-[minmax(0,2.2fr)_100px_110px_110px_130px_100px] gap-4 border-b border-border/50 bg-background/40 px-5 py-2.5 lg:grid"
            aria-hidden
          >
            {["Event", "Collateral", "Loan", "Chain", "Transaction", "Status"].map((heading) => (
              <span key={heading} className="label-tech">
                {heading}
              </span>
            ))}
          </div>

          <ul>
            {events.map((event) => (
              <ActivityRow key={event.id} event={event} onNavigate={navigate} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

const ActivityRow = ({
  event,
  onNavigate,
}: {
  event: ActivityEvent;
  onNavigate: (path: string) => void;
}) => {
  const Icon = KIND_ICON[event.kind];
  const chain = getChainById(event.chainId);
  const link = explorerTxUrl(chain, event.txHash);

  return (
    <li className="border-b border-border/40 transition-colors last:border-b-0 hover:bg-primary/[0.03]">
      <div className="grid gap-3 px-5 py-3.5 lg:grid-cols-[minmax(0,2.2fr)_100px_110px_110px_130px_100px] lg:items-center lg:gap-4">
        {/* event */}
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn("grid size-8 shrink-0 place-items-center rounded-lg border", KIND_TONE[event.kind])}>
            <Icon className="size-3.5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium">{event.title}</p>
            <p className="truncate text-[11.5px] text-muted-foreground">
              {event.detail ?? formatDateTime(event.timestamp)}
            </p>
          </div>
          <span
            className="mono ml-auto shrink-0 text-[10.5px] text-muted-foreground lg:hidden"
            title={formatDateTime(event.timestamp)}
          >
            {relativeTime(event.timestamp)}
          </span>
        </div>

        {/* collateral */}
        <div className="hidden min-w-0 lg:block">
          {event.collateralId ? (
            <button
              type="button"
              onClick={() => onNavigate(`/vault`)}
              className="mono truncate text-[12px] text-foreground/80 transition-colors hover:text-primary"
            >
              #{event.collateralId}
            </button>
          ) : (
            <span className="text-[12px] text-muted-foreground/50">—</span>
          )}
        </div>

        {/* loan */}
        <div className="hidden min-w-0 lg:block">
          {event.loanId ? (
            <button
              type="button"
              onClick={() => onNavigate(`/loans/${event.loanId}`)}
              className="mono truncate text-[12px] text-foreground/80 transition-colors hover:text-primary"
            >
              {event.loanId}
            </button>
          ) : (
            <span className="text-[12px] text-muted-foreground/50">—</span>
          )}
        </div>

        {/* chain */}
        <div className="hidden min-w-0 lg:block">
          <span className="truncate text-[12px] text-muted-foreground">{chain?.shortName ?? "—"}</span>
        </div>

        {/* transaction */}
        <div className="hidden min-w-0 items-center gap-1 lg:flex">
          {event.txHash ? (
            <>
              <span className="mono truncate text-[11.5px] text-muted-foreground">{shortHash(event.txHash)}</span>
              {link ? (
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="View transaction on explorer"
                  className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:text-primary"
                >
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              ) : null}
            </>
          ) : (
            <span className="text-[12px] text-muted-foreground/50">—</span>
          )}
        </div>

        {/* status */}
        <div className="flex items-center gap-2 lg:justify-start">
          <StatusBadge
            tone={STATUS_TONE[event.status]}
            label={event.status === "failed" ? "Rejected" : event.status}
            withIcon={false}
            className="capitalize text-[10px]"
          />
          <span
            className="mono ml-auto hidden shrink-0 text-[10.5px] text-muted-foreground lg:inline"
            title={formatDateTime(event.timestamp)}
          >
            {relativeTime(event.timestamp)}
          </span>
        </div>
      </div>
    </li>
  );
};

export default ActivityPage;

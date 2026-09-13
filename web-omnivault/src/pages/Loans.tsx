import { ArrowRight, Receipt } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { RowSkeletonList } from "@/components/common/Skeletons";
import { StatusBadge, type BadgeTone } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CHAIN_A, CHAIN_B } from "@/config/chains";
import { useLoans } from "@/hooks/useProtocolData";
import { cn } from "@/lib/utils";
import type { Loan, LoanStatus } from "@/types/protocol";
import { formatDateTime, formatHealthFactor, formatUsd, healthTone } from "@/utils/format";

type LoanFilter = "active" | "repaid" | "all";

const STATUS_TONE: Record<LoanStatus, BadgeTone> = {
  active: "success",
  pending: "warning",
  repaid: "neutral",
  liquidated: "danger",
  failed: "danger",
};

const Loans = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useLoans();
  const [filter, setFilter] = useState<LoanFilter>("active");

  const loans = data ?? [];

  const filtered = useMemo(() => {
    if (filter === "active") return loans.filter((loan) => loan.status === "active" || loan.status === "pending");
    if (filter === "repaid") return loans.filter((loan) => loan.status === "repaid");
    return loans;
  }, [loans, filter]);

  const counts = useMemo(
    () => ({
      active: loans.filter((loan) => loan.status === "active" || loan.status === "pending").length,
      repaid: loans.filter((loan) => loan.status === "repaid").length,
      all: loans.length,
    }),
    [loans],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Chain B lending"
        title="Loans"
        description="Every loan is backed by collateral that never left Chain A. Repaying a loan releases its collateral back to you."
      />

      <Tabs value={filter} onValueChange={(value) => setFilter(value as LoanFilter)}>
        <TabsList className="bg-card/50">
          <TabsTrigger value="active" className="gap-2 text-[13px]">
            Active
            <CountChip value={counts.active} />
          </TabsTrigger>
          <TabsTrigger value="repaid" className="gap-2 text-[13px]">
            Repaid
            <CountChip value={counts.repaid} />
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2 text-[13px]">
            All
            <CountChip value={counts.all} />
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <RowSkeletonList count={3} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={filter === "repaid" ? "No repaid loans yet." : "No active loans."}
          description={
            filter === "repaid"
              ? "Loans you repay in full will appear here along with their attestation history."
              : "Borrow against locked collateral to open your first cross-chain loan."
          }
          action={
            filter !== "repaid" ? (
              <Button onClick={() => navigate("/borrow")} className="gap-2">
                Start borrowing
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((loan) => (
            <LoanRow key={loan.id} loan={loan} onOpen={() => navigate(`/loans/${loan.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
};

const CountChip = ({ value }: { value: number }) => (
  <span className="mono rounded-md border border-border/60 bg-muted/30 px-1.5 py-px text-[10px] font-semibold">
    {value}
  </span>
);

const LoanRow = ({ loan, onOpen }: { loan: Loan; onOpen: () => void }) => {
  const tone = healthTone(loan.healthFactor);

  return (
    <article className="panel panel-hover overflow-hidden">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:gap-6">
          <div className="flex min-w-0 items-center gap-3.5 lg:w-[220px]">
            <div
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-xl border",
                loan.status === "active"
                  ? "border-accent/30 bg-accent/[0.08]"
                  : "border-border/70 bg-muted/20",
              )}
            >
              <Receipt
                className={cn("size-[18px]", loan.status === "active" ? "text-accent" : "text-muted-foreground")}
                aria-hidden
              />
            </div>
            <div className="min-w-0">
              <p className="display text-lg font-extrabold leading-none num tracking-tight">
                {formatUsd(loan.principal)}
              </p>
              <p className="mono mt-1 truncate text-[11.5px] text-muted-foreground">
                {loan.currencySymbol} · Loan #{loan.id}
              </p>
            </div>
          </div>

          <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-4">
            <Field label="Collateral" value={`#${loan.collateralId}`} mono />
            <Field label="Route" value={`${CHAIN_A.shortName} → ${CHAIN_B.shortName}`} />
            <Field
              label="Outstanding"
              value={loan.status === "repaid" ? formatUsd(0) : formatUsd(loan.outstanding)}
            />
            <Field label="Created" value={formatDateTime(loan.createdAt)} />
          </dl>

          <div className="flex shrink-0 items-center gap-3">
            {loan.healthFactor !== null ? (
              <div className="text-right">
                <p className="label-tech">Health</p>
                <p
                  className={cn(
                    "display mt-1 text-base font-bold num",
                    tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-destructive",
                  )}
                >
                  {formatHealthFactor(loan.healthFactor)}
                </p>
              </div>
            ) : null}
            <StatusBadge tone={STATUS_TONE[loan.status]} label={loan.status} className="capitalize" withIcon={false} />
            <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
          </div>
        </div>
      </button>
    </article>
  );
};

const Field = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => (
  <div className="min-w-0">
    <dt className="label-tech">{label}</dt>
    <dd className={cn("mt-1 truncate text-[13px] font-medium", mono && "mono text-[12px]")}>{value}</dd>
  </div>
);

export default Loans;

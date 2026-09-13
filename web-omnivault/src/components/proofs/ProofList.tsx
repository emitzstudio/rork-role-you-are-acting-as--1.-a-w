import { FileCheck2, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge, type BadgeTone } from "@/components/common/StatusBadge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHAIN_A, CHAIN_B } from "@/config/chains";
import { cn } from "@/lib/utils";
import type { Attestation, ProofStatus } from "@/types/protocol";
import { formatDateTime } from "@/utils/format";

export const PROOF_STATUS_TONE: Record<ProofStatus, BadgeTone> = {
  verified: "success",
  consumed: "success",
  transmitted: "info",
  signed: "violet",
  pending: "warning",
  failed: "danger",
};

export const PROOF_STATUS_LABEL: Record<ProofStatus, string> = {
  verified: "Verified",
  consumed: "Consumed",
  transmitted: "Transmitted",
  signed: "Signed",
  pending: "Pending",
  failed: "Failed",
};

const STATUS_DOT: Record<ProofStatus, string> = {
  verified: "bg-success",
  consumed: "bg-success/70",
  transmitted: "bg-primary",
  signed: "bg-violet",
  pending: "bg-warning",
  failed: "bg-destructive",
};

interface ProofListProps {
  proofs: readonly Attestation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

export const ProofList = ({ proofs, selectedId, onSelect, className }: ProofListProps) => {
  const [query, setQuery] = useState<string>("");
  const [status, setStatus] = useState<string>("all");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return proofs.filter((proof) => {
      const matchesStatus =
        status === "all" ||
        (status === "verified" && (proof.status === "verified" || proof.status === "consumed")) ||
        (status === "pending" && (proof.status === "pending" || proof.status === "transmitted" || proof.status === "signed")) ||
        (status === "failed" && proof.status === "failed");

      const matchesQuery =
        needle.length === 0 ||
        proof.id.toLowerCase().includes(needle) ||
        proof.collateralId.toLowerCase().includes(needle) ||
        proof.nonce.toLowerCase().includes(needle) ||
        proof.signer.toLowerCase().includes(needle);

      return matchesStatus && matchesQuery;
    });
  }, [proofs, query, status]);

  return (
    <section className={cn("panel flex min-h-0 flex-col overflow-hidden", className)} aria-label="Recent proofs">
      <header className="shrink-0 space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="display text-[14px] font-bold tracking-tight">Recent Proofs</h2>
          <span className="mono text-[10.5px] text-muted-foreground">{filtered.length}</span>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search proofs"
              aria-label="Search proofs"
              className="h-8 pl-8 text-[12.5px]"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 w-[112px] text-[12px]" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-border/50">
        {filtered.length === 0 ? (
          <p className="p-6 text-center text-[12.5px] text-muted-foreground">No proofs match your filters.</p>
        ) : (
          <ul>
            {filtered.map((proof) => {
              const isSelected = proof.id === selectedId;
              return (
                <li key={proof.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(proof.id)}
                    aria-current={isSelected ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-border/40 px-4 py-3 text-left transition-colors",
                      isSelected ? "bg-primary/[0.09]" : "hover:bg-primary/[0.04]",
                    )}
                  >
                    <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[proof.status])} aria-hidden />
                    <div
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-lg border",
                        isSelected ? "border-primary/35 bg-primary/10" : "border-border/60 bg-card/40",
                      )}
                    >
                      <FileCheck2
                        className={cn("size-3.5", isSelected ? "text-primary" : "text-muted-foreground")}
                        aria-hidden
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="mono truncate text-[12.5px] font-semibold">#{proof.id}</p>
                      <p className="truncate text-[10.5px] text-muted-foreground">
                        {CHAIN_A.shortName} → {CHAIN_B.shortName}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground/70">
                        {formatDateTime(proof.createdAt)}
                      </p>
                    </div>

                    <StatusBadge
                      tone={PROOF_STATUS_TONE[proof.status]}
                      label={PROOF_STATUS_LABEL[proof.status]}
                      withIcon={false}
                      className="shrink-0 text-[10px]"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};

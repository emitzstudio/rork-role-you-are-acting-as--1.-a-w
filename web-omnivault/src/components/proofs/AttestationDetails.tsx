import { CheckCircle2, Clock, ExternalLink, Loader2, XCircle } from "lucide-react";

import { DataField } from "@/components/common/DataField";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PROOF_STATUS_LABEL, PROOF_STATUS_TONE } from "@/components/proofs/ProofList";
import { explorerTxUrl, getChainById } from "@/config/chains";
import { cn } from "@/lib/utils";
import type { Attestation } from "@/types/protocol";
import { formatDateTime, formatTime, formatToken, shortAddress } from "@/utils/format";

interface AttestationDetailsProps {
  attestation: Attestation;
  className?: string;
}

/** Authoritative attestation fields as recorded by the relayer and Chain B. */
export const AttestationDetails = ({ attestation, className }: AttestationDetailsProps) => {
  const sourceChain = getChainById(attestation.sourceChainId);
  const destChain = getChainById(attestation.destinationChainId);
  const verified = attestation.status === "verified" || attestation.status === "consumed";
  const explorerLink = explorerTxUrl(destChain, attestation.verificationTxHash);

  const stages = [
    { label: "Signed", timestamp: attestation.createdAt, complete: true },
    { label: "Transmitted", timestamp: attestation.transmittedAt, complete: attestation.transmittedAt !== null },
    { label: "Verified", timestamp: attestation.verifiedAt, complete: verified },
    {
      label: "Completed",
      timestamp: attestation.loanId ? attestation.verifiedAt : null,
      complete: attestation.loanId !== null,
    },
  ];

  return (
    <section className={cn("panel flex min-h-0 flex-col overflow-hidden", className)}>
      <header className="shrink-0 border-b border-border/50 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="display text-xl font-extrabold tracking-tight">Proof #{attestation.id}</h2>
          <StatusBadge
            tone={PROOF_STATUS_TONE[attestation.status]}
            label={PROOF_STATUS_LABEL[attestation.status]}
          />
        </div>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          {attestation.status === "failed"
            ? `Rejected by ${destChain?.name ?? "Chain B"}${attestation.failureReason ? ` — ${attestation.failureReason}` : ""}`
            : verified
              ? `Attestation verified on ${destChain?.name ?? "Chain B"}`
              : `Awaiting verification on ${destChain?.name ?? "Chain B"}`}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <dl className="divide-y divide-border/40">
          <DataField label="Collateral ID" value={`#${attestation.collateralId}`} mono copyValue={attestation.collateralId} />
          <DataField label="Source Chain" value={sourceChain?.name ?? String(attestation.sourceChainId)} />
          <DataField label="Destination Chain" value={destChain?.name ?? String(attestation.destinationChainId)} />
          <DataField
            label="Source Vault"
            value={shortAddress(attestation.sourceVault, 8, 6)}
            mono
            copyValue={attestation.sourceVault}
          />
          <DataField label="Owner" value={shortAddress(attestation.owner, 8, 6)} mono copyValue={attestation.owner} />
          <DataField label="Asset" value={attestation.assetSymbol} />
          <DataField
            label="Collateral Amount"
            value={formatToken(attestation.amount, attestation.assetSymbol, 4)}
          />
          <DataField label="State Version" value={String(attestation.stateVersion)} mono />
          {attestation.blockNumber !== null ? (
            <DataField label="Block Number" value={String(attestation.blockNumber)} mono />
          ) : null}
          <DataField label="Nonce" value={shortAddress(attestation.nonce, 10, 6)} mono copyValue={attestation.nonce} />
          <DataField label="Signer" value={shortAddress(attestation.signer, 10, 6)} mono copyValue={attestation.signer} />
          <DataField
            label="Signature"
            value={shortAddress(attestation.signature, 10, 6)}
            mono
            copyValue={attestation.signature}
          />
          <DataField label="Created At" value={formatDateTime(attestation.createdAt)} />
          {attestation.expiresAt ? (
            <DataField label="Expires At" value={formatDateTime(attestation.expiresAt)} />
          ) : null}
        </dl>

        {/* proof journey */}
        <div className="mt-6 border-t border-border/50 pt-5">
          <p className="label-tech mb-4">Proof Journey</p>
          <ol className="flex items-start">
            {stages.map((stage, index) => {
              const isLast = index === stages.length - 1;
              return (
                <li key={stage.label} className={cn("flex min-w-0 flex-col items-center", !isLast && "flex-1")}>
                  <div className="flex w-full items-center">
                    <div
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full border-2",
                        stage.complete
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground",
                      )}
                    >
                      {stage.complete ? (
                        <CheckCircle2 className="size-3" strokeWidth={3} aria-hidden />
                      ) : attestation.status === "failed" ? (
                        <XCircle className="size-3 text-destructive" strokeWidth={3} aria-hidden />
                      ) : (
                        <Clock className="size-3" aria-hidden />
                      )}
                    </div>
                    {!isLast ? (
                      <div
                        className={cn(
                          "mx-1 h-[2px] flex-1 rounded-full",
                          stages[index + 1].complete ? "bg-primary" : "bg-border/70",
                        )}
                      />
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      "mt-2 text-[9.5px] font-semibold uppercase tracking-[0.1em]",
                      stage.complete ? "text-foreground" : "text-muted-foreground/55",
                    )}
                  >
                    {stage.label}
                  </p>
                  <p className="mono mt-0.5 text-[9.5px] text-muted-foreground/70">
                    {stage.timestamp ? formatTime(stage.timestamp) : "—"}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>

        {explorerLink ? (
          <a
            href={explorerLink}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] text-primary transition-colors hover:text-primary/80"
          >
            View verification on explorer
            <ExternalLink className="size-3" aria-hidden />
          </a>
        ) : null}
      </div>
    </section>
  );
};

/** Verification tab content: the checks Chain B performed against this proof. */
export const VerificationReport = ({ attestation }: { attestation: Attestation }) => {
  const verified = attestation.status === "verified" || attestation.status === "consumed";
  const failed = attestation.status === "failed";
  const sourceChain = getChainById(attestation.sourceChainId);

  const checks: readonly { label: string; value: string; passed: boolean | null }[] = [
    { label: "Signature recovers trusted signer", value: shortAddress(attestation.signer, 6, 4), passed: verified ? true : failed ? false : null },
    { label: "Source chain matches Chain A", value: sourceChain?.shortName ?? String(attestation.sourceChainId), passed: verified ? true : null },
    { label: "Source vault is registered", value: shortAddress(attestation.sourceVault, 6, 4), passed: verified ? true : null },
    { label: "State version is current", value: String(attestation.stateVersion), passed: failed && attestation.failureReason === "StaleStateVersion" ? false : verified ? true : null },
    { label: "Nonce not previously consumed", value: shortAddress(attestation.nonce, 6, 4), passed: attestation.status === "consumed" ? true : verified ? true : null },
    { label: "Attestation within expiry window", value: attestation.expiresAt ? formatDateTime(attestation.expiresAt) : "—", passed: verified ? true : null },
  ];

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-lg border p-3",
          failed
            ? "border-destructive/30 bg-destructive/[0.05]"
            : verified
              ? "border-success/30 bg-success/[0.05]"
              : "border-border/60 bg-card/30",
        )}
      >
        {failed ? (
          <XCircle className="size-4 shrink-0 text-destructive" aria-hidden />
        ) : verified ? (
          <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
        ) : (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
        )}
        <p className={cn("text-[13px] font-semibold", failed ? "text-destructive" : verified ? "text-success" : "text-foreground")}>
          {failed ? "Verification failed" : verified ? "All checks passed" : "Verification pending"}
        </p>
      </div>

      <ul className="space-y-1.5">
        {checks.map((check) => (
          <li
            key={check.label}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2",
              check.passed === true
                ? "border-success/20 bg-success/[0.04]"
                : check.passed === false
                  ? "border-destructive/25 bg-destructive/[0.05]"
                  : "border-border/60 bg-card/30",
            )}
          >
            {check.passed === true ? (
              <CheckCircle2 className="size-3.5 shrink-0 text-success" aria-hidden />
            ) : check.passed === false ? (
              <XCircle className="size-3.5 shrink-0 text-destructive" aria-hidden />
            ) : (
              <Clock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <span className="min-w-0 flex-1 text-[12px] text-foreground/85">{check.label}</span>
            <span className="mono shrink-0 truncate text-[10.5px] text-muted-foreground">{check.value}</span>
          </li>
        ))}
      </ul>

      {failed && attestation.failureReason ? (
        <div className="rounded-lg border border-destructive/25 bg-destructive/[0.05] p-3">
          <p className="label-tech text-destructive/85">Reason code</p>
          <p className="mono mt-1 text-[12px] text-destructive">{attestation.failureReason}</p>
        </div>
      ) : null}
    </div>
  );
};

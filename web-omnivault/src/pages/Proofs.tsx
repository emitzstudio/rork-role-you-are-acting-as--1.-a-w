import { Download, FileCheck2, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingPanel } from "@/components/common/Skeletons";
import { AttestationDetails, VerificationReport } from "@/components/proofs/AttestationDetails";
import { JSONViewer } from "@/components/proofs/JSONViewer";
import { ProofList } from "@/components/proofs/ProofList";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProofs } from "@/hooks/useProtocolData";
import { cn } from "@/lib/utils";
import type { Attestation } from "@/types/protocol";

/** Serialize an attestation into the EIP-712 shape Chain B verifies. */
const toTypedData = (proof: Attestation) => ({
  attestation: {
    version: proof.stateVersion,
    nonce: proof.nonce,
    timestamp: proof.createdAt,
  },
  collateral: {
    id: proof.collateralId,
    asset: proof.assetSymbol,
    amount: String(proof.amount),
    chain: proof.sourceChainId,
    vault: proof.sourceVault,
    owner: proof.owner,
  },
  destination: {
    chain: proof.destinationChainId,
    verifyingContract: proof.domain.verifyingContract,
  },
  domain: {
    name: proof.domain.name,
    version: proof.domain.version,
    chainId: proof.domain.chainId,
    verifyingContract: proof.domain.verifyingContract,
  },
  signature: {
    signer: proof.signer,
    value: proof.signature,
  },
  metadata: {
    proofId: proof.id,
    status: proof.status,
    expiresAt: proof.expiresAt,
    loanId: proof.loanId,
  },
});

const Proofs = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data, isLoading, error, refetch } = useProofs();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);

  const collateralFilter = searchParams.get("collateral");

  const proofs = useMemo(() => {
    const all = data ?? [];
    return collateralFilter ? all.filter((proof) => proof.collateralId === collateralFilter) : all;
  }, [data, collateralFilter]);

  useEffect(() => {
    if (proofs.length === 0) {
      setSelectedId(null);
      return;
    }
    if (selectedId === null || !proofs.some((proof) => proof.id === selectedId)) {
      setSelectedId(proofs[0].id);
    }
  }, [proofs, selectedId]);

  const selected = proofs.find((proof) => proof.id === selectedId) ?? null;

  const stats = useMemo(() => {
    const all = data ?? [];
    return {
      total: all.length,
      verified: all.filter((proof) => proof.status === "verified" || proof.status === "consumed").length,
      pending: all.filter(
        (proof) => proof.status === "pending" || proof.status === "transmitted" || proof.status === "signed",
      ).length,
      failed: all.filter((proof) => proof.status === "failed").length,
    };
  }, [data]);

  const handleVerify = useCallback(async (): Promise<void> => {
    if (!selected) return;
    setVerifying(true);
    // Re-read the authoritative record rather than asserting a local result.
    await refetch();
    setVerifying(false);

    const isVerified = selected.status === "verified" || selected.status === "consumed";
    if (isVerified) {
      toast.success("Proof verified", {
        description: `Attestation #${selected.id} is recorded as verified on Chain B.`,
      });
    } else if (selected.status === "failed") {
      toast.error("Proof rejected", {
        description: selected.failureReason ?? "This attestation was rejected by the verifier.",
      });
    } else {
      toast.info("Verification pending", {
        description: "Chain B has not yet recorded a verification result for this attestation.",
      });
    }
  }, [selected, refetch]);

  const handleDownload = useCallback((): void => {
    if (!selected) return;
    const blob = new Blob([JSON.stringify(toTypedData(selected), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `omnivault-proof-${selected.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [selected]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cryptographic attestations"
        title="Proof Explorer"
        description="Inspect, verify and understand the cryptographic attestations that let Chain B trust collateral it never holds."
        aside={
          <dl className="flex gap-7">
            <StatTile label="Total Proofs" value={stats.total} />
            <StatTile label="Verified" value={stats.verified} tone="success" />
            <StatTile label="Pending" value={stats.pending} tone="warning" />
            <StatTile label="Failed" value={stats.failed} tone="danger" />
          </dl>
        }
      />

      {collateralFilter ? (
        <div className="flex items-center gap-3 rounded-lg border border-primary/25 bg-primary/[0.05] px-4 py-2.5">
          <p className="text-[12.5px] text-foreground/85">
            Filtered to attestations for collateral #{collateralFilter}
          </p>
          <Button variant="ghost" size="sm" onClick={() => navigate("/proofs")} className="ml-auto h-7 text-[12px]">
            Clear filter
          </Button>
        </div>
      ) : null}

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <LoadingPanel message="Loading attestations" rows={5} />
      ) : proofs.length === 0 ? (
        <EmptyState
          icon={FileCheck2}
          title="No attestations yet."
          description="Attestations are generated when you borrow against locked collateral. Each one proves your collateral's state without moving it."
          action={<Button onClick={() => navigate("/borrow")}>Start borrowing</Button>}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_380px] xl:items-start">
          <ProofList
            proofs={proofs}
            selectedId={selectedId}
            onSelect={setSelectedId}
            className="xl:max-h-[calc(100dvh-260px)]"
          />

          {selected ? (
            <>
              <AttestationDetails attestation={selected} className="xl:max-h-[calc(100dvh-260px)]" />

              <section className="panel flex min-h-0 flex-col overflow-hidden xl:max-h-[calc(100dvh-260px)]">
                <Tabs defaultValue="formatted" className="flex min-h-0 flex-1 flex-col">
                  <TabsList className="mx-4 mt-4 shrink-0 justify-start bg-card/50">
                    <TabsTrigger value="formatted" className="text-[12.5px]">
                      Formatted
                    </TabsTrigger>
                    <TabsTrigger value="raw" className="text-[12.5px]">
                      Raw JSON
                    </TabsTrigger>
                    <TabsTrigger value="verification" className="text-[12.5px]">
                      Verification
                    </TabsTrigger>
                  </TabsList>

                  <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    <TabsContent value="formatted" className="mt-0">
                      <p className="label-tech mb-3">Attestation (Formatted)</p>
                      <JSONViewer data={toTypedData(selected)} />
                    </TabsContent>
                    <TabsContent value="raw" className="mt-0">
                      <p className="label-tech mb-3">Raw Typed Data</p>
                      <JSONViewer data={toTypedData(selected)} raw />
                    </TabsContent>
                    <TabsContent value="verification" className="mt-0">
                      <p className="label-tech mb-3">Chain B Verification</p>
                      <VerificationReport attestation={selected} />
                    </TabsContent>
                  </div>
                </Tabs>

                <div className="flex shrink-0 gap-2 border-t border-border/50 p-4">
                  <Button onClick={handleVerify} disabled={verifying} className="flex-1 gap-2 text-[12.5px]">
                    <ShieldCheck className="size-3.5" aria-hidden />
                    {verifying ? "Checking…" : "Verify Proof"}
                  </Button>
                  <Button variant="outline" onClick={handleDownload} className="gap-2 text-[12.5px]">
                    <Download className="size-3.5" aria-hidden />
                    JSON
                  </Button>
                </div>
              </section>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

const StatTile = ({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning" | "danger";
}) => (
  <div>
    <dd
      className={cn(
        "display text-2xl font-extrabold num leading-none tracking-tight",
        tone === "success" && "text-success",
        tone === "warning" && "text-warning",
        tone === "danger" && "text-destructive",
      )}
    >
      {value}
    </dd>
    <dt className="label-tech mt-1.5">{label}</dt>
  </div>
);

export default Proofs;

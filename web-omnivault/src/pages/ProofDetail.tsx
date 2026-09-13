import { ArrowLeft, Download, ExternalLink, FileCheck2, ShieldCheck } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { CopyButton } from "@/components/common/CopyButton";
import { DataField } from "@/components/common/DataField";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingPanel } from "@/components/common/Skeletons";
import { StatusBadge } from "@/components/common/StatusBadge";
import { VerificationReport } from "@/components/proofs/AttestationDetails";
import { JSONViewer } from "@/components/proofs/JSONViewer";
import { PROOF_STATUS_LABEL, PROOF_STATUS_TONE } from "@/components/proofs/ProofList";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { explorerAddressUrl, explorerTxUrl, getChainById } from "@/config/chains";
import { useProof } from "@/hooks/useProtocolData";
import type { Attestation } from "@/types/protocol";
import { formatDateTime, formatToken, shortAddress } from "@/utils/format";

const buildTypedData = (proof: Attestation) => ({
  types: {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ],
    CollateralAttestation: [
      { name: "collateralId", type: "uint256" },
      { name: "owner", type: "address" },
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "sourceChainId", type: "uint256" },
      { name: "sourceVault", type: "address" },
      { name: "stateVersion", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ],
  },
  primaryType: "CollateralAttestation",
  domain: {
    name: proof.domain.name,
    version: proof.domain.version,
    chainId: proof.domain.chainId,
    verifyingContract: proof.domain.verifyingContract,
  },
  message: {
    collateralId: proof.collateralId,
    owner: proof.owner,
    asset: proof.assetSymbol,
    amount: String(proof.amount),
    sourceChainId: proof.sourceChainId,
    sourceVault: proof.sourceVault,
    stateVersion: proof.stateVersion,
    nonce: proof.nonce,
  },
  signature: proof.signature,
});

const ProofDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: proof, isLoading, error, refetch } = useProof(id);

  const typedData = useMemo(() => (proof ? buildTypedData(proof) : null), [proof]);

  const handleDownload = useCallback((): void => {
    if (!typedData || !proof) return;
    const blob = new Blob([JSON.stringify(typedData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `omnivault-attestation-${proof.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [typedData, proof]);

  if (error) {
    return (
      <div className="space-y-5">
        <BackLink onClick={() => navigate("/proofs")} />
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <BackLink onClick={() => navigate("/proofs")} />
        <LoadingPanel message="Loading attestation" rows={6} />
      </div>
    );
  }

  if (!proof || !typedData) {
    return (
      <div className="space-y-5">
        <BackLink onClick={() => navigate("/proofs")} />
        <EmptyState
          icon={FileCheck2}
          title="Attestation not found"
          description="This proof does not exist in the current protocol state."
          action={<Button onClick={() => navigate("/proofs")}>Back to Proof Explorer</Button>}
        />
      </div>
    );
  }

  const sourceChain = getChainById(proof.sourceChainId);
  const destChain = getChainById(proof.destinationChainId);
  const verificationLink = explorerTxUrl(destChain, proof.verificationTxHash);
  const verifierLink = explorerAddressUrl(destChain, proof.domain.verifyingContract);
  const vaultLink = explorerAddressUrl(sourceChain, proof.sourceVault);

  return (
    <div className="space-y-6">
      <BackLink onClick={() => navigate("/proofs")} />

      <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="label-tech mb-2 text-violet/85">EIP-712 attestation</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="display text-3xl font-extrabold tracking-tight">Proof #{proof.id}</h1>
            <StatusBadge tone={PROOF_STATUS_TONE[proof.status]} label={PROOF_STATUS_LABEL[proof.status]} />
          </div>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
            A signed statement about collateral #{proof.collateralId} on {sourceChain?.name ?? "Chain A"}. This proof
            travelled to {destChain?.name ?? "Chain B"} — the collateral itself never did.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {proof.loanId ? (
            <Button variant="outline" onClick={() => navigate(`/loans/${proof.loanId}`)}>
              View loan
            </Button>
          ) : null}
          <Button variant="outline" onClick={handleDownload} className="gap-2">
            <Download className="size-4" aria-hidden />
            Download JSON
          </Button>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* attestation + source state */}
        <section className="panel p-5">
          <h2 className="label-tech mb-2 text-foreground/85">Attested Collateral State</h2>
          <dl className="divide-y divide-border/40">
            <DataField label="Collateral ID" value={`#${proof.collateralId}`} mono />
            <DataField label="Owner" value={shortAddress(proof.owner, 8, 6)} mono copyValue={proof.owner} />
            <DataField label="Asset" value={proof.assetSymbol} />
            <DataField label="Amount" value={formatToken(proof.amount, proof.assetSymbol, 6)} />
            <DataField label="State Version" value={String(proof.stateVersion)} mono tone="accent" />
            {proof.blockNumber !== null ? (
              <DataField label="Block Number" value={String(proof.blockNumber)} mono />
            ) : null}
            <DataField label="Source Chain" value={`${sourceChain?.name ?? "—"} (${proof.sourceChainId})`} />
            <DataField
              label="Source Vault"
              value={shortAddress(proof.sourceVault, 8, 6)}
              mono
              copyValue={proof.sourceVault}
            />
            <DataField label="Created" value={formatDateTime(proof.createdAt)} />
            {proof.expiresAt ? <DataField label="Expires" value={formatDateTime(proof.expiresAt)} /> : null}
          </dl>

          {vaultLink ? (
            <a
              href={vaultLink}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] text-primary hover:text-primary/80"
            >
              View vault on explorer
              <ExternalLink className="size-3" aria-hidden />
            </a>
          ) : null}
        </section>

        {/* signature + destination verification */}
        <section className="panel p-5">
          <h2 className="label-tech mb-2 text-foreground/85">Signature & Destination Verification</h2>
          <dl className="divide-y divide-border/40">
            <DataField label="Domain Name" value={proof.domain.name} mono />
            <DataField label="Domain Version" value={proof.domain.version} mono />
            <DataField label="Domain Chain ID" value={String(proof.domain.chainId)} mono />
            <DataField
              label="Verifying Contract"
              value={shortAddress(proof.domain.verifyingContract, 8, 6)}
              mono
              copyValue={proof.domain.verifyingContract}
            />
            <DataField label="Signer" value={shortAddress(proof.signer, 8, 6)} mono copyValue={proof.signer} />
            <DataField label="Nonce" value={shortAddress(proof.nonce, 10, 6)} mono copyValue={proof.nonce} />
            <DataField
              label="Verification Status"
              value={PROOF_STATUS_LABEL[proof.status]}
              tone={
                proof.status === "verified" || proof.status === "consumed"
                  ? "success"
                  : proof.status === "failed"
                    ? "danger"
                    : "default"
              }
            />
            {proof.verifiedAt ? <DataField label="Verified At" value={formatDateTime(proof.verifiedAt)} /> : null}
          </dl>

          <div className="mt-4 rounded-lg border border-border/60 bg-background/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="label-tech">Signature</p>
              <CopyButton value={proof.signature} label="Copy signature" />
            </div>
            <p className="mono mt-2 break-all text-[10.5px] leading-relaxed text-muted-foreground">
              {proof.signature || "—"}
            </p>
          </div>

          {verificationLink ? (
            <a
              href={verificationLink}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] text-primary hover:text-primary/80"
            >
              View verification transaction
              <ExternalLink className="size-3" aria-hidden />
            </a>
          ) : verifierLink ? (
            <a
              href={verifierLink}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] text-primary hover:text-primary/80"
            >
              View verifier contract
              <ExternalLink className="size-3" aria-hidden />
            </a>
          ) : null}
        </section>
      </div>

      {/* technical investigation */}
      <section className="panel overflow-hidden">
        <Tabs defaultValue="verification">
          <TabsList className="mx-5 mt-5 justify-start bg-card/50">
            <TabsTrigger value="verification" className="gap-1.5 text-[12.5px]">
              <ShieldCheck className="size-3.5" aria-hidden />
              Verification
            </TabsTrigger>
            <TabsTrigger value="formatted" className="text-[12.5px]">
              Formatted
            </TabsTrigger>
            <TabsTrigger value="raw" className="text-[12.5px]">
              Raw Typed Data
            </TabsTrigger>
          </TabsList>

          <div className="p-5">
            <TabsContent value="verification" className="mt-0">
              <VerificationReport attestation={proof} />
            </TabsContent>
            <TabsContent value="formatted" className="mt-0">
              <JSONViewer data={typedData} />
            </TabsContent>
            <TabsContent value="raw" className="mt-0">
              <JSONViewer data={typedData} raw />
            </TabsContent>
          </div>
        </Tabs>
      </section>
    </div>
  );
};

const BackLink = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
  >
    <ArrowLeft className="size-3.5" aria-hidden />
    Back to Proof Explorer
  </button>
);

export default ProofDetail;

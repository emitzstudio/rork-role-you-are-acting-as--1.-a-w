import { ArrowDown, ArrowRight, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { CHAIN_A, CHAIN_B } from "@/config/chains";
import { cn } from "@/lib/utils";
import { ATTACK_SCENARIOS } from "@/services/mock/attackScenarios";

interface DocSection {
  readonly id: string;
  readonly title: string;
  readonly body: readonly string[];
}

const SECTIONS: readonly DocSection[] = [
  {
    id: "problem",
    title: "The Problem",
    body: [
      "Liquidity is fragmented across blockchains. To borrow on one chain against an asset held on another, users are normally forced to bridge — moving the asset itself across a trust boundary.",
      "Bridges concentrate value in a single contract, introduce wrapped-asset risk, and have historically been the largest source of losses in cross-chain systems. Moving the asset is the problem.",
    ],
  },
  {
    id: "solution",
    title: "The Solution",
    body: [
      "OmniVault never moves the asset. Collateral stays locked in a vault on its home chain. Instead of transferring value, the protocol transfers a cryptographic statement about that value.",
      "A trusted relayer reads the authoritative collateral state on Chain A and signs an EIP-712 attestation. That attestation — pure data — is transmitted to Chain B, which verifies the signature and issues a loan.",
      "Asset stays. Proof moves. Loan happens.",
    ],
  },
  {
    id: "chain-a",
    title: `Chain A — ${CHAIN_A.name}`,
    body: [
      "The CollateralVault contract holds user collateral and is the single source of truth for its state. Each position records an owner, asset, amount and a monotonically increasing state version.",
      "The state version increments on every change to a position. This is what makes replayed or outdated proofs detectable on the destination chain.",
    ],
  },
  {
    id: "chain-b",
    title: `Chain B — ${CHAIN_B.name}`,
    body: [
      "AttestationVerifier validates incoming attestations: signature recovery, source chain, source vault, state version, expiry, and nonce consumption.",
      "CrossChainLending consumes a verified attestation and issues the loan. It records the pledge so the same collateral can never back two loans simultaneously.",
    ],
  },
  {
    id: "attestation",
    title: "EIP-712 Attestation",
    body: [
      "The attestation is typed structured data signed by the relayer. Its domain binds it to a name, version, destination chain ID and the verifying contract address.",
      "Its message binds the collateral ID, owner, asset, amount, source chain ID, source vault, state version and a unique nonce. Changing any field invalidates the signature — there is no partial trust.",
    ],
  },
  {
    id: "relayer",
    title: "Trusted Relayer",
    body: [
      "The relayer is an off-chain Node.js service that observes Chain A, produces signed attestations, and submits them to Chain B. It orchestrates; it does not custody.",
      "The relayer cannot fabricate collateral: any attestation it signs must match state that Chain B independently validates against the registered vault and chain. A compromised relayer cannot mint collateral that does not exist on Chain A.",
    ],
  },
  {
    id: "verification",
    title: "Verification",
    body: [
      "On arrival, Chain B recovers the signer from the typed data digest and compares it against the authorized relayer key. It then checks the source chain ID and source vault against its own configuration.",
      "Only after all checks pass is the attestation marked consumed and the loan issued. Verification failures revert with a specific reason code.",
    ],
  },
  {
    id: "replay",
    title: "Replay Protection",
    body: [
      "Every attestation carries a unique nonce. Once consumed, that nonce is permanently recorded on Chain B.",
      "Presenting the same attestation a second time reverts with AttestationAlreadyConsumed, regardless of how much time has passed.",
    ],
  },
  {
    id: "double-pledge",
    title: "Double Pledge Protection",
    body: [
      "When a loan is issued, the backing collateral is marked as pledged. Any attempt to borrow against it again reverts with CollateralAlreadyPledged.",
      "The frontend reflects this by disabling borrowing on pledged positions, but the contract remains the final authority.",
    ],
  },
  {
    id: "stale",
    title: "Stale Proof Protection",
    body: [
      "Attestations reference the state version they were generated against, and carry an expiry window.",
      "If the underlying collateral changes after signing, the attested version falls behind and the proof reverts with StaleStateVersion. A fresh attestation must be generated.",
    ],
  },
  {
    id: "borrowing",
    title: "Borrowing",
    body: [
      "Borrowing power is derived from the collateral's value and the protocol's maximum loan-to-value ratio, minus any existing debt against that position.",
      "The borrower chooses which collateral to use and how much to borrow. Nothing is selected or sized automatically.",
    ],
  },
  {
    id: "lifecycle",
    title: "Loan Lifecycle",
    body: [
      "Locked → Attested → Verified → Borrowed → Repaid → Unlocked.",
      "Each stage is a real, observable protocol event. The interface only illuminates stages that actually occurred on-chain or in the relayer record.",
    ],
  },
  {
    id: "architecture",
    title: "Architecture",
    body: [
      "The frontend is a read-and-request layer. It displays protocol state, requests operations, and visualises the flow — it is never authoritative.",
      "Authority is split: Chain A owns collateral state, the relayer orchestrates cross-chain delivery, and Chain B owns verification and lending state.",
    ],
  },
  {
    id: "limitations",
    title: "Limitations",
    body: [
      "The relayer is a trusted component for liveness: if it is offline, new attestations cannot be produced. It is not trusted for safety — it cannot forge collateral that Chain B will accept.",
      "This deployment targets testnets. Valuations depend on an available price source; where none exists, borrowing power is reported as unavailable rather than estimated.",
    ],
  },
];

const Docs = () => {
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);

  const sectionIds = useMemo(() => SECTIONS.map((section) => section.id), []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [sectionIds]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Technical documentation"
        title="How OmniVault Works"
        description="A complete description of the protocol: what it solves, how attestations replace asset movement, and exactly which attacks the contracts reject."
      />

      {/* architecture diagram */}
      <section className="panel overflow-hidden p-5 lg:p-7" aria-label="Protocol architecture">
        <div className="pointer-events-none absolute inset-0 grid-field opacity-40" aria-hidden />
        <h2 className="label-tech relative mb-6 text-foreground/85">Architecture</h2>

        <div className="relative flex flex-col items-center gap-2">
          <DiagramNode
            title={`Chain A — ${CHAIN_A.name}`}
            subtitle="CollateralVault · Authoritative collateral state"
            tone="primary"
          />
          <DiagramArrow label="Reads authoritative state" />
          <DiagramNode
            title="Backend · Trusted Relayer"
            subtitle="Signs EIP-712 attestation of collateral state"
            tone="violet"
          />
          <DiagramArrow label="Transmits proof — not the asset" emphasised />
          <DiagramNode
            title={`Chain B — ${CHAIN_B.name}`}
            subtitle="AttestationVerifier → CrossChainLending"
            tone="accent"
          />
          <DiagramArrow label="Issues loan" />
          <DiagramNode title="Loan" subtitle="Funds delivered to the borrower on Chain B" tone="success" />
        </div>

        <p className="relative mt-7 flex items-center justify-center gap-2 rounded-lg border border-primary/25 bg-primary/[0.05] px-4 py-3 text-center text-[13px] font-medium">
          <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden />
          The collateral does not move between chains. Only the proof does.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
        {/* contents */}
        <nav aria-label="Documentation contents" className="panel sticky top-20 hidden p-3 lg:block">
          <p className="label-tech mb-2 px-2">Contents</p>
          <ul className="space-y-0.5">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className={cn(
                    "block truncate rounded-md px-2 py-1.5 text-[12.5px] transition-colors",
                    activeId === section.id
                      ? "bg-primary/[0.1] font-medium text-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {section.title}
                </a>
              </li>
            ))}
            <li>
              <a
                href="#security"
                className={cn(
                  "block truncate rounded-md px-2 py-1.5 text-[12.5px] transition-colors",
                  activeId === "security"
                    ? "bg-primary/[0.1] font-medium text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                Security
              </a>
            </li>
          </ul>
        </nav>

        {/* prose */}
        <div className="min-w-0 space-y-4">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="panel scroll-mt-20 p-5 lg:p-6">
              <h2 className="display text-xl font-bold tracking-tight">{section.title}</h2>
              <div className="mt-3 space-y-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-[14px] leading-relaxed text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}

          <section id="security" className="panel scroll-mt-20 p-5 lg:p-6">
            <h2 className="display text-xl font-bold tracking-tight">Security</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
              The protocol rejects the following attack classes. Each maps to a specific contract revert reason.
            </p>
            <ul className="mt-4 space-y-2">
              {ATTACK_SCENARIOS.map((scenario) => (
                <li
                  key={scenario.id}
                  className="flex flex-col gap-1 rounded-lg border border-border/60 bg-card/30 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
                >
                  <span className="shrink-0 text-[13px] font-semibold sm:w-[180px]">{scenario.title}</span>
                  <span className="min-w-0 flex-1 text-[12.5px] text-muted-foreground">{scenario.protection}</span>
                  <code className="mono shrink-0 text-[10.5px] uppercase tracking-wider text-success">
                    {scenario.reasonCode}
                  </code>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

const TONE_STYLES = {
  primary: "border-primary/30 bg-primary/[0.06]",
  violet: "border-violet/30 bg-violet/[0.06]",
  accent: "border-accent/30 bg-accent/[0.06]",
  success: "border-success/30 bg-success/[0.06]",
} as const;

const DiagramNode = ({
  title,
  subtitle,
  tone,
}: {
  title: string;
  subtitle: string;
  tone: keyof typeof TONE_STYLES;
}) => (
  <div className={cn("w-full max-w-md rounded-xl border px-5 py-3.5 text-center", TONE_STYLES[tone])}>
    <p className="display text-[14px] font-bold tracking-tight">{title}</p>
    <p className="mt-1 text-[11.5px] text-muted-foreground">{subtitle}</p>
  </div>
);

const DiagramArrow = ({ label, emphasised = false }: { label: string; emphasised?: boolean }) => (
  <div className="flex flex-col items-center gap-1 py-1">
    <ArrowDown className={cn("size-4", emphasised ? "text-accent" : "text-muted-foreground/60")} aria-hidden />
    <span
      className={cn(
        "mono text-[10px] uppercase tracking-[0.14em]",
        emphasised ? "text-accent" : "text-muted-foreground/70",
      )}
    >
      {label}
    </span>
  </div>
);

export default Docs;

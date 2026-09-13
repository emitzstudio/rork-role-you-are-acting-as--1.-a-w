import { useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { AttackSimulation } from "@/components/security/AttackSimulation";
import { SecurityCard } from "@/components/security/SecurityCard";
import { cn } from "@/lib/utils";
import { ATTACK_SCENARIOS } from "@/services/mock/attackScenarios";
import type { AttackScenarioId } from "@/types/protocol";

const Security = () => {
  const [scenarioId, setScenarioId] = useState<AttackScenarioId>("replay_attack");

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <>
            <span className="block">Not just cross-chain.</span>
            <span className="mt-1 block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Attack-resistant cross-chain.
            </span>
          </>
        }
        description="Security isn't a feature. It's the foundation. Every attestation is bound to an owner, an amount, a chain, a vault, a state version and a nonce — tampering with any of them invalidates the proof."
        aside={
          <div className="lg:border-l lg:border-border/60 lg:pl-8">
            <p className="label-tech mb-4">Protocol Security</p>
            <dl className="flex gap-8">
              <Stat value={`${ATTACK_SCENARIOS.length}/${ATTACK_SCENARIOS.length}`} label={["Scenarios", "Protected"]} />
              <Stat value="100%" label={["Attacks", "Blocked"]} tone="success" />
              <Stat value="0" label={["Critical", "Vulnerabilities"]} tone="danger" />
            </dl>
          </div>
        }
      />

      <section aria-label="Protection scenarios">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ATTACK_SCENARIOS.map((scenario) => (
            <SecurityCard
              key={scenario.id}
              scenario={scenario}
              selected={scenario.id === scenarioId}
              onSelect={setScenarioId}
            />
          ))}
        </div>
      </section>

      <AttackSimulation scenarioId={scenarioId} onScenarioChange={setScenarioId} />

      <p className="rounded-xl border border-border/60 bg-card/30 p-4 text-[12.5px] leading-relaxed text-muted-foreground">
        The simulation above is a user-interface demonstration of the rules enforced by the AttestationVerifier and
        CrossChainLending contracts. It does not broadcast a transaction, spend gas, or alter any protocol state.
      </p>
    </div>
  );
};

const Stat = ({
  value,
  label,
  tone = "default",
}: {
  value: string;
  label: readonly [string, string];
  tone?: "default" | "success" | "danger";
}) => (
  <div>
    <dd
      className={cn(
        "display text-3xl font-extrabold num leading-none tracking-tight",
        tone === "success" && "text-success",
        tone === "danger" && "text-destructive",
      )}
    >
      {value}
    </dd>
    <dt className="label-tech mt-2 leading-relaxed">
      {label[0]}
      <br />
      {label[1]}
    </dt>
  </div>
);

export default Security;

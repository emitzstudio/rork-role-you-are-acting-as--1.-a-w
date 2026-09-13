import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, Play, ShieldCheck, XCircle } from "lucide-react";
import { useCallback, useState } from "react";

import { CopyButton } from "@/components/common/CopyButton";
import { SCENARIO_ICON } from "@/components/security/SecurityCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSessionOwner } from "@/hooks/useProtocolData";
import { cn } from "@/lib/utils";
import { getServices } from "@/services";
import { ATTACK_SCENARIOS, getScenario } from "@/services/mock/attackScenarios";
import type { AttackScenarioId, SimulationLogEntry, SimulationResult } from "@/types/protocol";
import { formatTime } from "@/utils/format";

interface AttackSimulationProps {
  scenarioId: AttackScenarioId;
  onScenarioChange: (id: AttackScenarioId) => void;
  className?: string;
}

/**
 * A clearly-labelled demonstration of the protocol's protection rules.
 * It never submits a transaction and never claims a live on-chain event occurred.
 */
export const AttackSimulation = ({ scenarioId, onScenarioChange, className }: AttackSimulationProps) => {
  const { mode } = useSessionOwner();
  const [log, setLog] = useState<readonly SimulationLogEntry[]>([]);
  const [running, setRunning] = useState<boolean>(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const scenario = getScenario(scenarioId);
  const Icon = SCENARIO_ICON[scenarioId];

  const handleRun = useCallback(async (): Promise<void> => {
    setRunning(true);
    setResult(null);
    setLog([]);

    const outcome = await getServices(mode).security.runSimulation(scenarioId, (label, status) => {
      setLog((previous) => {
        const existingIndex = previous.findIndex((entry) => entry.label === label);
        const entry: SimulationLogEntry = { label, status, timestamp: new Date().toISOString() };
        if (existingIndex === -1) return [...previous, entry];
        const next = [...previous];
        next[existingIndex] = entry;
        return next;
      });
    });

    setResult(outcome);
    setRunning(false);
  }, [mode, scenarioId]);

  const handleScenarioChange = useCallback(
    (value: string): void => {
      onScenarioChange(value as AttackScenarioId);
      setLog([]);
      setResult(null);
    },
    [onScenarioChange],
  );

  return (
    <section className={cn("panel overflow-hidden", className)} aria-label="Attack simulation">
      <div className="pointer-events-none absolute inset-0 grid-field opacity-40" aria-hidden />

      <header className="relative flex flex-wrap items-start gap-3 p-5">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/[0.08]">
          <Play className="size-[18px] text-primary" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="display text-lg font-extrabold uppercase tracking-tight">Demo Simulation</h2>
            <span className="rounded-md border border-warning/45 bg-warning/10 px-2 py-[3px] text-[9.5px] font-bold uppercase tracking-[0.14em] text-warning">
              UI demonstration
            </span>
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Test attack scenarios against the protocol&apos;s security checks. No transaction is submitted — this
            demonstrates the rules the contracts enforce on-chain.
          </p>
        </div>
      </header>

      <div className="relative grid gap-5 border-t border-border/50 p-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* control + log */}
        <div className="min-w-0">
          <p className="label-tech mb-2.5">Attack Scenario</p>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Select value={scenarioId} onValueChange={handleScenarioChange} disabled={running}>
              <SelectTrigger className="h-11 flex-1 text-[13.5px]" aria-label="Select attack scenario">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ATTACK_SCENARIOS.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {entry.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleRun} disabled={running} className="h-11 gap-2 px-6 font-semibold">
              {running ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Play className="size-4" aria-hidden />}
              {running ? "Running…" : "Run Attack Simulation"}
            </Button>
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-border/60 bg-card/30 p-3">
            <Icon className="mt-px size-4 shrink-0 text-primary" aria-hidden />
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">{scenario.protection}</p>
          </div>

          {/* live log */}
          <div
            className={cn(
              "mt-4 min-h-[200px] rounded-xl border border-l-2 border-border/60 border-l-primary/60 bg-background/60 p-4",
              log.length === 0 && "grid place-items-center",
            )}
            role="log"
            aria-live="polite"
          >
            {log.length === 0 ? (
              <p className="text-center text-[12.5px] text-muted-foreground">
                Select a scenario and run the simulation to see how the protocol responds.
              </p>
            ) : (
              <ul className="space-y-2.5">
                <AnimatePresence initial={false}>
                  {log.map((entry) => (
                    <motion.li
                      key={entry.label}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2.5"
                    >
                      {entry.status === "running" ? (
                        <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
                      ) : entry.status === "passed" ? (
                        <span className="grid size-4 shrink-0 place-items-center rounded-full bg-success/15">
                          <CheckCircle2 className="size-3.5 text-success" aria-hidden />
                        </span>
                      ) : (
                        <span className="grid size-4 shrink-0 place-items-center rounded-full bg-destructive/15">
                          <XCircle className="size-3.5 text-destructive" aria-hidden />
                        </span>
                      )}
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-[12.5px]",
                          entry.status === "blocked" ? "font-medium text-destructive" : "text-foreground/85",
                        )}
                      >
                        {entry.label}
                      </span>
                      <span className="mono shrink-0 text-[10.5px] text-muted-foreground">
                        {formatTime(entry.timestamp)}
                      </span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </div>

        {/* verdict */}
        <div className="space-y-3">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key={result.scenarioId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-xl border border-destructive/35 bg-destructive/[0.06] p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-full border border-destructive/40 bg-destructive/15">
                    <XCircle className="size-5 text-destructive" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="display text-xl font-extrabold uppercase tracking-tight text-destructive">Rejected</p>
                    <p className="text-[12.5px] text-muted-foreground">The attack was blocked by the protocol.</p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="label-tech mb-1.5">Reason Code</p>
                  <div className="flex items-center gap-1.5 rounded-lg border border-destructive/25 bg-background/50 px-3 py-2">
                    <code className="mono min-w-0 flex-1 truncate text-[12px] text-destructive">
                      {result.reasonCode}
                    </code>
                    <CopyButton value={result.reasonCode} label="Copy reason code" />
                  </div>
                </div>

                <p className="mt-3 text-[12.5px] leading-relaxed text-foreground/85">{result.explanation}</p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {result ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="rounded-xl border border-success/30 bg-success/[0.05] p-4"
            >
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-px size-4 shrink-0 text-success" aria-hidden />
                <div>
                  <p className="display text-[13px] font-bold uppercase tracking-wide text-success">
                    Security check passed
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                    The protocol correctly identified and rejected this attack attempt.
                  </p>
                </div>
              </div>
            </motion.div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

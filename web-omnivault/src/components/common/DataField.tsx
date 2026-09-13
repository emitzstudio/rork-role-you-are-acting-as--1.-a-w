import type { ReactNode } from "react";

import { CopyButton } from "@/components/common/CopyButton";
import { cn } from "@/lib/utils";

interface DataFieldProps {
  label: string;
  value: ReactNode;
  mono?: boolean;
  copyValue?: string;
  className?: string;
  tone?: "default" | "accent" | "success" | "danger";
}

const TONE_CLASS = {
  default: "text-foreground",
  accent: "text-primary",
  success: "text-success",
  danger: "text-destructive",
} as const;

/** Label/value row used across attestation details, loans, and vault metadata. */
export const DataField = ({ label, value, mono = false, copyValue, className, tone = "default" }: DataFieldProps) => (
  <div className={cn("flex items-center justify-between gap-4 py-2.5", className)}>
    <dt className="shrink-0 text-[13px] text-muted-foreground">{label}</dt>
    <dd className="flex min-w-0 items-center gap-1.5">
      <span className={cn("truncate text-[13px] font-medium num", mono && "mono text-xs", TONE_CLASS[tone])}>
        {value}
      </span>
      {copyValue ? <CopyButton value={copyValue} label={`Copy ${label}`} /> : null}
    </dd>
  </div>
);

interface MetricProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "accent" | "success" | "danger" | "warning";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const METRIC_TONE = {
  default: "text-foreground",
  accent: "text-primary",
  success: "text-success",
  danger: "text-destructive",
  warning: "text-warning",
} as const;

const METRIC_SIZE = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-[2rem] leading-none",
} as const;

export const Metric = ({ label, value, sub, tone = "default", size = "md", className }: MetricProps) => (
  <div className={cn("min-w-0", className)}>
    <p className="label-tech">{label}</p>
    <p className={cn("display mt-2 font-bold num tracking-tight", METRIC_SIZE[size], METRIC_TONE[tone])}>{value}</p>
    {sub ? <div className="mt-1.5 text-xs text-muted-foreground">{sub}</div> : null}
  </div>
);

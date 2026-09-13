import { AlertOctagon, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toFriendlyError } from "@/utils/errors";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

/** Explains WHAT happened, WHY, and WHAT NEXT. Never renders a raw stack trace. */
export const ErrorState = ({ error, onRetry, className, compact = false }: ErrorStateProps) => {
  const friendly = toFriendlyError(error);

  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border border-destructive/25 bg-destructive/[0.05] p-5",
        compact ? "p-4" : "p-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-destructive/30 bg-destructive/10">
          <AlertOctagon className="size-4 text-destructive" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-destructive">{friendly.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-foreground/80">{friendly.what}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{friendly.next}</p>
          <p className="mono mt-2 text-[11px] uppercase tracking-wider text-muted-foreground/70">{friendly.code}</p>
          {onRetry && friendly.recoverable ? (
            <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={onRetry}>
              <RefreshCw className="size-3.5" aria-hidden />
              Retry
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

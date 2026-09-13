import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export const Shimmer = ({ className }: SkeletonProps) => (
  <div className={cn("shimmer rounded-md bg-muted/40", className)} aria-hidden />
);

interface LoadingPanelProps {
  message: string;
  rows?: number;
  className?: string;
}

/** Polished protocol-flavoured loading state. Never a blank screen. */
export const LoadingPanel = ({ message, rows = 3, className }: LoadingPanelProps) => (
  <div className={cn("panel p-6", className)} role="status" aria-live="polite">
    <div className="flex items-center gap-2.5">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
        <span className="relative inline-flex size-2 rounded-full bg-primary" />
      </span>
      <p className="mono text-xs uppercase tracking-[0.16em] text-muted-foreground">{message}</p>
    </div>
    <div className="mt-5 space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Shimmer key={index} className={cn("h-4", index % 3 === 0 ? "w-full" : index % 3 === 1 ? "w-4/5" : "w-2/3")} />
      ))}
    </div>
  </div>
);

export const CardSkeletonGrid = ({ count = 3, className }: { count?: number; className?: string }) => (
  <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)} role="status" aria-label="Loading">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="panel p-5">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="mt-4 h-8 w-32" />
        <Shimmer className="mt-3 h-3 w-full" />
        <Shimmer className="mt-2 h-3 w-3/4" />
      </div>
    ))}
  </div>
);

export const RowSkeletonList = ({ count = 5, className }: { count?: number; className?: string }) => (
  <div className={cn("space-y-2", className)} role="status" aria-label="Loading">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="panel-flat flex items-center gap-4 p-4">
        <Shimmer className="size-9 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Shimmer className="h-3 w-1/3" />
          <Shimmer className="h-3 w-1/5" />
        </div>
        <Shimmer className="h-6 w-20 rounded-full" />
      </div>
    ))}
  </div>
);

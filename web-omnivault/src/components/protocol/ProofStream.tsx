import { motion } from "framer-motion";
import { useMemo } from "react";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";

interface ProofStreamProps {
  /** Whether data is actively travelling along this segment. */
  active: boolean;
  /** Whether the segment has already been traversed successfully. */
  complete: boolean;
  direction?: "right" | "down";
  className?: string;
  particleCount?: number;
}

/**
 * The light-trail that carries the PROOF between chains.
 * The collateral itself never travels along this stream.
 */
export const ProofStream = ({
  active,
  complete,
  direction = "right",
  className,
  particleCount = 7,
}: ProofStreamProps) => {
  const reduced = useAppStore((state) => state.motion) === "reduced";
  const horizontal = direction === "right";

  const particles = useMemo(
    () => Array.from({ length: particleCount }, (_, index) => index / particleCount),
    [particleCount],
  );

  const lineTone = complete
    ? "bg-success/50"
    : active
      ? "bg-primary/45"
      : "bg-border/70";

  return (
    <div
      className={cn("relative", horizontal ? "h-px w-full" : "h-full w-px", className)}
      aria-hidden
    >
      {/* base rail */}
      <div className={cn("absolute inset-0 rounded-full", lineTone)} />

      {/* dashed pending rail */}
      {!active && !complete ? (
        <div
          className={cn(
            "absolute inset-0",
            horizontal
              ? "bg-[repeating-linear-gradient(to_right,hsl(var(--border))_0_6px,transparent_6px_12px)]"
              : "bg-[repeating-linear-gradient(to_bottom,hsl(var(--border))_0_6px,transparent_6px_12px)]",
          )}
        />
      ) : null}

      {/* energised glow */}
      {(active || complete) && (
        <div
          className={cn(
            "absolute rounded-full blur-[3px]",
            horizontal ? "inset-x-0 -inset-y-[2px]" : "inset-y-0 -inset-x-[2px]",
            complete ? "bg-success/35" : "bg-primary/40",
          )}
        />
      )}

      {/* travelling proof fragments */}
      {active && !reduced
        ? particles.map((offset, index) => (
            <motion.span
              key={index}
              className={cn(
                "absolute rounded-full bg-cyan-300",
                horizontal ? "top-1/2 size-[3px] -translate-y-1/2" : "left-1/2 size-[3px] -translate-x-1/2",
              )}
              style={{
                boxShadow: "0 0 8px 1px hsl(187 85% 60% / 0.9)",
              }}
              initial={horizontal ? { left: "0%", opacity: 0 } : { top: "0%", opacity: 0 }}
              animate={
                horizontal
                  ? { left: ["0%", "100%"], opacity: [0, 1, 1, 0] }
                  : { top: ["0%", "100%"], opacity: [0, 1, 1, 0] }
              }
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
                delay: offset * 1.5,
              }}
            />
          ))
        : null}
    </div>
  );
};

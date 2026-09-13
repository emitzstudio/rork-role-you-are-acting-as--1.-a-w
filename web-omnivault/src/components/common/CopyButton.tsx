import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/utils/format";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

export const CopyButton = ({ value, label = "Copy", className }: CopyButtonProps) => {
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = useCallback(async (): Promise<void> => {
    const ok = await copyToClipboard(value);
    if (ok) setCopied(true);
  }, [value]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied" : label}
      className={cn(
        "inline-grid size-6 shrink-0 place-items-center rounded-md border border-transparent text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary",
        className,
      )}
    >
      {copied ? <Check className="size-3 text-success" aria-hidden /> : <Copy className="size-3" aria-hidden />}
    </button>
  );
};

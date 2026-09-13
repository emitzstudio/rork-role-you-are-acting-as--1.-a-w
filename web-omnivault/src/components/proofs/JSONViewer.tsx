import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

import { CopyButton } from "@/components/common/CopyButton";
import { cn } from "@/lib/utils";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface JSONViewerProps {
  data: JsonValue;
  /** Raw mode renders a syntax-highlighted document instead of a collapsible tree. */
  raw?: boolean;
  className?: string;
}

/** Collapsible attestation viewer with formatted and raw JSON presentations. */
export const JSONViewer = ({ data, raw = false, className }: JSONViewerProps) => {
  const serialized = useMemo(() => JSON.stringify(data, null, 2), [data]);

  if (raw) {
    return (
      <div className={cn("relative", className)}>
        <CopyButton value={serialized} label="Copy raw JSON" className="absolute right-0 top-0 z-10" />
        <pre className="mono overflow-x-auto rounded-lg border border-border/60 bg-background/60 p-4 text-[11.5px] leading-relaxed">
          <code>{highlight(serialized)}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <CopyButton value={serialized} label="Copy JSON" className="absolute right-0 top-0 z-10" />
      <div className="mono overflow-x-auto rounded-lg border border-border/60 bg-background/60 p-4 text-[11.5px] leading-relaxed">
        <JsonNode name={null} value={data} depth={0} defaultOpen />
      </div>
    </div>
  );
};

/** Minimal token highlighter for the raw JSON view. */
const highlight = (json: string): React.ReactNode[] =>
  json.split("\n").map((line, index) => {
    const match = line.match(/^(\s*)("[^"]+")(\s*:\s*)(.*)$/);
    if (!match) {
      return (
        <div key={index} className="text-foreground/70">
          {line}
        </div>
      );
    }
    const [, indent, key, separator, value] = match;
    const isString = value.trim().startsWith('"');
    const isNumber = /^-?\d/.test(value.trim());
    const isBool = /^(true|false|null)/.test(value.trim());

    return (
      <div key={index}>
        <span>{indent}</span>
        <span className="text-accent">{key}</span>
        <span className="text-muted-foreground">{separator}</span>
        <span
          className={cn(
            isString && "text-success/90",
            isNumber && "text-primary",
            isBool && "text-violet",
            !isString && !isNumber && !isBool && "text-foreground/70",
          )}
        >
          {value}
        </span>
      </div>
    );
  });

interface JsonNodeProps {
  name: string | null;
  value: JsonValue;
  depth: number;
  defaultOpen?: boolean;
}

const JsonNode = ({ name, value, depth, defaultOpen = false }: JsonNodeProps) => {
  const [open, setOpen] = useState<boolean>(defaultOpen || depth < 2);

  const isObject = value !== null && typeof value === "object" && !Array.isArray(value);
  const isArray = Array.isArray(value);

  if (!isObject && !isArray) {
    return (
      <div style={{ paddingLeft: depth * 14 }} className="flex gap-1.5">
        {name !== null ? <span className="text-accent">{name}:</span> : null}
        <span
          className={cn(
            typeof value === "string" && "text-success/90",
            typeof value === "number" && "text-primary",
            (typeof value === "boolean" || value === null) && "text-violet",
          )}
        >
          {typeof value === "string" ? `"${value}"` : String(value)}
        </span>
      </div>
    );
  }

  const entries: [string, JsonValue][] = isArray
    ? (value as JsonValue[]).map((item, index) => [String(index), item])
    : Object.entries(value as Record<string, JsonValue>);

  return (
    <div style={{ paddingLeft: depth * 14 }}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex items-center gap-1 rounded px-0.5 text-left transition-colors hover:bg-primary/5"
      >
        <ChevronDown
          className={cn("size-3 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")}
          aria-hidden
        />
        {name !== null ? <span className="text-accent">{name}</span> : <span className="text-muted-foreground">root</span>}
        {!open ? (
          <span className="text-muted-foreground/60">
            {isArray ? `[${entries.length}]` : `{${entries.length}}`}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="mt-0.5">
          {entries.map(([key, child]) => (
            <JsonNode key={key} name={key} value={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

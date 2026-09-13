/** Presentation helpers. All values arriving here are already normalized domain data. */

export const shortAddress = (address: string | null | undefined, lead = 6, tail = 4): string => {
  if (!address) return "—";
  if (address.length <= lead + tail + 2) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
};

export const shortHash = (hash: string | null | undefined): string => shortAddress(hash, 10, 6);

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdPreciseFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatUsd = (value: number | null | undefined, precise = false): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return precise ? usdPreciseFormatter.format(value) : usdFormatter.format(value);
};

export const formatAmount = (value: number | null | undefined, maxDecimals = 4): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: maxDecimals }).format(value);
};

export const formatToken = (value: number | null | undefined, symbol: string, maxDecimals = 4): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${formatAmount(value, maxDecimals)} ${symbol}`;
};

export const formatPercent = (ratio: number | null | undefined, decimals = 0): string => {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return "—";
  return `${(ratio * 100).toFixed(decimals)}%`;
};

export const formatHealthFactor = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (!Number.isFinite(value)) return "∞";
  return value.toFixed(2);
};

export const healthTone = (value: number | null | undefined): "success" | "warning" | "destructive" | "muted" => {
  if (value === null || value === undefined || Number.isNaN(value)) return "muted";
  if (value >= 1.5) return "success";
  if (value >= 1.15) return "warning";
  return "destructive";
};

export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}, ${date.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })} UTC`;
};

export const formatTime = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

export const relativeTime = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const deltaSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(deltaSeconds);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60) return formatter.format(Math.round(deltaSeconds), "second");
  if (abs < 3600) return formatter.format(Math.round(deltaSeconds / 60), "minute");
  if (abs < 86400) return formatter.format(Math.round(deltaSeconds / 3600), "hour");
  return formatter.format(Math.round(deltaSeconds / 86400), "day");
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

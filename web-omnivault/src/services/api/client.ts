import { env, isBackendConfigured } from "@/config/env";

export class BackendUnavailableError extends Error {
  constructor(message = "Protocol service unavailable") {
    super(message);
    this.name = "BackendUnavailableError";
  }
}

export class BackendNotConfiguredError extends Error {
  constructor() {
    super("Backend API URL is not configured");
    this.name = "BackendNotConfiguredError";
  }
}

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions {
  readonly method?: "GET" | "POST";
  readonly body?: unknown;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}

/**
 * Thin REST client for the existing OmniVault relayer backend.
 * Endpoints: /health, /collateral/:id, /loan/:id, /relayer/status, /relay/:id, /activity
 */
export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  if (!isBackendConfigured()) throw new BackendNotConfiguredError();

  const { method = "GET", body, signal, timeoutMs = 15000 } = options;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  const onAbort = (): void => controller.abort();
  signal?.addEventListener("abort", onAbort);

  try {
    const response = await fetch(`${env.apiBaseUrl.replace(/\/$/, "")}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      let detail = `Request failed with status ${response.status}`;
      try {
        const payload = (await response.json()) as { error?: string; message?: string };
        detail = payload.error ?? payload.message ?? detail;
      } catch {
        /* response body was not JSON — keep the generic detail */
      }
      throw new ApiError(response.status, detail);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new BackendUnavailableError(error instanceof Error ? error.message : "Network request failed");
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
};

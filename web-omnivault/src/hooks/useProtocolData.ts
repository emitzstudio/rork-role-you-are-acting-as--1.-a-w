import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { getServices } from "@/services";
import { useAppStore } from "@/stores/useAppStore";
import { useWalletStore } from "@/stores/useWalletStore";
import type {
  ActivityEvent,
  Attestation,
  BorrowingPower,
  CollateralPosition,
  DataMode,
  Loan,
  ProtocolVerification,
  SystemStatus,
  WalletBalance,
} from "@/types/protocol";

/** Identity used for all data reads. Demo sessions use the isolated demo owner. */
export const useSessionOwner = (): { owner: string | null; mode: DataMode } => {
  const mode = useAppStore((state) => state.mode);
  const address = useWalletStore((state) => state.address);
  const demoSession = useWalletStore((state) => state.demoSession);

  // In demo mode the mock services ignore the owner argument entirely.
  const owner = mode === "demo" || demoSession ? "demo" : address;
  const effectiveMode: DataMode = mode === "demo" || demoSession ? "demo" : "live";
  return { owner, mode: effectiveMode };
};

export const protocolKeys = {
  all: (mode: DataMode, owner: string) => ["protocol", mode, owner] as const,
  collateral: (mode: DataMode, owner: string) => ["protocol", mode, owner, "collateral"] as const,
  collateralItem: (mode: DataMode, owner: string, id: string) =>
    ["protocol", mode, owner, "collateral", id] as const,
  balance: (mode: DataMode, owner: string) => ["protocol", mode, owner, "balance"] as const,
  loans: (mode: DataMode, owner: string) => ["protocol", mode, owner, "loans"] as const,
  loanItem: (mode: DataMode, owner: string, id: string) => ["protocol", mode, owner, "loans", id] as const,
  proofs: (mode: DataMode, owner: string) => ["protocol", mode, owner, "proofs"] as const,
  proofItem: (mode: DataMode, owner: string, id: string) => ["protocol", mode, owner, "proofs", id] as const,
  activity: (mode: DataMode, owner: string) => ["protocol", mode, owner, "activity"] as const,
  status: (mode: DataMode) => ["protocol", mode, "status"] as const,
  verification: (mode: DataMode) => ["protocol", mode, "verification"] as const,
  capabilities: (mode: DataMode) => ["protocol", mode, "capabilities"] as const,
};

export const useCollateralPositions = (): UseQueryResult<readonly CollateralPosition[]> => {
  const { owner, mode } = useSessionOwner();
  return useQuery({
    queryKey: protocolKeys.collateral(mode, owner ?? "none"),
    queryFn: () => getServices(mode).collateral.listPositions(owner as string),
    enabled: owner !== null,
    staleTime: 15_000,
    retry: 1,
  });
};

export const useCollateralPosition = (id: string | undefined): UseQueryResult<CollateralPosition | null> => {
  const { owner, mode } = useSessionOwner();
  return useQuery({
    queryKey: protocolKeys.collateralItem(mode, owner ?? "none", id ?? "none"),
    queryFn: () => getServices(mode).collateral.getPosition(id as string),
    enabled: owner !== null && Boolean(id),
    staleTime: 15_000,
    retry: 1,
  });
};

export const useWalletBalance = (): UseQueryResult<WalletBalance | null> => {
  const { owner, mode } = useSessionOwner();
  return useQuery({
    queryKey: protocolKeys.balance(mode, owner ?? "none"),
    queryFn: () => getServices(mode).collateral.getWalletBalance(owner as string),
    enabled: owner !== null,
    staleTime: 20_000,
    retry: 1,
  });
};

export const useLoans = (): UseQueryResult<readonly Loan[]> => {
  const { owner, mode } = useSessionOwner();
  return useQuery({
    queryKey: protocolKeys.loans(mode, owner ?? "none"),
    queryFn: () => getServices(mode).loans.listLoans(owner as string),
    enabled: owner !== null,
    staleTime: 15_000,
    retry: 1,
  });
};

export const useLoan = (id: string | undefined): UseQueryResult<Loan | null> => {
  const { owner, mode } = useSessionOwner();
  return useQuery({
    queryKey: protocolKeys.loanItem(mode, owner ?? "none", id ?? "none"),
    queryFn: () => getServices(mode).loans.getLoan(id as string),
    enabled: owner !== null && Boolean(id),
    staleTime: 15_000,
    retry: 1,
  });
};

export const useProofs = (): UseQueryResult<readonly Attestation[]> => {
  const { owner, mode } = useSessionOwner();
  return useQuery({
    queryKey: protocolKeys.proofs(mode, owner ?? "none"),
    queryFn: () => getServices(mode).proofs.listProofs(owner as string),
    enabled: owner !== null,
    staleTime: 15_000,
    retry: 1,
  });
};

export const useProof = (id: string | undefined): UseQueryResult<Attestation | null> => {
  const { owner, mode } = useSessionOwner();
  return useQuery({
    queryKey: protocolKeys.proofItem(mode, owner ?? "none", id ?? "none"),
    queryFn: () => getServices(mode).proofs.getProof(id as string),
    enabled: owner !== null && Boolean(id),
    staleTime: 15_000,
    retry: 1,
  });
};

export const useActivity = (): UseQueryResult<readonly ActivityEvent[]> => {
  const { owner, mode } = useSessionOwner();
  return useQuery({
    queryKey: protocolKeys.activity(mode, owner ?? "none"),
    queryFn: () => getServices(mode).activity.listActivity(owner as string),
    enabled: owner !== null,
    staleTime: 10_000,
    retry: 1,
  });
};

export const useSystemStatus = (): UseQueryResult<SystemStatus> => {
  const { mode } = useSessionOwner();
  return useQuery({
    queryKey: protocolKeys.status(mode),
    queryFn: () => getServices(mode).status.getSystemStatus(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 0,
  });
};

export const useProtocolVerification = (): UseQueryResult<ProtocolVerification> => {
  const { mode } = useSessionOwner();
  return useQuery({
    queryKey: protocolKeys.verification(mode),
    queryFn: () => getServices(mode).status.getVerification(),
    staleTime: Infinity,
  });
};

export const useCapabilities = (): UseQueryResult<{
  lock: boolean;
  borrow: boolean;
  repay: boolean;
  unlock: boolean;
}> => {
  const { mode } = useSessionOwner();
  return useQuery({
    queryKey: protocolKeys.capabilities(mode),
    queryFn: () => getServices(mode).operations.capabilities(),
    staleTime: 60_000,
  });
};

/** Invalidate every authoritative read after a state-changing transaction. */
export const useRefreshProtocol = (): (() => Promise<void>) => {
  const queryClient = useQueryClient();
  const { owner, mode } = useSessionOwner();

  return useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: protocolKeys.all(mode, owner ?? "none") });
    await queryClient.invalidateQueries({ queryKey: protocolKeys.status(mode) });
  }, [queryClient, mode, owner]);
};

/** Positions that may back a new loan right now. */
export const useEligibleCollateral = (): readonly CollateralPosition[] => {
  const { data } = useCollateralPositions();
  return useMemo(() => (data ?? []).filter((position) => position.status === "locked"), [data]);
};

export const useActiveLoans = (): readonly Loan[] => {
  const { data } = useLoans();
  return useMemo(() => (data ?? []).filter((loan) => loan.status === "active" || loan.status === "pending"), [data]);
};

/** Derive borrowing power from authoritative collateral + loan data. */
export const useBorrowingPower = (
  position: CollateralPosition | null | undefined,
  currencySymbol = "USDC",
): BorrowingPower | null => {
  const { data: loans } = useLoans();

  return useMemo(() => {
    if (!position) return null;
    const debt = (loans ?? [])
      .filter((loan) => loan.collateralId === position.id && (loan.status === "active" || loan.status === "pending"))
      .reduce((sum, loan) => sum + loan.outstanding, 0);

    const collateralValueUsd = position.valueUsd;
    const available =
      collateralValueUsd === null ? null : Math.max(0, collateralValueUsd * position.maxLtv - debt);
    const healthFactor =
      collateralValueUsd === null || debt <= 0 ? null : (collateralValueUsd * position.maxLtv) / debt;

    return {
      collateralValueUsd,
      maxLtv: position.maxLtv,
      existingDebt: debt,
      availableUsd: available,
      healthFactor,
      currencySymbol,
    };
  }, [position, loans, currencySymbol]);
};

/** Portfolio-level totals used on Overview and Vault. */
export const usePortfolioSummary = (): {
  totalCollateralUsd: number | null;
  borrowingPowerUsd: number | null;
  totalDebt: number;
  healthFactor: number | null;
  lockedCount: number;
  pledgedCount: number;
  hasAnyCollateral: boolean;
  isLoading: boolean;
} => {
  const { data: positions, isLoading: positionsLoading } = useCollateralPositions();
  const { data: loans, isLoading: loansLoading } = useLoans();

  return useMemo(() => {
    const active = (positions ?? []).filter((position) => position.status !== "unlocked");
    const activeLoans = (loans ?? []).filter((loan) => loan.status === "active" || loan.status === "pending");

    const anyValued = active.some((position) => position.valueUsd !== null);
    const totalCollateralUsd = anyValued
      ? active.reduce((sum, position) => sum + (position.valueUsd ?? 0), 0)
      : null;

    const weightedCapacity = anyValued
      ? active.reduce((sum, position) => sum + (position.valueUsd ?? 0) * position.maxLtv, 0)
      : null;

    const totalDebt = activeLoans.reduce((sum, loan) => sum + loan.outstanding, 0);
    const borrowingPowerUsd = weightedCapacity === null ? null : Math.max(0, weightedCapacity - totalDebt);
    const healthFactor = weightedCapacity === null || totalDebt <= 0 ? null : weightedCapacity / totalDebt;

    return {
      totalCollateralUsd,
      borrowingPowerUsd,
      totalDebt,
      healthFactor,
      lockedCount: active.filter((position) => position.status === "locked").length,
      pledgedCount: active.filter((position) => position.status === "pledged").length,
      hasAnyCollateral: active.length > 0,
      isLoading: positionsLoading || loansLoading,
    };
  }, [positions, loans, positionsLoading, loansLoading]);
};

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, LogOut, PanelLeftClose, PanelLeftOpen, Settings, X } from "lucide-react";
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { BrandMark } from "@/components/layout/BrandMark";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NavLink } from "@/components/NavLink";
import { NAV_GROUPS, type BadgeSource, type NavItem } from "@/config/navigation";
import { useWallet } from "@/hooks/useWallet";
import {
  useActivity,
  useCollateralPositions,
  useLoans,
  useProofs,
  useSystemStatus,
} from "@/hooks/useProtocolData";
import { cn } from "@/lib/utils";
import { ATTACK_SCENARIOS } from "@/services/mock/attackScenarios";
import { useAppStore } from "@/stores/useAppStore";
import { shortAddress } from "@/utils/format";

/** Dynamic sidebar badge counts derived from authoritative protocol data. */
const useNavBadges = (): Record<Exclude<BadgeSource, null>, number | "dot" | null> => {
  const { data: positions } = useCollateralPositions();
  const { data: loans } = useLoans();
  const { data: proofs } = useProofs();
  const { data: activity } = useActivity();
  const activitySeenAt = useAppStore((state) => state.activitySeenAt);

  return useMemo(() => {
    const activeCollateral = (positions ?? []).filter((position) => position.status !== "unlocked").length;
    const activeLoans = (loans ?? []).filter((loan) => loan.status === "active" || loan.status === "pending").length;
    const pendingProofs = (proofs ?? []).filter(
      (proof) => proof.status === "pending" || proof.status === "transmitted" || proof.status === "signed",
    ).length;
    const hasUnseen = (activity ?? []).some((event) => new Date(event.timestamp).getTime() > activitySeenAt);

    return {
      collateral: activeCollateral > 0 ? activeCollateral : null,
      loans: activeLoans > 0 ? activeLoans : null,
      proofs: pendingProofs > 0 ? pendingProofs : null,
      security: ATTACK_SCENARIOS.length,
      activity: hasUnseen ? ("dot" as const) : null,
    };
  }, [positions, loans, proofs, activity, activitySeenAt]);
};

interface SidebarProps {
  variant?: "desktop" | "mobile";
}

export const Sidebar = ({ variant = "desktop" }: SidebarProps) => {
  const collapsedPref = useAppStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const setMobileSidebarOpen = useAppStore((state) => state.setMobileSidebarOpen);
  const badges = useNavBadges();
  const { data: status } = useSystemStatus();
  const { address, isDemoSession, disconnect } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();

  const isMobile = variant === "mobile";
  const collapsed = isMobile ? false : collapsedPref;

  const backendHealth = status?.backend ?? "unknown";
  const protocolOnline = backendHealth === "operational";
  const statusLabel = protocolOnline
    ? "Protocol Online"
    : backendHealth === "degraded"
      ? "Protocol Degraded"
      : backendHealth === "unavailable"
        ? "Protocol Unavailable"
        : "Protocol Status Unknown";

  const handleDisconnect = (): void => {
    disconnect();
    navigate("/", { replace: true });
  };

  return (
    <nav
      aria-label="Protocol navigation"
      className={cn(
        "relative flex h-full flex-col border-r bg-sidebar/95 backdrop-blur-xl transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        collapsed ? "w-[72px]" : "w-[228px]",
        isMobile && "w-[264px]",
      )}
      style={{ borderColor: "hsl(var(--hairline))" }}
    >
      {/* atmospheric depth */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-16 top-0 h-64 w-48 rounded-full bg-primary/[0.08] blur-3xl" />
        <div className="absolute -left-12 bottom-10 h-52 w-40 rounded-full bg-accent/[0.05] blur-3xl" />
      </div>

      {/* brand */}
      <div className={cn("relative flex items-center gap-2.5 px-4 pb-5 pt-5", collapsed && "justify-center px-0")}>
        <NavLink
          to="/overview"
          className="flex items-center gap-2.5 rounded-lg"
          aria-label="OmniVault — Overview"
          onClick={() => isMobile && setMobileSidebarOpen(false)}
        >
          <BrandMark className="size-8 shrink-0" />
          {!collapsed ? (
            <span className="display text-[17px] font-extrabold tracking-tight text-foreground">OmniVault</span>
          ) : null}
        </NavLink>
        {isMobile ? (
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close navigation"
            className="ml-auto grid size-8 place-items-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {!collapsed && !isMobile ? (
        <p className="relative -mt-3 mb-4 px-4 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
          Cross-Chain Lending
        </p>
      ) : null}

      {/* navigation groups */}
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden px-2.5 pb-3 no-scrollbar">
        {NAV_GROUPS.map((group, groupIndex) => (
          <div key={group.heading ?? `group-${groupIndex}`} className={groupIndex > 0 ? "mt-5" : ""}>
            {group.heading ? (
              collapsed ? (
                <div className="mx-3 mb-3 h-px bg-border/60" aria-hidden />
              ) : (
                <p className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
                  {group.heading}
                </p>
              )
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <SidebarLink
                    item={item}
                    collapsed={collapsed}
                    badge={item.badge ? badges[item.badge] : null}
                    isActive={location.pathname.startsWith(item.to)}
                    onNavigate={() => isMobile && setMobileSidebarOpen(false)}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* footer: status, wallet, settings */}
      <div className="relative hairline-t px-2.5 py-3">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="mx-auto mb-2 grid size-9 place-items-center">
                <StatusDot online={protocolOnline} health={backendHealth} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">{statusLabel}</TooltipContent>
          </Tooltip>
        ) : (
          <div className="mb-3 px-2.5">
            <div className="flex items-center gap-2">
              <StatusDot online={protocolOnline} health={backendHealth} />
              <p className="text-[12.5px] font-semibold text-foreground/90">{statusLabel}</p>
            </div>
            <p className="mt-0.5 pl-4 text-[11px] text-muted-foreground">
              {protocolOnline ? "All systems operational" : "Check System Status"}
            </p>
          </div>
        )}

        {address || isDemoSession ? (
          <NavLink
            to="/settings"
            onClick={() => isMobile && setMobileSidebarOpen(false)}
            className={cn(
              "mb-1 flex w-full items-center gap-2.5 rounded-lg border border-border/60 bg-card/40 px-2.5 py-2 text-left transition-colors hover:border-primary/35 hover:bg-primary/[0.06]",
              collapsed && "justify-center px-0",
            )}
            aria-label="Account settings"
          >
            <span
              className="size-6 shrink-0 rounded-full border border-primary/30"
              style={{
                background: "conic-gradient(from 140deg, hsl(217 91% 60%), hsl(187 85% 53%), hsl(247 81% 68%))",
              }}
              aria-hidden
            />
            {!collapsed ? (
              <span className="mono min-w-0 flex-1 truncate text-[11.5px] text-foreground/85">
                {isDemoSession ? "Demo session" : shortAddress(address, 6, 4)}
              </span>
            ) : null}
            {!collapsed ? <ChevronLeft className="size-3.5 rotate-180 text-muted-foreground" aria-hidden /> : null}
          </NavLink>
        ) : null}

        <SidebarFooterButton
          collapsed={collapsed}
          to="/settings"
          icon={Settings}
          label="Settings"
          isActive={location.pathname.startsWith("/settings")}
          onNavigate={() => isMobile && setMobileSidebarOpen(false)}
        />

        <button
          type="button"
          onClick={handleDisconnect}
          className={cn(
            "mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
            collapsed && "justify-center px-0",
          )}
          aria-label="Disconnect wallet"
        >
          <LogOut className="size-[17px] shrink-0" aria-hidden />
          {!collapsed ? "Disconnect" : null}
        </button>

        {!isMobile ? (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className={cn(
              "mt-2 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] text-muted-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-[17px]" aria-hidden />
            ) : (
              <>
                <PanelLeftClose className="size-[17px]" aria-hidden />
                Collapse
              </>
            )}
          </button>
        ) : null}
      </div>
    </nav>
  );
};

const StatusDot = ({ online, health }: { online: boolean; health: string }) => (
  <span className="relative flex size-2 shrink-0" aria-hidden>
    {online ? (
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/70" />
    ) : null}
    <span
      className={cn(
        "relative inline-flex size-2 rounded-full",
        online ? "bg-success" : health === "degraded" ? "bg-warning" : health === "unknown" ? "bg-muted-foreground" : "bg-destructive",
      )}
    />
  </span>
);

interface SidebarLinkProps {
  item: NavItem;
  collapsed: boolean;
  badge: number | "dot" | null;
  isActive: boolean;
  onNavigate: () => void;
}

const SidebarLink = ({ item, collapsed, badge, isActive, onNavigate }: SidebarLinkProps) => {
  const Icon = item.icon;

  const link = (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-[9px] text-[13.5px] font-medium transition-all duration-200",
        collapsed && "justify-center px-0",
        isActive
          ? "bg-primary/[0.12] text-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
      )}
    >
      {isActive ? (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 -z-10 rounded-lg border border-primary/35"
          style={{ boxShadow: "inset 0 0 18px -4px hsl(217 91% 60% / 0.35)" }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          aria-hidden
        />
      ) : null}
      {isActive ? (
        <span className="absolute -left-2.5 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-primary" aria-hidden />
      ) : null}

      <Icon
        className={cn(
          "size-[17px] shrink-0 transition-colors",
          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground/80",
        )}
        aria-hidden
      />
      {!collapsed ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : null}

      {badge !== null && !collapsed ? (
        badge === "dot" ? (
          <span className="relative flex size-[7px] shrink-0" aria-label="New activity">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent/70" />
            <span className="relative inline-flex size-[7px] rounded-full bg-accent" />
          </span>
        ) : (
          <span
            className={cn(
              "mono shrink-0 rounded-md border px-1.5 py-px text-[10px] font-semibold",
              isActive ? "border-primary/40 bg-primary/15 text-primary" : "border-border/70 bg-muted/30 text-muted-foreground",
            )}
          >
            {badge}
          </span>
        )
      ) : null}

      {badge !== null && collapsed ? (
        <span
          className={cn(
            "absolute right-2.5 top-2 size-[6px] rounded-full",
            badge === "dot" ? "bg-accent" : "bg-primary",
          )}
          aria-hidden
        />
      ) : null}
    </NavLink>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" className="flex flex-col gap-0.5">
        <span className="font-semibold">{item.label}</span>
        <span className="text-[11px] text-muted-foreground">{item.description}</span>
      </TooltipContent>
    </Tooltip>
  );
};

const SidebarFooterButton = ({
  collapsed,
  to,
  icon: Icon,
  label,
  isActive,
  onNavigate,
}: {
  collapsed: boolean;
  to: string;
  icon: typeof Settings;
  label: string;
  isActive: boolean;
  onNavigate: () => void;
}) => {
  const link = (
    <NavLink
      to={to}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
        collapsed && "justify-center px-0",
        isActive ? "bg-primary/[0.12] text-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
      )}
    >
      <Icon className={cn("size-[17px] shrink-0", isActive && "text-primary")} aria-hidden />
      {!collapsed ? label : null}
    </NavLink>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
};

/** Slide-out sidebar for narrow viewports. No bottom tab bar — this is a console. */
export const MobileSidebar = () => {
  const open = useAppStore((state) => state.mobileSidebarOpen);
  const setOpen = useAppStore((state) => state.setMobileSidebarOpen);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <motion.div
            className="fixed inset-y-0 left-0 z-50 lg:hidden"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 34 }}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <Sidebar variant="mobile" />
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
};

import {
  Activity,
  BookOpen,
  Coins,
  FileCheck2,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  Vault,
  Waves,
  type LucideIcon,
} from "lucide-react";

export type BadgeSource = "collateral" | "loans" | "proofs" | "security" | "activity" | null;

export interface NavItem {
  readonly label: string;
  readonly to: string;
  readonly icon: LucideIcon;
  readonly badge: BadgeSource;
  readonly description: string;
}

export interface NavGroup {
  readonly heading: string | null;
  readonly items: readonly NavItem[];
}

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    heading: null,
    items: [
      {
        label: "Overview",
        to: "/overview",
        icon: LayoutDashboard,
        badge: null,
        description: "Cross-chain position at a glance",
      },
      { label: "Vault", to: "/vault", icon: Vault, badge: "collateral", description: "Collateral on Chain A" },
      { label: "Borrow", to: "/borrow", icon: Coins, badge: null, description: "Borrow against collateral" },
      { label: "Loans", to: "/loans", icon: Receipt, badge: "loans", description: "Active and repaid loans" },
      { label: "Proofs", to: "/proofs", icon: FileCheck2, badge: "proofs", description: "Attestation explorer" },
    ],
  },
  {
    heading: "Security",
    items: [
      {
        label: "Security",
        to: "/security",
        icon: ShieldCheck,
        badge: "security",
        description: "Attack resistance",
      },
      { label: "Activity", to: "/activity", icon: Activity, badge: "activity", description: "Protocol event log" },
    ],
  },
  {
    heading: "System",
    items: [{ label: "Status", to: "/status", icon: Waves, badge: null, description: "Service health" }],
  },
  {
    heading: "Resources",
    items: [{ label: "Docs", to: "/docs", icon: BookOpen, badge: null, description: "How OmniVault works" }],
  },
];

/** Page titles used by the system bar, keyed by route prefix. */
export const ROUTE_TITLES: readonly { prefix: string; title: string }[] = [
  { prefix: "/overview", title: "Overview" },
  { prefix: "/vault", title: "Vault" },
  { prefix: "/borrow", title: "Borrow" },
  { prefix: "/loans", title: "Loans" },
  { prefix: "/proofs", title: "Proofs" },
  { prefix: "/security", title: "Security" },
  { prefix: "/activity", title: "Activity" },
  { prefix: "/status", title: "Status" },
  { prefix: "/docs", title: "Docs" },
  { prefix: "/settings", title: "Settings" },
];

export const titleForPath = (pathname: string): string =>
  ROUTE_TITLES.find((entry) => pathname.startsWith(entry.prefix))?.title ?? "OmniVault";

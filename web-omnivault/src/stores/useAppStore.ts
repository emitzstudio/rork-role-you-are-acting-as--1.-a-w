import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { DataMode } from "@/types/protocol";

export type MotionPreference = "full" | "reduced";
export type ThemePreference = "dark" | "light";

interface NotificationPreferences {
  transactions: boolean;
  security: boolean;
  activity: boolean;
}

interface AppState {
  mode: DataMode;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  motion: MotionPreference;
  theme: ThemePreference;
  notifications: NotificationPreferences;
  /** Timestamp of the last activity view, used for the sidebar "new" indicator. */
  activitySeenAt: number;
  setMode: (mode: DataMode) => void;
  toggleSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setMotion: (motion: MotionPreference) => void;
  setTheme: (theme: ThemePreference) => void;
  setNotification: (key: keyof NotificationPreferences, value: boolean) => void;
  markActivitySeen: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      mode: "live",
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      motion: "full",
      theme: "dark",
      notifications: { transactions: true, security: true, activity: false },
      activitySeenAt: 0,
      setMode: (mode) => set({ mode }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
      setMotion: (motion) => set({ motion }),
      setTheme: (theme) => set({ theme }),
      setNotification: (key, value) =>
        set((state) => ({ notifications: { ...state.notifications, [key]: value } })),
      markActivitySeen: () => set({ activitySeenAt: Date.now() }),
    }),
    {
      name: "omnivault.preferences",
      // Only durable preferences are persisted — never protocol/business state.
      partialize: (state) => ({
        mode: state.mode,
        sidebarCollapsed: state.sidebarCollapsed,
        motion: state.motion,
        theme: state.theme,
        notifications: state.notifications,
        activitySeenAt: state.activitySeenAt,
      }),
    },
  ),
);

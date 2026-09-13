import { useEffect, type ReactNode } from "react";

import { useAppStore } from "@/stores/useAppStore";

interface PreferencesProviderProps {
  children: ReactNode;
}

/** Applies durable display preferences (theme, motion) to the document root. */
export const PreferencesProvider = ({ children }: PreferencesProviderProps) => {
  const theme = useAppStore((state) => state.theme);
  const motion = useAppStore((state) => state.motion);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    root.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.motion = motion;
  }, [motion]);

  return <>{children}</>;
};

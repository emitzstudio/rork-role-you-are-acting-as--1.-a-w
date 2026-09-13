import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { MobileSidebar, Sidebar } from "@/components/layout/Sidebar";
import { SystemBar } from "@/components/layout/SystemBar";
import { useWallet } from "@/hooks/useWallet";
import { useAppStore } from "@/stores/useAppStore";

/** Authenticated protocol console. Left sidebar + system bar, never a horizontal navbar. */
export const AppShell = () => {
  const { isConnected } = useWallet();
  const location = useLocation();
  const setMobileSidebarOpen = useAppStore((state) => state.setMobileSidebarOpen);

  // Close the slide-out navigation whenever the route changes.
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname, setMobileSidebarOpen]);

  if (!isConnected) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="relative flex h-dvh w-full overflow-hidden bg-background">
      {/* ambient depth behind the whole console */}
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className="absolute left-1/4 top-0 h-[420px] w-[520px] rounded-full bg-primary/[0.05] blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[460px] rounded-full bg-accent/[0.035] blur-[120px]" />
      </div>

      <aside className="hidden shrink-0 lg:block">
        <Sidebar />
      </aside>
      <MobileSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <SystemBar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/layouts/AppShell";
import { PreferencesProvider } from "@/providers/PreferencesProvider";

import ActivityPage from "./pages/ActivityPage";
import Borrow from "./pages/Borrow";
import Docs from "./pages/Docs";
import Entry from "./pages/Entry";
import LoanDetail from "./pages/LoanDetail";
import Loans from "./pages/Loans";
import NotFound from "./pages/NotFound";
import Overview from "./pages/Overview";
import ProofDetail from "./pages/ProofDetail";
import Proofs from "./pages/Proofs";
import Security from "./pages/Security";
import Settings from "./pages/Settings";
import Status from "./pages/Status";
import Vault from "./pages/Vault";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 15_000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PreferencesProvider>
      <TooltipProvider delayDuration={200}>
        <Toaster position="bottom-right" closeButton richColors theme="dark" />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Entry />} />

            <Route element={<AppShell />}>
              <Route path="/overview" element={<Overview />} />
              <Route path="/vault" element={<Vault />} />
              <Route path="/borrow" element={<Borrow />} />
              <Route path="/loans" element={<Loans />} />
              <Route path="/loans/:id" element={<LoanDetail />} />
              <Route path="/proofs" element={<Proofs />} />
              <Route path="/proofs/:id" element={<ProofDetail />} />
              <Route path="/security" element={<Security />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/status" element={<Status />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </PreferencesProvider>
  </QueryClientProvider>
);

export default App;

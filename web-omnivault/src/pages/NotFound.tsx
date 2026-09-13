import { ArrowLeft, Compass } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { BrandMark } from "@/components/layout/BrandMark";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";

const NotFound = () => {
  const navigate = useNavigate();
  const { isConnected } = useWallet();

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-background px-6">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 grid-field opacity-30" />
        <div className="absolute left-1/2 top-1/2 h-[420px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-primary/[0.07] blur-[120px]" />
      </div>

      <div className="relative flex max-w-md flex-col items-center text-center">
        <BrandMark className="size-11" active={false} />

        <p className="mono mt-8 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Error 404</p>
        <h1 className="display mt-3 text-3xl font-black tracking-tight sm:text-4xl">Protocol route not found</h1>
        <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
          This address does not correspond to any OmniVault console route. The protocol state is unaffected.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => navigate(isConnected ? "/overview" : "/")} className="h-11 gap-2 px-6 font-semibold">
            <Compass className="size-4" aria-hidden />
            {isConnected ? "Return to Overview" : "Return to entry"}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="h-11 gap-2 border-border/70 bg-card/40 px-6 font-semibold"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Go back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

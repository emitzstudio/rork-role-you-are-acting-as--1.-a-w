import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  /** Renders the inner vault aperture lit. */
  active?: boolean;
}

/** OmniVault sigil: a hexagonal vault with a proof aperture at its core. */
export const BrandMark = ({ className, active = true }: BrandMarkProps) => (
  <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden fill="none">
    <defs>
      <linearGradient id="ov-mark" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
        <stop stopColor="hsl(217 91% 62%)" />
        <stop offset="1" stopColor="hsl(187 85% 53%)" />
      </linearGradient>
    </defs>
    <path
      d="M16 1.8 28.4 8.9v14.2L16 30.2 3.6 23.1V8.9L16 1.8Z"
      stroke="url(#ov-mark)"
      strokeWidth="1.6"
      fill="hsl(217 91% 60% / 0.08)"
      strokeLinejoin="round"
    />
    <path
      d="M16 8.4 22.7 12.2v7.6L16 23.6l-6.7-3.8v-7.6L16 8.4Z"
      fill="url(#ov-mark)"
      opacity={active ? 0.9 : 0.4}
    />
    <circle cx="16" cy="16" r="2.4" className="fill-background" />
  </svg>
);

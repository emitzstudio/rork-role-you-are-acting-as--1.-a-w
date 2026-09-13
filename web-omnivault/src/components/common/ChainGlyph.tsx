import { cn } from "@/lib/utils";

interface ChainGlyphProps {
  role: "A" | "B";
  className?: string;
  active?: boolean;
}

/** Abstract chain marks — Ethereum octahedron for Chain A, Base disc for Chain B. */
export const ChainGlyph = ({ role, className, active = false }: ChainGlyphProps) => {
  if (role === "A") {
    return (
      <svg viewBox="0 0 24 24" className={cn("size-5", className)} aria-hidden fill="none">
        <path
          d="M12 2.5 5.8 12.1 12 15.6l6.2-3.5L12 2.5Z"
          fill="currentColor"
          opacity={active ? 0.95 : 0.7}
        />
        <path d="M12 16.9 5.8 13.4 12 21.5l6.2-8.1-6.2 3.5Z" fill="currentColor" opacity={active ? 0.6 : 0.42} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={cn("size-5", className)} aria-hidden fill="none">
      <circle cx="12" cy="12" r="9.2" fill="currentColor" opacity={active ? 0.95 : 0.75} />
      <rect x="6.4" y="10.4" width="11.2" height="3.2" rx="1.6" className="fill-background" />
    </svg>
  );
};

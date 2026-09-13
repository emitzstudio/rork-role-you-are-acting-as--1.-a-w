import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  className?: string;
}

export const PageHeader = ({ eyebrow, title, description, actions, aside, className }: PageHeaderProps) => (
  <header className={cn("flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between", className)}>
    <div className="min-w-0 max-w-3xl">
      {eyebrow ? <p className="label-tech mb-3 text-primary/80">{eyebrow}</p> : null}
      <h1 className="display text-3xl font-extrabold uppercase leading-[1.05] tracking-tight sm:text-4xl">{title}</h1>
      {description ? (
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {actions ? <div className="mt-6 flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
    {aside ? <div className="shrink-0 lg:pl-8">{aside}</div> : null}
  </header>
);

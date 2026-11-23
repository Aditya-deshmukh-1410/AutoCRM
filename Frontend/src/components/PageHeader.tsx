import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description: string;
  actions?: ReactNode;
  eyebrow?: string;
};

/** Consistent title, context, and action hierarchy for internal CRM screens. */
export default function PageHeader({
  title,
  description,
  actions,
  eyebrow = "Dealership workspace",
}: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-brand-600/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b5b91]">{eyebrow}</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-plum-950 sm:text-3xl">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">{actions}</div>}
    </header>
  );
}

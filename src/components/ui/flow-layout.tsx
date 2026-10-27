import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

export function FlowLayout({ children, aside }: { children: ReactNode; aside: ReactNode }) {
  return (
    <div className="reference-screen">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">{children}</div>
        <aside className="grid min-w-0 gap-4 lg:sticky lg:top-5">{aside}</aside>
      </div>
      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-5 text-xs text-muted-foreground">
        <span>Ação Social · Solicitações, cuidado e participação.</span>
        <span className="font-medium text-primary">Cuidado, organização e acesso.</span>
      </footer>
    </div>
  );
}

export function FlowSteps({ labels, current }: { labels: readonly string[]; current: number }) {
  return (
    <ol className="mb-6 grid grid-cols-3 gap-3 border-b pb-4 text-xs" aria-label="Etapas da solicitação">
      {labels.map((label, index) => (
        <li key={label} className={cn("flex items-start gap-2 text-muted-foreground", index <= current && "text-foreground", index === current && "font-semibold")} aria-current={index === current ? "step" : undefined}>
          {index < current ? <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" /> : <span className="text-primary">{index + 1}.</span>}
          <span>{label}{index === current ? <span className="sr-only"> — etapa atual</span> : null}</span>
        </li>
      ))}
    </ol>
  );
}

export function InfoPanel({ title, children, tone = "neutral" }: { title: string; children: ReactNode; tone?: "neutral" | "warm" }) {
  return (
    <section className={cn("rounded-md border p-4 text-xs leading-relaxed", tone === "warm" ? "border-amber-200/70 bg-amber-50/60" : "bg-muted/30")}>
      <h3 className="mb-1.5 font-semibold text-foreground">{title}</h3>
      <div className="text-muted-foreground">{children}</div>
    </section>
  );
}

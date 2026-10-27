import type { DemandDraft, DemandOptions } from "../../lib/types";
import { demandLabel } from "../../lib/demand-options";

export function DemandDraftSummary({ draft, requesterName, options }: { draft: DemandDraft; requesterName: string; options: DemandOptions }) {
  return (
    <div className="grid gap-5">
      <section className="flow-section"><h3 className="mb-4 font-semibold">Seus dados</h3><dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-muted-foreground">Nome completo</dt><dd className="mt-1 break-words">{requesterName}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Telefone / WhatsApp</dt><dd className="mt-1">{draft.phone}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Bairro</dt><dd className="mt-1 break-words">{draft.neighborhood}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Canal de retorno</dt><dd className="mt-1">{demandLabel(options, "returnPreferences", draft.returnPreference)}</dd></div>
      </dl></section>
      <section className="flow-section"><h3 className="mb-4 font-semibold">Sua necessidade</h3><dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-muted-foreground">Tipo de pedido</dt><dd className="mt-1">{demandLabel(options, "categories", draft.category)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Atenção urgente</dt><dd className="mt-1">{draft.urgent === "true" ? "Sim" : "Não"}</dd></div>
        {draft.category === "OTHER" ? <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Especificação do pedido</dt><dd className="mt-1 whitespace-pre-wrap break-words">{draft.otherDescription}</dd></div> : null}
      </dl><p className="mt-4 whitespace-pre-wrap break-words text-sm">{draft.description.trim()}</p><p className="mt-3 text-xs text-muted-foreground">Anexos: nenhum arquivo enviado.</p></section>
      <section className="flow-section"><p className="text-xs">{options.consent.text}</p><p className="mt-1 text-xs font-medium text-primary">Autorização marcada para este envio.</p></section>
    </div>
  );
}

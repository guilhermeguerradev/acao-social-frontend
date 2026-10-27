import type { Demand } from "../../lib/types";
import { formatDateTime } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { demandLabel, formatDemandPhone, useDemandOptions } from "../../lib/demand-options";
import { InfoPanel } from "../ui/flow-layout";

export function DemandSummary({ demand, compact = false }: { demand: Demand; compact?: boolean }) {
  const { options } = useDemandOptions();
  const missing = "Não informado neste registro";
  return (
    <div className="grid gap-5">
      <Badge variant="secondary" className="justify-self-start">Recebida</Badge>
      <dl className={compact ? "grid gap-4 text-sm" : "grid gap-4 text-sm sm:grid-cols-2"}>
        {!compact ? <div>
          <dt className="text-muted-foreground">Identificação da solicitação</dt>
          <dd className="mt-1 break-all font-medium">{demand.id}</dd>
        </div> : null}
        <div>
          <dt className="text-muted-foreground">Recebida em</dt>
          <dd className="mt-1 font-medium">{formatDateTime(demand.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Solicitante</dt>
          <dd className="mt-1 break-words font-medium">{demand.requester.name}</dd>
        </div>
        <div><dt className="text-muted-foreground">Telefone / WhatsApp</dt><dd className="mt-1 font-medium">{formatDemandPhone(demand.phone)}</dd></div>
        <div><dt className="text-muted-foreground">Bairro</dt><dd className="mt-1 break-words font-medium">{demand.neighborhood ?? missing}</dd></div>
        <div><dt className="text-muted-foreground">Retorno preferido</dt><dd className="mt-1 font-medium">{demandLabel(options, "returnPreferences", demand.returnPreference)}</dd></div>
        <div><dt className="text-muted-foreground">Tipo de pedido</dt><dd className="mt-1 font-medium">{demandLabel(options, "categories", demand.category)}</dd></div>
        <div><dt className="text-muted-foreground">Atenção urgente</dt><dd className="mt-1 font-medium">{demand.urgent === null ? missing : demand.urgent ? "Sim" : "Não"}</dd></div>
        {demand.otherDescription ? <div className={compact ? undefined : "sm:col-span-2"}><dt className="text-muted-foreground">Especificação do pedido</dt><dd className="mt-1 whitespace-pre-wrap break-words font-medium">{demand.otherDescription}</dd></div> : null}
      </dl>
      <section aria-label="Descrição do apoio solicitado" className="grid gap-2">
        <h3 className="font-medium">Descrição do apoio solicitado</h3>
        <p className="whitespace-pre-wrap break-words text-sm">{demand.description}</p>
      </section>
      {demand.contactConsentAt ? <section className="grid gap-2 border-t pt-4 text-xs">
        <h3 className="font-medium">Autorização de contato registrada</h3>
        <p>{demand.contactConsentText}</p>
        <p className="text-muted-foreground">Registrada em {formatDateTime(demand.contactConsentAt)} · Versão {demand.contactConsentVersion}</p>
      </section> : <InfoPanel title="Registro anterior à autorização de contato">Não há consentimento registrado neste pedido. Nenhuma autorização foi atribuída retroativamente.</InfoPanel>}
    </div>
  );
}

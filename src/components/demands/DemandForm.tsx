import { useState, type FormEvent } from "react";
import type { DemandDraft, DemandOptions } from "../../lib/types";
import { validateDemandDraft } from "../../lib/demand-options";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Label } from "../ui/label";
import { FlowLayout, FlowSteps, InfoPanel } from "../ui/flow-layout";

export function DemandForm({ draft, options, requesterName, onChange, onContinue, onBack }: {
  draft: DemandDraft;
  options: DemandOptions;
  requesterName: string;
  onChange: (draft: DemandDraft) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const [error, setError] = useState("");
  function update<K extends keyof DemandDraft>(field: K, value: DemandDraft[K]) {
    onChange({ ...draft, [field]: value });
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = validateDemandDraft(draft, options);
    setError(message ?? "");
    if (!message) onContinue();
  }
  return (
    <FlowLayout aside={<>
      <Card><CardHeader><CardTitle>Um pedido, um cuidado.</CardTitle><CardDescription>Cada solicitação começa com a escuta da sua necessidade.</CardDescription></CardHeader>
        <CardContent><ol className="grid gap-5 text-xs">
          <li><strong className="font-semibold">1. Conte sua necessidade</strong><p className="mt-1 text-muted-foreground">Preencha seus dados de contato e descreva o apoio.</p></li>
          <li><strong className="font-semibold">2. Confira e envie</strong><p className="mt-1 text-muted-foreground">Revise as informações com tranquilidade.</p></li>
          <li><strong className="font-semibold">3. Guarde a identificação</strong><p className="mt-1 text-muted-foreground">Consulte seu pedido na área de demandas.</p></li>
        </ol></CardContent>
      </Card>
      <InfoPanel title="Cada necessidade importa">Compartilhe apenas as informações necessárias para que a equipe compreenda seu pedido.</InfoPanel>
      <InfoPanel title="Em uma emergência" tone="warm">Este formulário não substitui os serviços de emergência. Em risco imediato, procure o serviço adequado.</InfoPanel>
    </>}>
      <Card>
        <CardHeader><CardTitle>Registro de demanda</CardTitle><CardDescription>Conte sua necessidade. Você poderá conferir tudo antes de enviar.</CardDescription></CardHeader>
        <CardContent>
          <FlowSteps labels={["Sua solicitação", "Revisar dados", "Pedido recebido"]} current={0} />
          <form onSubmit={submit}>
            <section className="flow-section">
              <h3 className="mb-4 font-semibold">Quem está solicitando</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2"><Label htmlFor="demand-name">Nome completo *</Label><Input id="demand-name" value={requesterName} readOnly aria-describedby="demand-name-help" /></div>
                <div className="grid gap-2"><Label htmlFor="demand-phone">Telefone / WhatsApp *</Label><Input id="demand-phone" type="tel" autoComplete="tel" value={draft.phone} maxLength={32} onChange={event => update("phone", event.target.value)} placeholder="(11) 90000-0000" required /></div>
                <div className="grid gap-2"><Label htmlFor="demand-neighborhood">Bairro *</Label><Input id="demand-neighborhood" value={draft.neighborhood} maxLength={120} onChange={event => update("neighborhood", event.target.value)} required /></div>
                <div className="grid gap-2"><Label htmlFor="demand-return">Como prefere receber o retorno? *</Label><Select id="demand-return" value={draft.returnPreference} onChange={event => update("returnPreference", event.target.value as DemandDraft["returnPreference"])} required><option value="">Selecione</option>{options.returnPreferences.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></div>
              </div>
              <p id="demand-name-help" className="mt-3 text-xs text-muted-foreground">O nome vem da sua conta. Preencher este formulário não altera os dados da conta.</p>
            </section>
            <section className="flow-section grid gap-4">
              <h3 className="font-semibold">O que você precisa?</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2"><Label htmlFor="demand-category">Tipo de pedido *</Label><Select id="demand-category" value={draft.category} onChange={event => update("category", event.target.value as DemandDraft["category"])} required><option value="">Selecione</option>{options.categories.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></div>
                <div className="grid gap-2"><Label htmlFor="demand-urgent">Precisa de atenção urgente? *</Label><Select id="demand-urgent" value={draft.urgent} onChange={event => update("urgent", event.target.value as DemandDraft["urgent"])} required><option value="">Selecione</option><option value="true">Sim</option><option value="false">Não</option></Select></div>
              </div>
              {draft.category === "OTHER" ? <div className="grid gap-2"><Label htmlFor="demand-other">Especifique o pedido *</Label><Input id="demand-other" value={draft.otherDescription} maxLength={200} onChange={event => update("otherDescription", event.target.value)} required /></div> : null}
              <p className="text-xs text-muted-foreground">A urgência informada expressa sua percepção e não significa aprovação ou prioridade automática.</p>
              <div className="grid gap-2"><Label htmlFor="demand-description">Conte um pouco sobre a sua necessidade *</Label>
                <textarea id="demand-description" className="min-h-36 w-full resize-y rounded-md border border-input bg-background px-3 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={draft.description} onChange={event => update("description", event.target.value)} maxLength={2000} required aria-describedby="demand-description-help" placeholder="Descreva o apoio de que precisa e o que gostaria de compartilhar com a equipe." />
                <div id="demand-description-help" className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>Compartilhe apenas as informações necessárias para o atendimento.</span><span>{draft.description.length}/2.000</span></div>
              </div>
            </section>
            <section className="flow-section rounded-md border border-dashed bg-muted/20 p-4" aria-label="Anexo indisponível" aria-disabled="true"><h3 className="text-sm font-medium">Anexar informação de apoio</h3><p className="mt-1 text-xs text-muted-foreground">Opcional · Indisponível nesta versão. Nenhum arquivo será solicitado ou enviado.</p></section>
            <div className="mt-5"><label className="flex cursor-pointer items-start gap-2 text-xs" htmlFor="demand-consent"><input id="demand-consent" type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-primary" checked={draft.contactConsent} onChange={event => update("contactConsent", event.target.checked)} required /><span>{options.consent.text} *</span></label></div>
            {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
            <div className="flow-actions"><Button type="button" variant="outline" onClick={onBack}>Voltar</Button><Button type="submit">Revisar solicitação</Button></div>
          </form>
        </CardContent>
      </Card>
    </FlowLayout>
  );
}

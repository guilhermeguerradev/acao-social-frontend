import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { endpoints } from "../../lib/api";
import type { Demand, SessionUser } from "../../lib/types";
import { formatDateTime, normalizeApiError } from "../../lib/utils";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { DemandForm } from "./DemandForm";
import { DemandSummary } from "./DemandSummary";
import { FlowLayout, FlowSteps, InfoPanel } from "../ui/flow-layout";
import { CopyButton } from "../ui/copy-button";
import { Badge } from "../ui/badge";
import { demandLabel, demandPayload, emptyDemandDraft, useDemandOptions, validateDemandDraft } from "../../lib/demand-options";
import { DemandDraftSummary } from "./DemandDraftSummary";

export function DemandFlow({
  user,
  onBack,
  onViewDemands,
  onCreated,
}: {
  user: SessionUser;
  onBack: () => void;
  onViewDemands: () => void;
  onCreated: () => void;
}) {
  const [draft, setDraft] = useState(emptyDemandDraft);
  const [requestKey, setRequestKey] = useState(() => window.crypto.randomUUID());
  const [step, setStep] = useState<"entry" | "review" | "sent">("entry");
  const [received, setReceived] = useState<Demand | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const configuration = useDemandOptions();

  async function send() {
    if (submitting.current || !configuration.options) return;
    const validationError = validateDemandDraft(draft, configuration.options);
    if (validationError) { setError(validationError); return; }
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const demand = await endpoints.createDemand(demandPayload(draft, requestKey));
      setReceived(demand);
      setStep("sent");
      onCreated();
    } catch (failure) {
      setError(normalizeApiError(failure));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (!configuration.options) {
    return <Card><CardHeader><CardTitle>Solicitar apoio</CardTitle></CardHeader><CardContent className="grid justify-items-start gap-4">
      {configuration.loading ? <p role="status">Carregando formulário...</p> : <><p role="alert" className="text-sm text-destructive">{configuration.error}</p><Button type="button" onClick={configuration.retry}>Tentar novamente</Button></>}
    </CardContent></Card>;
  }
  const options = configuration.options;
  if (step === "entry") {
    return <DemandForm requesterName={user.name} draft={draft} options={options} onChange={setDraft} onContinue={() => { const message = validateDemandDraft(draft, options); if (message) { setError(message); return; } setError(""); setStep("review"); }} onBack={onBack} />;
  }

  if (step === "sent" && received) {
    return (
      <FlowLayout aside={<>
        <Card><CardHeader><CardTitle>Seu pedido, em resumo</CardTitle></CardHeader><CardContent><DemandSummary demand={received} compact /></CardContent></Card>
        <InfoPanel title="Guarde este registro">A identificação permite localizar sua solicitação na área de demandas.</InfoPanel>
      </>}>
      <Card>
        <CardHeader>
          <CardTitle>Solicitação enviada</CardTitle>
          <CardDescription>Sua solicitação foi recebida. O recebimento não significa aprovação do apoio.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <FlowSteps labels={["Sua solicitação", "Revisar dados", "Pedido recebido"]} current={2} />
          <section className="flow-section grid gap-4">
            <h3 className="font-semibold">Registro confirmado</h3>
            <div className="flex flex-wrap items-center justify-between gap-3"><Badge variant="secondary">Recebida</Badge><CopyButton value={received.id} /></div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Identificação da solicitação</p>
            <p className="select-all break-all text-xl font-semibold tracking-tight">{received.id}</p>
            <p className="text-xs text-muted-foreground">Recebida em {formatDateTime(received.createdAt)}</p>
          </section>
          <section className="flow-section">
            <h3 className="mb-5 font-semibold">E agora, o que acontece?</h3>
            <ol className="grid gap-5 text-sm">
              <li className="flex gap-3"><span className="text-primary">1.</span><div><strong className="font-medium">Seu pedido está registrado</strong><p className="mt-1 text-xs text-muted-foreground">Os dados foram recebidos e podem ser consultados pela equipe autorizada.</p></div></li>
              <li className="flex gap-3"><span className="text-primary">2.</span><div><strong className="font-medium">Consulte sua solicitação</strong><p className="mt-1 text-xs text-muted-foreground">Acesse a área de demandas para conferir as informações enviadas.</p></div></li>
              <li className="flex gap-3"><span className="text-primary">3.</span><div><strong className="font-medium">Guarde a identificação</strong><p className="mt-1 text-xs text-muted-foreground">Tenha esse registro em mãos ao conversar com a equipe.</p></div></li>
            </ol>
          </section>
          <InfoPanel title="Recebimento não é garantia de atendimento" tone="warm">Esta confirmação registra o envio do pedido. Não representa aprovação do apoio ou definição de prazo de atendimento.</InfoPanel>
          <div className="flow-actions">
            <Button type="button" onClick={onViewDemands}>Consultar demandas</Button>
            <Button type="button" variant="outline" onClick={() => {
              setDraft(emptyDemandDraft()); setRequestKey(window.crypto.randomUUID()); setReceived(null); setError(""); setStep("entry");
            }}>Nova solicitação</Button>
            <Button type="button" variant="outline" onClick={onBack}>Voltar ao resumo</Button>
          </div>
        </CardContent>
      </Card>
      </FlowLayout>
    );
  }

  return (
    <FlowLayout aside={<>
      <Card><CardHeader><CardTitle>Resumo do pedido</CardTitle></CardHeader><CardContent className="grid gap-4">
        <Badge variant="outline" className="justify-self-start border-amber-200 bg-amber-50 text-amber-900">Ainda não enviada</Badge>
        <dl className="grid gap-4 text-xs">
          <div><dt className="text-muted-foreground">Solicitante</dt><dd className="mt-1 break-words font-medium">{user.name}</dd></div>
          <div><dt className="text-muted-foreground">Categoria</dt><dd className="mt-1">{demandLabel(options, "categories", draft.category)}</dd></div>
          <div><dt className="text-muted-foreground">Retorno preferido</dt><dd className="mt-1">{demandLabel(options, "returnPreferences", draft.returnPreference)}</dd></div>
          <div><dt className="text-muted-foreground">Contato</dt><dd className="mt-1">{draft.phone}</dd></div>
          <div><dt className="text-muted-foreground">Bairro</dt><dd className="mt-1 break-words">{draft.neighborhood}</dd></div>
        </dl>
      </CardContent></Card>
      <InfoPanel title="O que acontece ao enviar?">O pedido será registrado como “Recebida”. O envio não garante o atendimento.</InfoPanel>
      <InfoPanel title="Se precisar corrigir">Volte à etapa anterior. As informações preenchidas serão mantidas.</InfoPanel>
    </>}>
    <Card>
      <CardHeader>
        <CardTitle>Revisão de demanda</CardTitle>
        <CardDescription>Confira as informações antes de confirmar o envio.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <FlowSteps labels={["Sua solicitação", "Revisar dados", "Pedido recebido"]} current={1} />
        <DemandDraftSummary draft={draft} requesterName={user.name} options={options} />
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <div className="flow-actions">
          <Button type="button" disabled={busy} onClick={send}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {busy ? "Enviando..." : "Confirmar envio"}
          </Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => setStep("entry")}>Voltar e editar</Button>
          {error ? <Button type="button" variant="outline" disabled={busy} onClick={onViewDemands}>Consultar demandas recebidas</Button> : null}
        </div>
      </CardContent>
    </Card>
    </FlowLayout>
  );
}

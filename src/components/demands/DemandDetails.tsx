import { useEffect, useState } from "react";
import { endpoints } from "../../lib/api";
import type { Demand } from "../../lib/types";
import { normalizeApiError } from "../../lib/utils";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { DemandSummary } from "./DemandSummary";
import { FlowLayout, InfoPanel } from "../ui/flow-layout";
import { CopyButton } from "../ui/copy-button";

export function DemandDetails({ demandId, onBack }: { demandId: string; onBack: () => void }) {
  const [state, setState] = useState<{ demand: Demand | null; loading: boolean; error: string }>({ demand: null, loading: true, error: "" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ demand: null, loading: true, error: "" });
    endpoints.getDemand(demandId, controller.signal)
      .then(demand => { if (!controller.signal.aborted) setState({ demand, loading: false, error: "" }); })
      .catch(error => { if (!controller.signal.aborted) setState({ demand: null, loading: false, error: normalizeApiError(error) }); });
    return () => controller.abort();
  }, [demandId, attempt]);

  return (
    <FlowLayout aside={<>
      <Card><CardHeader><CardTitle>Identificação do pedido</CardTitle></CardHeader><CardContent className="grid gap-4"><p className="select-all break-all font-mono text-xs">{demandId}</p><CopyButton value={demandId} /><p className="text-xs text-muted-foreground">Use esta identificação ao conversar com a equipe.</p></CardContent></Card>
      <InfoPanel title="Recebimento da solicitação">O registro confirma o recebimento do pedido, sem representar aprovação ou garantia de atendimento.</InfoPanel>
    </>}>
    <Card>
      <CardHeader><CardTitle>Detalhes da demanda</CardTitle></CardHeader>
      <CardContent className="grid justify-items-start gap-5">
        {state.loading ? <p role="status">Carregando demanda...</p> : state.error ? (
          <>
            <p role="alert" className="text-sm text-destructive">{state.error}</p>
            <Button type="button" variant="outline" onClick={() => setAttempt(current => current + 1)}>Tentar novamente</Button>
          </>
        ) : state.demand ? <DemandSummary demand={state.demand} /> : null}
        <Button type="button" variant="outline" onClick={onBack}>Voltar à listagem</Button>
      </CardContent>
    </Card>
    </FlowLayout>
  );
}

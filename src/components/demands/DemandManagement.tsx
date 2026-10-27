import { useState } from "react";
import { Search, RefreshCw, Plus } from "lucide-react";
import { useListing } from "../../lib/listing";
import type { Demand, Role } from "../../lib/types";
import { formatDateTime } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { EmptyState } from "../ui/empty-state";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { FlowLayout, InfoPanel } from "../ui/flow-layout";
import { DemandDetails } from "./DemandDetails";
import { demandLabel, formatDemandPhone, useDemandOptions } from "../../lib/demand-options";

export function DemandManagement({ role, revision, onRegister }: { role: Role; revision: number; onRegister: () => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const listing = useListing<Demand>("demandas", `${revision}:${attempt}`, selectedId === null);
  const professional = role === "ADMIN" || role === "MEDICO" || role === "INSTRUTOR";
  const { options } = useDemandOptions();
  if (selectedId) return <DemandDetails key={selectedId} demandId={selectedId} onBack={() => setSelectedId(null)} />;

  return (
    <FlowLayout aside={<>
      <Card><CardHeader><CardTitle>Registrar demanda</CardTitle><CardDescription>Uma nova necessidade começa com um pedido.</CardDescription></CardHeader>
        <CardContent className="grid gap-4"><p className="text-xs text-muted-foreground">Conte o apoio de que precisa e revise as informações antes de enviar.</p><Button type="button" onClick={onRegister}><Plus className="h-4 w-4" aria-hidden="true" />Registrar demanda</Button></CardContent>
      </Card>
      <InfoPanel title="Cada pedido fica registrado">Abra um cartão para consultar a descrição completa, o solicitante e a identificação.</InfoPanel>
      <InfoPanel title="Recebimento do pedido" tone="warm">A situação “Recebida” confirma o registro da solicitação. Não representa aprovação ou garantia de atendimento.</InfoPanel>
    </>}>
      <Card>
        <CardHeader><CardTitle>{professional ? "Gestão interna de demandas" : "Minhas demandas"}</CardTitle><CardDescription>Um quadro simples para acompanhar os pedidos recebidos. Nenhuma necessidade fica para trás.</CardDescription></CardHeader>
        <CardContent className="grid gap-5" aria-busy={listing.loading}>
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{listing.total} {listing.total === 1 ? "solicitação recebida" : "solicitações recebidas"}{professional ? " pela equipe" : " da sua conta"}</p><Button type="button" variant="outline" size="sm" disabled={listing.loading} onClick={() => setAttempt(current => current + 1)}><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />Atualizar</Button></div>
          <div className="grid gap-2"><Label htmlFor="demand-search">Buscar solicitação</Label><div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" /><Input id="demand-search" className="pl-9" placeholder="Buscar por nome, identificação ou descrição" value={String(listing.filters.search ?? "")} maxLength={120} onChange={event => listing.filter("search", event.target.value)} /></div>{listing.filters.search ? <div><Button type="button" variant="ghost" size="sm" onClick={listing.clear}>Limpar busca</Button></div> : null}</div>
          <section className="rounded-md border bg-muted/20 p-3" aria-label="Demandas recebidas">
            <div className="mb-4 flex items-center justify-between"><Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900">Recebida</Badge><span className="text-xs text-muted-foreground">{listing.total}</span></div>
            {listing.loading ? <p role="status" className="p-4 text-sm text-muted-foreground">Carregando demandas...</p> : listing.error ? <p role="alert" className="p-4 text-sm text-destructive">{listing.error}</p> : listing.data.length ? (
              <div className="grid items-start gap-3 md:grid-cols-2 lg:max-h-[800px] lg:overflow-y-auto lg:pr-1 xl:grid-cols-3">{listing.data.map(demand => (
                <article key={demand.id} className="grid h-full gap-3 rounded-md border bg-card p-4 shadow-sm">
                  <span className="break-all font-mono text-[10px] text-muted-foreground">{demand.id}</span>
                  <h3 className="font-semibold">{demand.category ? demandLabel(options, "categories", demand.category) : "Solicitação de apoio"}</h3>
                  {demand.urgent ? <Badge variant="outline" className="justify-self-start border-amber-200 bg-amber-50 text-amber-900">Urgência informada</Badge> : null}
                  <div className="text-xs"><p className="break-words font-medium">{demand.requester.name}</p>{demand.neighborhood ? <p className="mt-1 break-words text-muted-foreground">{demand.neighborhood}</p> : null}<p className="mt-1 text-muted-foreground">{formatDateTime(demand.createdAt)}</p></div>
                  <p className="line-clamp-4 whitespace-pre-wrap break-words text-xs text-muted-foreground">{demand.description}</p>
                  {demand.phone ? <p className="text-xs">{demandLabel(options, "returnPreferences", demand.returnPreference)}: {formatDemandPhone(demand.phone)}</p> : null}
                  <div className="mt-auto border-t pt-3"><Button type="button" size="sm" variant="outline" className="w-full" onClick={() => setSelectedId(demand.id)}>Ver detalhes</Button></div>
                </article>
              ))}</div>
            ) : <EmptyState message={listing.filters.search ? "Nenhuma solicitação corresponde à busca." : "Nenhuma demanda recebida."} />}
          </section>
          {!listing.error ? <nav className="flex flex-wrap items-center gap-3" aria-label="Páginas de demandas"><Button type="button" variant="outline" size="sm" disabled={listing.loading || listing.page <= 1} onClick={() => listing.go(listing.page - 1)}>Anterior</Button><span className="text-xs" aria-live="polite">Página {listing.page} de {Math.max(1, listing.totalPages)} · {listing.total} resultados</span><Button type="button" variant="outline" size="sm" disabled={listing.loading || listing.page >= listing.totalPages} onClick={() => listing.go(listing.page + 1)}>Próxima</Button></nav> : null}
        </CardContent>
      </Card>
    </FlowLayout>
  );
}

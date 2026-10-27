import {
  type Dispatch,
  type FormEvent,
  type ComponentProps,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  BookOpen,
  CalendarClock,
  GraduationCap,
  Loader2,
  LogOut,
  type LucideIcon,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { useListing } from "./lib/listing";
import { parseArray } from "./lib/response-validation";
import { api, endpoints, clearStoredSession, getStoredSession, saveSession } from "./lib/api";
import type { Aula, Beneficiario, Consulta, DashboardData, Instrutor, Matricula, Medico, Role, Session, User } from "./lib/types";
import { formatDateTime, normalizeApiError, toIsoFromLocalDateTime } from "./lib/utils";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { EmptyState } from "./components/ui/empty-state";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Select } from "./components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./components/ui/table";
import { Tabs } from "./components/ui/tabs";
import { CourseCatalog } from "./components/courses/CourseCatalog";
import { DemandFlow } from "./components/demands/DemandFlow";
import { DemandManagement } from "./components/demands/DemandManagement";

type ActiveTab = "dashboard" | "apoio" | "demandas" | "cursos" | "beneficiarios" | "consultas" | "aulas" | "matriculas" | "admin";

const initialData: DashboardData = {
  beneficiarios: [],
  consultas: [],
  aulas: [],
  matriculas: [],
  users: [],
  medicos: [],
  instrutores: [],
  errors: [],
};

const tabs = [
  { value: "dashboard", label: "Resumo" },
  { value: "apoio", label: "Solicitar apoio" },
  { value: "demandas", label: "Demandas" },
  { value: "cursos", label: "Cursos" },
  { value: "beneficiarios", label: "Beneficiarios" },
  { value: "consultas", label: "Consultas" },
  { value: "aulas", label: "Aulas" },
  { value: "matriculas", label: "Matriculas" },
  { value: "admin", label: "Usuarios" },
] satisfies { value: ActiveTab; label: string }[];

function roleLabel(role: Role) {
  if (role === "ADMIN") return "Administrador";
  if (role === "MEDICO") return "Medico";
  if (role === "INSTRUTOR") return "Instrutor";
  return "Sem perfil";
}

function getAulaDisponiveis(aula: Aula) {
  return Math.max(aula.vagas - aula._count.matriculas, 0);
}

function App() {
  const [session, setSession] = useState<Session | null>(() => getStoredSession());
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [demandRevision, setDemandRevision] = useState(0);
  const loadingRef = useRef<string | null>(null);
  const loadedTokenRef = useRef<string | null>(null);

  const loadData = useCallback(async (force = false) => {
    if (!session) return;
    if (loadingRef.current === session.token) return;
    if (!force && loadedTokenRef.current === session.token) return;

    loadingRef.current = session.token;
    setLoading(true);
    setMessage(null);
    setDashboardError(null);

    try {
      const dashboard = await endpoints.getDashboard();
      if (getStoredSession()?.token !== session.token) return;
      setData((current) => ({
        ...current,
        ...dashboard,
        users: current.users,
        medicos: current.medicos,
        instrutores: current.instrutores,
      }));
      loadedTokenRef.current = session.token;
      setMessage(
        dashboard.errors?.length
          ? `Algumas rotas nao carregaram: ${dashboard.errors.join(" | ")}`
          : null,
      );
    } catch (error) {
      if (getStoredSession()?.token !== session.token) return;
      const text = normalizeApiError(error);
      setDashboardError(text);
    } finally {
      if (loadingRef.current === session.token) {
        loadingRef.current = null;
        setLoading(false);
      }
    }
  }, [session]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const expire = () => {
      setSession(null); setData(initialData); loadedTokenRef.current = null;
      setDashboardError(null);
      setActiveTab("dashboard");
      setMessage("Sessao expirada. Entre novamente.");
    };
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, []);

  function handleLogout() {
    clearStoredSession();
    setSession(null);
    setData(initialData);
    setDashboardError(null);
    loadedTokenRef.current = null;
    setActiveTab("dashboard");
  }

  async function runAction(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setMessage(null);

    try {
      await action();
      setData(current => ({ ...current }));
      await loadData(true);
      setMessage(success);
    } catch (error) {
      setMessage(normalizeApiError(error));
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <AuthScreen
        notice={message}
        onSession={(nextSession) => {
          setMessage(null);
          setActiveTab("dashboard");
          saveSession(nextSession);
          setSession(nextSession);
        }}
      />
    );
  }

  const canManageUsers = session.user.role === "ADMIN";

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-normal">Acao Social</h1>
              <p className="text-sm text-muted-foreground">Atendimentos, aulas e matriculas em um so painel.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={session.user.role ? "default" : "outline"}>{roleLabel(session.user.role)}</Badge>
            <span className="max-w-64 truncate text-sm text-muted-foreground">{session.user.name}</span>
            <Button variant="outline" size="sm" onClick={() => loadData(true)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6">
        {message ? (
          <div role="status" className="rounded-lg border bg-card px-4 py-3 text-sm text-card-foreground shadow-sm">{message}</div>
        ) : null}

        <Tabs items={tabs.map(tab => tab.value === "admin" && !canManageUsers ? { ...tab, label: "Minha conta" } : tab)} value={activeTab} onChange={setActiveTab} />

        {activeTab === "dashboard" ? loading ? <p role="status">Carregando resumo...</p> : dashboardError ? <p role="alert" className="text-destructive">{dashboardError}</p> : <Dashboard data={data} role={session.user.role} /> : null}
        <div hidden={activeTab !== "apoio"}>
          <DemandFlow
            key={session.user.id}
            user={session.user}
            onBack={() => setActiveTab("dashboard")}
            onViewDemands={() => setActiveTab("demandas")}
            onCreated={() => setDemandRevision(current => current + 1)}
          />
        </div>
        {activeTab === "demandas" ? <DemandManagement role={session.user.role} revision={demandRevision} onRegister={() => setActiveTab("apoio")} /> : null}
        {activeTab === "cursos" ? <CourseCatalog revision={data} /> : null}
        {activeTab === "beneficiarios" ? <Beneficiarios data={data} busy={busy} runAction={runAction} /> : null}
        {activeTab === "consultas" ? (
          <Consultas data={data} session={session} busy={busy} runAction={runAction} />
        ) : null}
        {activeTab === "aulas" ? <Aulas data={data} session={session} busy={busy} runAction={runAction} /> : null}
        {activeTab === "matriculas" ? <Matriculas data={data} busy={busy} runAction={runAction} /> : null}
        {activeTab === "admin" ? (
          <Admin
            data={data}
            setData={setData}
            session={session}
            setSession={setSession}
            canManageUsers={canManageUsers}
            busy={busy}
            setMessage={setMessage}
            runAction={runAction}
          />
        ) : null}
      </main>
    </div>
  );
}

function AuthScreen({ onSession, notice }: { onSession: (session: Session) => void; notice?: string | null }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<"medico" | "instrutor">("medico");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function changeMode(nextMode: "login" | "register") {
    setMode(nextMode);
    setName("");
    setEmail("");
    setPassword("");
    setMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      if (mode === "register") {
        await endpoints.register(role, { name, email, password });
        changeMode("login");
        setMessage("Cadastro criado. Entre com o email e senha cadastrados.");
        return;
      }

      const nextSession = await endpoints.login(email, password);
      onSession(nextSession);
    } catch (error) {
      setMessage(normalizeApiError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <CardTitle>Acesso ao sistema</CardTitle>
          <CardDescription>Use uma conta de medico ou instrutor para liberar as operacoes protegidas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            <Button type="button" disabled={busy} variant={mode === "login" ? "secondary" : "ghost"} onClick={() => changeMode("login")}>
              Login
            </Button>
            <Button type="button" disabled={busy} variant={mode === "register" ? "secondary" : "ghost"} onClick={() => changeMode("register")}>
              Cadastro
            </Button>
          </div>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            {mode === "register" ? (
              <>
                <Field label="Nome">
                  <Input name="name" autoComplete="name" placeholder="Seu nome completo" value={name} onChange={(event) => setName(event.target.value)} required minLength={1} maxLength={120} />
                </Field>
                <Field label="Perfil">
                  <Select value={role} onChange={(event) => setRole(event.target.value as "medico" | "instrutor")}>
                    <option value="medico">Medico</option>
                    <option value="instrutor">Instrutor</option>
                  </Select>
                </Field>
              </>
            ) : null}
            <Field label="Email">
              <Input name="email" type="email" autoComplete="off" placeholder="seuemail@dominio.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </Field>
            <Field label="Senha">
              <Input
                type="password"
                name="password"
                autoComplete={mode === "register" ? "new-password" : "off"}
                placeholder={mode === "register" ? "Crie uma senha com pelo menos 8 caracteres" : "Digite sua senha"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={mode === "login" ? 6 : 8}
                maxLength={72}
              />
            </Field>
            {message || notice ? <p role="alert" className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{message ?? notice}</p> : null}
            <Button disabled={busy} type="submit">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function Dashboard({ data, role }: { data: DashboardData; role: Role }) {
  const proximasConsultas = data.consultas.slice(0, 5);
  const aulasComVaga = data.totals?.availableAulas ?? 0;

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Users} label="Beneficiarios" value={data.totals?.beneficiarios ?? 0} />
        <Metric icon={CalendarClock} label="Consultas" value={data.totals?.consultas ?? 0} />
        <Metric icon={BookOpen} label="Aulas com vaga" value={aulasComVaga} />
        <Metric icon={GraduationCap} label="Matriculas" value={data.totals?.matriculas ?? 0} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Proximas consultas</CardTitle>
            <CardDescription>A API retorna a agenda geral em ordem crescente.</CardDescription>
          </CardHeader>
          <CardContent>
            {proximasConsultas.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Beneficiario</TableHead>
                    <TableHead>Medico</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proximasConsultas.map((consulta) => (
                    <TableRow key={consulta.id}>
                      <TableCell>{formatDateTime(consulta.dataHora)}</TableCell>
                      <TableCell>{consulta.beneficiario.name}</TableCell>
                      <TableCell>{consulta.medico.user.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState message="Nenhuma consulta agendada." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permissoes ativas</CardTitle>
            <CardDescription>Os botoes respeitam o papel retornado no login.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <Permission allowed={role === "ADMIN" || role === "MEDICO"} label="Gerenciar consultas conforme seu perfil." />
            <Permission allowed={role === "ADMIN" || role === "INSTRUTOR"} label="Gerenciar aulas conforme seu perfil." />
            <Permission allowed={role === "ADMIN"} label="Gerenciar usuarios e perfis." />
            <Permission allowed={Boolean(role)} label="Cadastrar beneficiarios e matriculas." />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Beneficiarios({
  data,
  busy,
  runAction,
}: {
  data: DashboardData;
  busy: boolean;
  runAction: (action: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const listing = useListing<Beneficiario>("beneficiarios", data);
  const [editingId, setEditingId] = useState<string | null>(null);
  const cancel = () => { setEditingId(null); setName(""); setTelefone(""); };
  const [name, setName] = useState("");
  const [telefone, setTelefone] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async () => {
      if (editingId) await endpoints.updateBeneficiario(editingId, { name, telefone });
      else await endpoints.createBeneficiario({ name, telefone });
      setEditingId(null);
      setName("");
      setTelefone("");
    }, "Beneficiario salvo.");
  }

  return (
    <ResourceLayout
      title="Beneficiarios"
      description="Cadastro e edicao da pessoa atendida."
      aside={
        <FormCard title={editingId ? "Editar beneficiario" : "Novo beneficiario"} onSubmit={submit} busy={busy} submitLabel={editingId ? "Salvar" : "Cadastrar"}>
          <Field label="Nome">
            <Input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} />
          </Field>
          <Field label="Telefone">
            <Input value={telefone} onChange={(event) => setTelefone(event.target.value)} maxLength={20} />
          </Field>
          {editingId ? <Button type="button" variant="outline" disabled={busy} onClick={cancel}>Cancelar</Button> : null}
        </FormCard>
      }
    >
      <div className="mb-4 flex gap-2"><Input aria-label="Buscar beneficiario" placeholder="Buscar beneficiario" value={String(listing.filters.search ?? "")} onChange={event => listing.filter("search", event.target.value)} maxLength={120} /><Button variant="outline" onClick={listing.clear}>Limpar</Button></div>
      <ListStatus listing={listing} />
      {listing.data.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listing.data.map((beneficiario) => (
              <TableRow key={beneficiario.id}>
                <TableCell className="font-medium">{beneficiario.name}</TableCell>
                <TableCell>{beneficiario.telefone || "-"}</TableCell>
                <TableCell>{formatDateTime(beneficiario.createdAt)}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => { setEditingId(beneficiario.id); setName(beneficiario.name); setTelefone(beneficiario.telefone ?? ""); }}>Editar</Button>
                  <DeleteButton
                    variant="ghost"
                    size="icon"
                    aria-label="Remover beneficiario"
                    disabled={busy}
                    onClick={() =>
                      runAction(() => endpoints.deleteBeneficiario(beneficiario.id), "Beneficiario removido.")
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </DeleteButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState message="Nenhum beneficiario cadastrado." />
      )}
    </ResourceLayout>
  );
}

function Consultas({
  data,
  session,
  busy,
  runAction,
}: {
  data: DashboardData;
  session: Session;
  busy: boolean;
  runAction: (action: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const listing = useListing<Consulta>("consultas", data);
  const options = useOptions(data, "consultas");
  const [medicoId, setMedicoId] = useState("");
  const [editing, setEditing] = useState<Consulta | null>(null);
  const [beneficiarioId, setBeneficiarioId] = useState("");
  const [dataHora, setDataHora] = useState("");
  const canCreate = session.user.role === "ADMIN" || session.user.role === "MEDICO";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async () => {
      if (editing) await endpoints.updateConsulta(editing.id, { dataHora: toIsoFromLocalDateTime(dataHora) });
      else await endpoints.createConsulta({ beneficiarioId, dataHora: toIsoFromLocalDateTime(dataHora), ...(session.user.role === "ADMIN" ? { medicoId } : {}) });
      setEditing(null);
      setBeneficiarioId("");
      setDataHora("");
    }, "Consulta salva.");
  }

  return (
    <ResourceLayout
      title="Consultas"
      description="Medicos gerenciam suas consultas; administradores podem gerenciar todas."
      aside={
        <FormCard title={editing ? "Reagendar consulta" : "Agendar consulta"} onSubmit={submit} busy={busy || !canCreate} submitLabel={editing ? "Salvar" : "Agendar"}>
          {session.user.role === "ADMIN" && !editing ? <Field label="Medico responsavel"><Select value={medicoId} onChange={event => setMedicoId(event.target.value)} required><option value="">Selecione</option>{options.medicos.map(item => <option key={item.id} value={item.id}>{item.user.name}</option>)}</Select></Field> : null}
          {!canCreate ? <p className="text-sm text-muted-foreground">Apenas contas com perfil de medico podem criar consultas.</p> : null}
          <Field label="Beneficiario">
            <Select value={beneficiarioId} onChange={(event) => setBeneficiarioId(event.target.value)} required disabled={!canCreate || Boolean(editing)}>
              <option value="">Selecione</option>
              {options.beneficiarios.map((beneficiario) => (
                <option key={beneficiario.id} value={beneficiario.id}>
                  {beneficiario.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Data e hora">
            <Input
              type="datetime-local"
              value={dataHora}
              onChange={(event) => setDataHora(event.target.value)}
              required
              disabled={!canCreate}
            />
          </Field>
          {editing ? <><p className="text-sm">Horario atual: {formatDateTime(editing.dataHora)}</p><Button type="button" variant="outline" disabled={busy} onClick={() => { setEditing(null); setBeneficiarioId(""); setDataHora(""); }}>Cancelar</Button></> : null}
        </FormCard>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Field label="Medico"><Select value={String(listing.filters.medicoId ?? "")} onChange={event => listing.filter("medicoId", event.target.value)}><option value="">Todos</option>{options.medicos.map(item => <option key={item.id} value={item.id}>{item.user.name}</option>)}</Select></Field>
        <Field label="Beneficiario"><Select value={String(listing.filters.beneficiarioId ?? "")} onChange={event => listing.filter("beneficiarioId", event.target.value)}><option value="">Todos</option>{options.beneficiarios.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
        <Field label="De"><Input type="datetime-local" value={fromIso(listing.filters.startDate)} onChange={event => listing.filter("startDate", event.target.value ? toIsoFromLocalDateTime(event.target.value) : "")} /></Field>
        <Field label="Ate"><Input type="datetime-local" value={fromIso(listing.filters.endDate)} onChange={event => listing.filter("endDate", event.target.value ? toIsoFromLocalDateTime(event.target.value) : "")} /></Field>
        <Button variant="outline" onClick={listing.clear}>Limpar filtros</Button>
      </div>
      {options.error ? <p role="alert">{options.error}</p> : null}
      <ListStatus listing={listing} />
      {listing.data.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Beneficiario</TableHead>
              <TableHead>Medico</TableHead>
              <TableHead className="w-28">Acao</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listing.data.map((consulta) => {
              const canEdit = session.user.role === "ADMIN" || (session.user.role === "MEDICO" && consulta.medico.userId === session.user.id);

              return (
                <TableRow key={consulta.id}>
                  <TableCell>{formatDateTime(consulta.dataHora)}</TableCell>
                  <TableCell>{consulta.beneficiario.name}</TableCell>
                  <TableCell>{consulta.medico.user.name}</TableCell>
                  <TableCell>
                    {canEdit ? <Button variant="outline" size="sm" disabled={busy} onClick={() => { setEditing(consulta); setBeneficiarioId(consulta.beneficiarioId); setDataHora(fromIso(consulta.dataHora)); }}>Reagendar</Button> : null}
                    <DeleteButton
                      variant="ghost"
                      size="icon"
                      aria-label="Remover consulta"
                      disabled={busy || !canEdit}
                      onClick={() => runAction(() => endpoints.deleteConsulta(consulta.id), "Consulta removida.")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </DeleteButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <EmptyState message="Nenhuma consulta encontrada." />
      )}
    </ResourceLayout>
  );
}

function Aulas({
  data,
  session,
  busy,
  runAction,
}: {
  data: DashboardData;
  session: Session;
  busy: boolean;
  runAction: (action: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const listing = useListing<Aula>("aulas", data);
  const options = useOptions(data, "aulas");
  const [instrutorId, setInstrutorId] = useState("");
  const [editing, setEditing] = useState<Aula | null>(null);
  const [titulo, setTitulo] = useState("");
  const [modalidade, setModalidade] = useState("");
  const [vagas, setVagas] = useState("10");
  const [selectedAulaId, setSelectedAulaId] = useState<string | null>(null);
  const canCreate = session.user.role === "ADMIN" || session.user.role === "INSTRUTOR";
  const selectedAula = listing.data.find((aula) => aula.id === selectedAulaId) ?? null;
  const enrolled = useListing<Matricula>("matriculas", selectedAulaId, Boolean(selectedAulaId));
  const selectedMatriculados = selectedAulaId && enrolled.filters.aulaId === selectedAulaId ? enrolled.data : [];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async () => {
      if (editing) await endpoints.updateAula(editing.id, { titulo, modalidade, vagas: Number(vagas) });
      else await endpoints.createAula({ titulo, modalidade, vagas: Number(vagas), ...(session.user.role === "ADMIN" ? { instrutorId } : {}) });
      setEditing(null);
      setTitulo("");
      setModalidade("");
      setVagas("10");
    }, "Aula salva.");
  }

  return (
    <ResourceLayout
      title="Aulas"
      description="Instrutores criam aulas; vagas disponiveis sao calculadas por vagas menos matriculas."
      aside={
        <FormCard title={editing ? "Editar aula" : "Nova aula"} onSubmit={submit} busy={busy || !canCreate} submitLabel={editing ? "Salvar" : "Criar aula"}>
          {session.user.role === "ADMIN" && !editing ? <Field label="Instrutor responsavel"><Select value={instrutorId} onChange={event => setInstrutorId(event.target.value)} required><option value="">Selecione</option>{options.instrutores.map(item => <option key={item.id} value={item.id}>{item.user.name}</option>)}</Select></Field> : null}
          {!canCreate ? <p className="text-sm text-muted-foreground">Apenas contas com perfil de instrutor podem criar aulas.</p> : null}
          <Field label="Titulo">
            <Input value={titulo} onChange={(event) => setTitulo(event.target.value)} required disabled={!canCreate} />
          </Field>
          <Field label="Modalidade">
            <Input value={modalidade} onChange={(event) => setModalidade(event.target.value)} required disabled={!canCreate} />
          </Field>
          <Field label="Vagas">
            <Input
              type="number"
              value={vagas}
              onChange={(event) => setVagas(event.target.value)}
              min={1}
              required
              disabled={!canCreate}
            />
          </Field>
          {editing ? <Button type="button" variant="outline" disabled={busy} onClick={() => { setEditing(null); setTitulo(""); setModalidade(""); setVagas("10"); }}>Cancelar</Button> : null}
        </FormCard>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Field label="Instrutor"><Select value={String(listing.filters.instrutorId ?? "")} onChange={event => listing.filter("instrutorId", event.target.value)}><option value="">Todos</option>{options.instrutores.map(item => <option key={item.id} value={item.id}>{item.user.name}</option>)}</Select></Field>
        <Field label="Modalidade"><Input value={String(listing.filters.modalidade ?? "")} onChange={event => listing.filter("modalidade", event.target.value)} maxLength={120} /></Field>
        <Field label="Disponibilidade"><Select value={String(listing.filters.available ?? "")} onChange={event => listing.filter("available", event.target.value)}><option value="">Todas</option><option value="true">Com vagas</option><option value="false">Lotadas</option></Select></Field>
        <Button variant="outline" onClick={listing.clear}>Limpar filtros</Button>
      </div>
      {options.error ? <p role="alert">{options.error}</p> : null}
      <ListStatus listing={listing} />
      {listing.data.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aula</TableHead>
              <TableHead>Modalidade</TableHead>
              <TableHead>Instrutor</TableHead>
              <TableHead>Matriculados</TableHead>
              <TableHead>Vagas</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listing.data.map((aula) => {
              const disponiveis = getAulaDisponiveis(aula);
              const canEdit = session.user.role === "ADMIN" || (session.user.role === "INSTRUTOR" && aula.instrutor.userId === session.user.id);


              return (
                <TableRow key={aula.id}>
                  <TableCell className="font-medium">{aula.titulo}</TableCell>
                  <TableCell>{aula.modalidade}</TableCell>
                  <TableCell>{aula.instrutor.user.name}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" type="button" onClick={() => { setSelectedAulaId(aula.id); enrolled.filter("aulaId", aula.id); }}>
                      Ver matriculados
                      <Badge variant="secondary">{aula._count.matriculas}</Badge>
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Badge variant={disponiveis > 0 ? "secondary" : "destructive"}>
                      {disponiveis}/{aula.vagas}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canEdit ? <Button variant="outline" size="sm" disabled={busy} onClick={() => { setEditing(aula); setTitulo(aula.titulo); setModalidade(aula.modalidade); setVagas(String(aula.vagas)); }}>Editar aula</Button> : null}
                    <DeleteButton
                      variant="ghost"
                      size="icon"
                      aria-label="Remover aula"
                      disabled={busy || !canEdit}
                      onClick={() => runAction(() => endpoints.deleteAula(aula.id), "Aula removida.")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </DeleteButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <EmptyState message="Nenhuma aula cadastrada." />
      )}

      {selectedAula ? (
        <Modal
          title={selectedAula.titulo}
          description={`${selectedAula.modalidade} - ${selectedAula.instrutor.user.name}`}
          onClose={() => setSelectedAulaId(null)}
        >
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={getAulaDisponiveis(selectedAula) > 0 ? "secondary" : "destructive"}>
                {getAulaDisponiveis(selectedAula)} vagas disponiveis
              </Badge>
              <Badge variant="outline">{selectedAula._count.matriculas} matriculados</Badge>
            </div>

            <ListStatus listing={enrolled} />
            {selectedMatriculados.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Beneficiario</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Matriculado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedMatriculados.map((matricula) => (
                    <TableRow key={matricula.id}>
                      <TableCell className="font-medium">{matricula.beneficiario.name}</TableCell>
                      <TableCell>{matricula.beneficiario.telefone || "-"}</TableCell>
                      <TableCell>{formatDateTime(matricula.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState message="Nenhum beneficiario matriculado nesta aula." />
            )}
          </div>
        </Modal>
      ) : null}
    </ResourceLayout>
  );
}

function Matriculas({
  data,
  busy,
  runAction,
}: {
  data: DashboardData;
  busy: boolean;
  runAction: (action: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const listing = useListing<Matricula>("matriculas", data);
  const options = useOptions(data, "matriculas");
  const [editing, setEditing] = useState<Matricula | null>(null);
  const [beneficiarioId, setBeneficiarioId] = useState("");
  const [aulaId, setAulaId] = useState("");

  const aulasDisponiveis = useMemo(() => options.aulas.filter((aula) => getAulaDisponiveis(aula) > 0 || aula.id === editing?.aulaId), [options.aulas, editing]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async () => {
      if (editing) await endpoints.updateMatricula(editing.id, { beneficiarioId, aulaId });
      else await endpoints.createMatricula({ beneficiarioId, aulaId });
      setEditing(null);
      setBeneficiarioId("");
      setAulaId("");
    }, "Matricula salva.");
  }

  return (
    <ResourceLayout
      title="Matriculas"
      description="A tela bloqueia aulas cheias, mas o backend continua validando vagas e duplicidade."
      aside={
        <FormCard title={editing ? "Editar matricula" : "Nova matricula"} onSubmit={submit} busy={busy} submitLabel={editing ? "Salvar" : "Matricular"}>
          <Field label="Beneficiario">
            <Select value={beneficiarioId} onChange={(event) => setBeneficiarioId(event.target.value)} required>
              <option value="">Selecione</option>
              {options.beneficiarios.map((beneficiario) => (
                <option key={beneficiario.id} value={beneficiario.id}>
                  {beneficiario.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Aula com vaga">
            <Select value={aulaId} onChange={(event) => setAulaId(event.target.value)} required>
              <option value="">Selecione</option>
              {aulasDisponiveis.map((aula) => (
                <option key={aula.id} value={aula.id}>
                  {aula.titulo} - {getAulaDisponiveis(aula)} vagas
                </option>
              ))}
            </Select>
          </Field>
          {editing ? <Button type="button" variant="outline" disabled={busy} onClick={() => { setEditing(null); setBeneficiarioId(""); setAulaId(""); }}>Cancelar</Button> : null}
        </FormCard>
      }
    >
      {options.error ? <p role="alert">{options.error}</p> : null}
      <ListStatus listing={listing} />
      {listing.data.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Beneficiario</TableHead>
              <TableHead>Aula</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listing.data.map((matricula: Matricula) => (
              <TableRow key={matricula.id}>
                <TableCell className="font-medium">{matricula.beneficiario.name}</TableCell>
                <TableCell>{matricula.aula.titulo}</TableCell>
                <TableCell>{formatDateTime(matricula.createdAt)}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => { setEditing(matricula); setBeneficiarioId(matricula.beneficiarioId); setAulaId(matricula.aulaId); }}>Editar matricula</Button>
                  <DeleteButton
                    variant="ghost"
                    size="icon"
                    aria-label="Remover matricula"
                    disabled={busy}
                    onClick={() => runAction(() => endpoints.deleteMatricula(matricula.id), "Matricula removida.")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </DeleteButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState message="Nenhuma matricula encontrada." />
      )}
    </ResourceLayout>
  );
}

function Admin({
  data,
  setData,
  session,
  setSession,
  canManageUsers,
  busy,
  setMessage,
  runAction,
}: {
  data: DashboardData;
  setData: Dispatch<SetStateAction<DashboardData>>;
  session: Session;
  setSession: Dispatch<SetStateAction<Session | null>>;
  canManageUsers: boolean;
  busy: boolean;
  setMessage: Dispatch<SetStateAction<string | null>>;
  runAction: (action: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<"medico" | "instrutor">("medico");
  const [adminLoading, setAdminLoading] = useState(false);
  const loadedAdminRef = useRef(false);
  const [promoting, setPromoting] = useState<User | null>(null);

  const loadAdminData = useCallback(async () => {
    if (!canManageUsers) return;
    if (loadedAdminRef.current || adminLoading) return;

    setAdminLoading(true);

    try {
      const adminData = await endpoints.getAdminData();
      setData((current) => ({ ...current, ...adminData }));
      loadedAdminRef.current = true;
      setMessage(
        adminData.errors?.length
          ? `Algumas rotas administrativas nao carregaram: ${adminData.errors.join(" | ")}`
          : null,
      );
    } catch (error) {
      setMessage(normalizeApiError(error));
    } finally {
      setAdminLoading(false);
    }
  }, [adminLoading, canManageUsers, setData, setMessage]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  async function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async () => {
      const updated = editing ? await endpoints.updateUser(editing.id, { name, email, ...(password ? { password } : {}) }) : await endpoints.createUser({ name, email, password });
      if (editing?.id === session.user.id) {
        const nextSession = { ...session, user: { ...session.user, name: updated.name, email: updated.email } };
        saveSession(nextSession); setSession(nextSession);
      }
      const adminData = await endpoints.getAdminData();
      setData(current => ({ ...current, ...adminData }));
      setEditing(null);
      setName("");
      setEmail("");
      setPassword("");
    }, "Usuario salvo.");
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async () => {
      if (profile === "medico") await endpoints.createMedico(userId);
      else await endpoints.createInstrutor(userId);
      setUserId("");
      const adminData = await endpoints.getAdminData();
      setData(current => ({ ...current, ...adminData }));
    }, "Perfil vinculado ao usuario.");
  }

  return (
    <div className="grid gap-5">
      {canManageUsers && promoting ? <Modal title="Promover para administrador" onClose={() => { if (!busy) setPromoting(null); }}>
        <p className="mb-4">Conceder a {promoting.name} ({promoting.email}) acesso para gerenciar usuarios, perfis e todos os modulos? Os perfis profissionais existentes serao preservados.</p>
        <div className="flex gap-3">
          <Button type="button" disabled={busy} onClick={() => runAction(async () => {
            const updated = await endpoints.promoteAdmin(promoting.id);
            setData(current => ({ ...current, users: current.users.map(user => user.id === updated.id ? updated : user) }));
            setPromoting(null);
          }, "Usuario promovido para administrador. O usuario deve sair e entrar novamente para atualizar o perfil na interface.")}>Confirmar promocao</Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => setPromoting(null)}>Cancelar</Button>
        </div>
      </Modal> : null}
      <MyAccount
        session={session}
        setSession={setSession}
        setData={setData}
        setMessage={setMessage}
      />

      {canManageUsers ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <Card>
            <CardHeader>
              <CardTitle>Usuarios</CardTitle>
              <CardDescription>Administradores possuem acesso global; perfis profissionais mantem suas permissoes.</CardDescription>
            </CardHeader>
            <CardContent>
              {adminLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando usuarios...
                </div>
              ) : data.users.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Perfil</TableHead><TableHead>Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.medico || user.instrutor ? "secondary" : "outline"}>
                            {user.isAdmin ? "Administrador" : user.medico ? "Medico" : user.instrutor ? "Instrutor" : "Sem perfil"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" disabled={busy || (user.isAdmin && session.user.role !== "ADMIN")} onClick={() => { setEditing(user); setName(user.name); setEmail(user.email); setPassword(""); }}>Editar</Button>
                          {!user.isAdmin ? <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setPromoting(user)}>Promover a administrador</Button> : null}
                          <DeleteButton disabled={busy || user.id === session.user.id || (user.isAdmin && session.user.role !== "ADMIN")} onClick={() => runAction(async () => { await endpoints.deleteUser(user.id); const adminData = await endpoints.getAdminData(); setData(current => ({ ...current, ...adminData })); }, "Usuario removido.")}><Trash2 className="h-4 w-4" /></DeleteButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState message="Sem usuarios disponiveis ou permissao insuficiente." />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-5">
            <FormCard title={editing ? "Editar usuario" : "Criar usuario sem perfil"} onSubmit={submitUser} busy={busy} submitLabel={editing ? "Salvar" : "Criar usuario"}>
              <Field label="Nome">
                <Input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} />
              </Field>
              <Field label="Email">
                <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </Field>
              <Field label={editing ? "Nova senha (opcional)" : "Senha"}>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required={!editing}
                  minLength={8}
                  maxLength={72}
                />
              </Field>
              {editing ? <Button type="button" variant="outline" disabled={busy} onClick={() => { setEditing(null); setName(""); setEmail(""); setPassword(""); }}>Cancelar</Button> : null}
            </FormCard>

            <FormCard title="Vincular perfil" onSubmit={submitProfile} busy={busy} submitLabel="Vincular">
              <Field label="Usuario">
                <Select value={userId} onChange={(event) => setUserId(event.target.value)} required>
                  <option value="">Selecione</option>
                  {data.users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} - {user.email}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Perfil">
                <Select value={profile} onChange={(event) => setProfile(event.target.value as "medico" | "instrutor")}>
                  <option value="medico">Medico</option>
                  <option value="instrutor">Instrutor</option>
                </Select>
              </Field>
            </FormCard>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Administracao</CardTitle>
            <CardDescription>Somente administradores podem gerenciar usuarios e perfis.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

function MyAccount({
  session,
  setSession,
  setData,
  setMessage,
}: {
  session: Session;
  setSession: Dispatch<SetStateAction<Session | null>>;
  setData: Dispatch<SetStateAction<DashboardData>>;
  setMessage: Dispatch<SetStateAction<string | null>>;
}) {
  const [name, setName] = useState(session.user.name);
  const [email, setEmail] = useState(session.user.email);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(session.user.name);
    setEmail(session.user.email);
  }, [session.user.name, session.user.email]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const payload: Partial<{ name: string; email: string; password: string }> = {
        name,
        email,
      };

      if (password.trim()) {
        payload.password = password;
      }

      const updatedUser = await endpoints.updateMyAccount(payload);
      const nextSession: Session = {
        ...session,
        user: {
          ...session.user,
          name: updatedUser.name,
          email: updatedUser.email,
        },
      };

      saveSession(nextSession);
      setSession(nextSession);
      setPassword("");
      setData((current) => ({
        ...current,
        users: current.users.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
      }));
      setMessage("Credenciais atualizadas.");
    } catch (error) {
      setMessage(normalizeApiError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Minha conta</CardTitle>
        <CardDescription>Visualize e atualize suas credenciais de acesso.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto]" onSubmit={submit}>
          <Field label="Nome">
            <Input value={name} onChange={(event) => setName(event.target.value)} required minLength={1} maxLength={120} />
          </Field>
          <Field label="Email">
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </Field>
          <Field label="Nova senha">
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={password ? 8 : undefined}
              maxLength={72}
              placeholder="Opcional"
            />
          </Field>
          <div className="flex items-end">
            <Button className="w-full lg:w-auto" disabled={saving} type="submit">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </div>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary">{roleLabel(session.user.role)}</Badge>
          <Badge variant="outline">ID: {session.user.id}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-semibold tracking-normal">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function Permission({ allowed, label }: { allowed: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
      <span>{label}</span>
      <Badge variant={allowed ? "secondary" : "outline"}>{allowed ? "Liberado" : "Bloqueado"}</Badge>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function FormCard({
  title,
  children,
  onSubmit,
  busy,
  submitLabel,
}: {
  title: string;
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  busy: boolean;
  submitLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          {children}
          <Button disabled={busy} type="submit">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ResourceLayout({
  title,
  description,
  aside,
  children,
}: {
  title: string;
  description: string;
  aside: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
      <div>{aside}</div>
    </div>
  );
}

function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 px-4 py-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-lg border bg-card text-card-foreground shadow-lg">
        <div className="flex items-start justify-between gap-4 border-b p-5">
          <div>
            <h2 className="text-lg font-semibold tracking-normal">{title}</h2>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Fechar
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function fromIso(value: string | number | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function useOptions(revision: unknown, resource: "consultas" | "aulas" | "matriculas") {
  const [options, setOptions] = useState<{ beneficiarios: Beneficiario[]; aulas: Aula[]; medicos: Medico[]; instrutores: Instrutor[]; error: string }>({ beneficiarios: [], aulas: [], medicos: [], instrutores: [], error: "" });
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      resource !== "aulas" ? endpoints.all<Beneficiario>("beneficiarios", {}, controller.signal) : Promise.resolve([]),
      resource === "matriculas" ? endpoints.all<Aula>("aulas", {}, controller.signal) : Promise.resolve([]),
      resource === "consultas" ? api<unknown>("/medicos", { signal: controller.signal }).then(value => parseArray<Medico>(value, "medicos")) : Promise.resolve([]),
      resource === "aulas" ? api<unknown>("/instrutores", { signal: controller.signal }).then(value => parseArray<Instrutor>(value, "instrutores")) : Promise.resolve([]),
    ]).then(([beneficiarios, aulas, medicos, instrutores]) => {
      if (!controller.signal.aborted) setOptions({ beneficiarios, aulas, medicos, instrutores, error: "" });
    }).catch(error => { if (!controller.signal.aborted) setOptions(current => ({ ...current, error: normalizeApiError(error) })); });
    return () => controller.abort();
  }, [revision, resource]);
  return options;
}

function ListStatus({ listing }: { listing: { loading: boolean; error: string; page: number; total: number; totalPages: number; go: (page: number) => void } }) {
  return <div className="mb-4 grid gap-2" aria-live="polite">
    {listing.loading ? <p className="text-sm">Carregando...</p> : null}
    {listing.error ? <p role="alert" className="text-sm text-destructive">{listing.error}</p> : null}
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" size="sm" disabled={listing.loading || listing.page <= 1} onClick={() => listing.go(listing.page - 1)}>Anterior</Button>
      <span className="text-sm">Pagina {listing.page} de {Math.max(1, listing.totalPages)} · {listing.total} resultados</span>
      <Button variant="outline" size="sm" disabled={listing.loading || listing.page >= listing.totalPages} onClick={() => listing.go(listing.page + 1)}>Proxima</Button>
    </div>
  </div>;
}

function DeleteButton({ onClick, children, ...props }: Omit<ComponentProps<typeof Button>, "onClick"> & { onClick: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  return <>
    <Button {...props} type="button" onClick={() => setConfirming(true)}>{children}</Button>
    {confirming ? <Modal title="Confirmar exclusao" onClose={() => { if (!props.disabled) setConfirming(false); }}>
      <p className="mb-4">Deseja excluir este registro? Esta operacao nao pode ser desfeita.</p>
      <div className="flex gap-3">
        <Button type="button" disabled={props.disabled} onClick={async () => { await onClick(); setConfirming(false); }}>Excluir</Button>
        <Button type="button" variant="outline" disabled={props.disabled} onClick={() => setConfirming(false)}>Cancelar</Button>
      </div>
    </Modal> : null}
  </>;
}

export default App;

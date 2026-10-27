import type {
  Aula,
  Demand,
  DemandOptions,
  CreateDemandPayload,
  Page,
  ListParams,
  AdminData,
  Beneficiario,
  Consulta,
  DashboardData,
  Instrutor,
  Matricula,
  Medico,
  Session,
  User,
} from "./types";
import { normalizeApiError } from "./utils";

const API_URL = import.meta.env.VITE_API_URL ?? "/api";
const TOKEN_KEY = "acao-social:token";
const USER_KEY = "acao-social:user";

export function getStoredSession(): Session | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const user = localStorage.getItem(USER_KEY);

  if (!token || !user) return null;

  try {
    return { token, user: JSON.parse(user) };
  } catch {
    clearStoredSession();
    return null;
  }
}

export function saveSession(session: Session) {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const hasBody = Boolean(options.body);

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (response.status === 401 && token) {
    clearStoredSession();
    window.dispatchEvent(new Event("session-expired"));
  }
  if (response.status === 204) return null as T;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw data ?? { error: "Erro inesperado na API" };
  }

  return data as T;
}

async function collect<T>(label: string, request: Promise<T[]>): Promise<{ data: T[]; error?: string }> {
  try {
    return { data: await request };
  } catch (error) {
    return { data: [], error: `${label}: ${normalizeApiError(error)}` };
  }
}

export const endpoints = {
  getDemandOptions: (signal?: AbortSignal) => api<DemandOptions>("/demandas/options", { signal }),
  createDemand: (payload: CreateDemandPayload) =>
    api<Demand>("/demandas", { method: "POST", body: JSON.stringify(payload) }),
  getDemand: (id: string, signal?: AbortSignal) =>
    api<Demand>(`/demandas/${encodeURIComponent(id)}`, { signal }),
  login: (email: string, password: string) =>
    api<Session>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (role: "medico" | "instrutor", payload: { name: string; email: string; password: string }) =>
    api<User>(`/auth/register/${role}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  list: <T>(resource: string, params: ListParams = {}, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== "") query.set(key, String(value)); });
    return api<Page<T>>(`/${resource}?${query}`, { signal });
  },
  all: async <T>(resource: string, params: ListParams = {}, signal?: AbortSignal): Promise<T[]> => {
    const first = await endpoints.list<T>(resource, { ...params, page: 1, limit: 100 }, signal);
    const rows = [...first.data];
    for (let page = 2; page <= first.totalPages; page++) {
      rows.push(...(await endpoints.list<T>(resource, { ...params, page, limit: 100 }, signal)).data);
    }
    return rows;
  },
  getDashboard: async (): Promise<DashboardData> => {
    const [beneficiarios, consultas, aulas, matriculas, available] = await Promise.all([
      endpoints.list<Beneficiario>("beneficiarios", { limit: 1 }),
      endpoints.list<Consulta>("consultas", { limit: 5, startDate: new Date().toISOString() }),
      endpoints.list<Aula>("aulas", { limit: 1 }),
      endpoints.list<Matricula>("matriculas", { limit: 1 }),
      endpoints.list<Aula>("aulas", { limit: 1, available: "true" }),
    ]);
    const allConsultas = await endpoints.list<Consulta>("consultas", { limit: 1 });
    return {
      beneficiarios: beneficiarios.data, consultas: consultas.data, aulas: aulas.data, matriculas: matriculas.data,
      users: [], medicos: [], instrutores: [], errors: [],
      totals: { beneficiarios: beneficiarios.total, consultas: allConsultas.total, aulas: aulas.total, matriculas: matriculas.total, availableAulas: available.total },
    };
  },
  getAdminData: async (): Promise<AdminData> => {
    const [users, medicos, instrutores] = await Promise.all([
      collect("Usuarios", api<User[]>("/users")),
      collect("Medicos", api<Medico[]>("/medicos")),
      collect("Instrutores", api<Instrutor[]>("/instrutores")),
    ]);

    return {
      users: users.data,
      medicos: medicos.data,
      instrutores: instrutores.data,
      errors: [users, medicos, instrutores].map((item) => item.error).filter((item): item is string => Boolean(item)),
    };
  },
  createBeneficiario: (payload: { name: string; telefone?: string }) =>
    api<Beneficiario>("/beneficiarios", {
      method: "POST",
      body: JSON.stringify({ ...payload, telefone: payload.telefone || undefined }),
    }),
  updateBeneficiario: (id: string, payload: { name: string; telefone: string }) =>
    api<Beneficiario>(`/beneficiarios/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteUser: (id: string) => api<null>(`/users/${id}`, { method: "DELETE" }),
  deleteBeneficiario: (id: string) => api<null>(`/beneficiarios/${id}`, { method: "DELETE" }),
  createConsulta: (payload: { beneficiarioId: string; dataHora: string }) =>
    api<Consulta>("/consultas", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateConsulta: (id: string, payload: { dataHora: string }) =>
    api<Consulta>(`/consultas/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteConsulta: (id: string) => api<null>(`/consultas/${id}`, { method: "DELETE" }),
  getAula: (id: string, signal?: AbortSignal) =>
    api<Aula>(`/aulas/${encodeURIComponent(id)}`, { signal }),
  createAula: (payload: { titulo: string; modalidade: string; vagas: number }) =>
    api<Aula>("/aulas", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAula: (id: string, payload: Partial<{ titulo: string; modalidade: string; vagas: number }>) =>
    api<Aula>(`/aulas/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteAula: (id: string) => api<null>(`/aulas/${id}`, { method: "DELETE" }),
  createMatricula: (payload: { beneficiarioId: string; aulaId: string }) =>
    api<Matricula>("/matriculas", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateMatricula: (id: string, payload: Partial<{ beneficiarioId: string; aulaId: string }>) =>
    api<Matricula>(`/matriculas/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteMatricula: (id: string) => api<null>(`/matriculas/${id}`, { method: "DELETE" }),
  createUser: (payload: { name: string; email: string; password: string }) =>
    api<User>("/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateUser: (id: string, payload: Partial<{ name: string; email: string; password: string }>) =>
    api<User>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  createMedico: (userId: string) =>
    api<Medico>("/medicos", {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
  createInstrutor: (userId: string) =>
    api<Instrutor>("/instrutores", {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
};

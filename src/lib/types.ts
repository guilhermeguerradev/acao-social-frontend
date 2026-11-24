export type Role = "ADMIN" | "MEDICO" | "INSTRUTOR" | null;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type Session = {
  token: string;
  user: SessionUser;
};

export type User = {
  isAdmin?: boolean;
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  medico: { id: string } | null;
  instrutor: { id: string } | null;
};

export type Beneficiario = {
  id: string;
  name: string;
  telefone: string | null;
  isAluno: boolean;
  curso: "BOMBEIRO_MIRIM" | null;
  createdAt: string;
};

export type Medico = {
  id: string;
  userId: string;
  user: Pick<User, "id" | "name" | "email">;
};

export type Instrutor = {
  id: string;
  userId: string;
  user: Pick<User, "id" | "name" | "email">;
};

export type Consulta = {
  id: string;
  dataHora: string;
  medicoId: string;
  beneficiarioId: string;
  createdAt: string;
  medico: Medico;
  beneficiario: Beneficiario;
};

export type Aula = {
  id: string;
  titulo: string;
  modalidade: string;
  vagas: number;
  instrutorId: string;
  createdAt: string;
  instrutor: Instrutor;
  _count: {
    matriculas: number;
  };
};

export type Matricula = {
  id: string;
  beneficiarioId: string;
  aulaId: string;
  createdAt: string;
  beneficiario: Beneficiario;
  aula: Omit<Aula, "instrutor" | "_count">;
};

export type DashboardData = {
  totals?: { beneficiarios: number; consultas: number; aulas: number; matriculas: number; availableAulas: number };
  beneficiarios: Beneficiario[];
  consultas: Consulta[];
  aulas: Aula[];
  matriculas: Matricula[];
  users: User[];
  medicos: Medico[];
  instrutores: Instrutor[];
  errors?: string[];
};

export type AdminData = Pick<DashboardData, "users" | "medicos" | "instrutores" | "errors">;

export type Page<T> = { data: T[]; page: number; limit: number; total: number; totalPages: number };
export type ListParams = Record<string, string | number | undefined>;

export type Demand = {
  id: string;
  description: string;
  status: "RECEIVED";
  requesterId: string;
  requester: { id: string; name: string };
  createdAt: string;
  phone: string | null;
  neighborhood: string | null;
  returnPreference: DemandReturnPreference | null;
  category: DemandCategory | null;
  otherDescription: string | null;
  urgent: boolean | null;
  contactConsentAt: string | null;
  contactConsentVersion: string | null;
  contactConsentText: string | null;
};

export type DemandCategory = "FOOD" | "CLOTHING" | "HYGIENE" | "HEALTH" | "EDUCATION" | "SOCIAL_ASSISTANCE" | "OTHER";
export type DemandReturnPreference = "WHATSAPP" | "PHONE_CALL";
export type DemandOptions = {
  categories: Array<{ value: DemandCategory; label: string }>;
  returnPreferences: Array<{ value: DemandReturnPreference; label: string }>;
  consent: { version: string; text: string };
};
export type DemandDraft = {
  description: string;
  phone: string;
  neighborhood: string;
  returnPreference: DemandReturnPreference | "";
  category: DemandCategory | "";
  otherDescription: string;
  urgent: "" | "true" | "false";
  contactConsent: boolean;
};
export type CreateDemandPayload = {
  description: string;
  requestKey: string;
  phone: string;
  neighborhood: string;
  returnPreference: DemandReturnPreference;
  category: DemandCategory;
  otherDescription?: string;
  urgent: boolean;
  contactConsent: true;
};

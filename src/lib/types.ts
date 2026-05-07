export type Role = "MEDICO" | "INSTRUTOR" | null;

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

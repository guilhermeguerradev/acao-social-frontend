import type { DemandOptions, Page, Session } from "./types";

type DataObject = Record<string, unknown>;
function object(value: unknown): value is DataObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(value: unknown): value is string { return typeof value === "string"; }
function integer(value: unknown, minimum = 0): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;
}
function date(value: unknown) { return text(value) && Number.isFinite(Date.parse(value)); }
function nullableText(value: unknown) { return value == null || text(value); }
function named(value: unknown) { return object(value) && text(value.id) && text(value.name); }
function professional(value: unknown) {
  return object(value) && text(value.id) && text(value.userId) && named(value.user);
}
function invalid(path: string): never {
  throw new Error(`Resposta invalida da API em ${path}. Nao foi possivel carregar os dados. Tente novamente; se persistir, informe a equipe.`);
}

// Check the fields consumed by the UI before replacing previously valid state.
export function parseRecord<T>(value: unknown, resource: string): T {
  if (!object(value) || !text(value.id)) return invalid(resource);
  let valid = true;
  switch (resource) {
    case "beneficiarios": valid = named(value) && typeof value.isAluno === "boolean" && (value.curso == null || value.curso === "BOMBEIRO_MIRIM"); break;
    case "consultas": valid = date(value.dataHora) && named(value.beneficiario) && professional(value.medico); break;
    case "aulas": valid = text(value.titulo) && text(value.modalidade) && integer(value.vagas) && professional(value.instrutor) && object(value._count) && integer(value._count.matriculas); break;
    case "matriculas": valid = text(value.aulaId) && text(value.beneficiarioId) && named(value.beneficiario) && object(value.aula) && text(value.aula.titulo); break;
    case "demandas": valid = text(value.description) && value.status === "RECEIVED" && date(value.createdAt) && named(value.requester) && [value.phone, value.neighborhood, value.category, value.returnPreference, value.otherDescription, value.contactConsentVersion, value.contactConsentText].every(nullableText) && (value.urgent == null || typeof value.urgent === "boolean") && (value.contactConsentAt == null || date(value.contactConsentAt)); break;
    case "users": valid = named(value) && text(value.email); break;
    case "medicos": case "instrutores": valid = professional(value); break;
  }
  if (!valid) return invalid(resource);
  return value as T;
}

export function parseArray<T>(value: unknown, resource: string): T[] {
  if (!Array.isArray(value)) return invalid(resource);
  return value.map(row => parseRecord<T>(row, resource));
}

export function parsePage<T>(value: unknown, resource: string): Page<T> {
  if (!object(value) || !Array.isArray(value.data) || !integer(value.page, 1) || !integer(value.limit, 1) || !integer(value.total) || !integer(value.totalPages) || value.totalPages !== Math.ceil(value.total / value.limit)) return invalid(resource);
  return { data: parseArray<T>(value.data, resource), page: value.page, limit: value.limit, total: value.total, totalPages: value.totalPages };
}

export function parseSession(value: unknown): Session {
  if (!object(value) || !text(value.token) || !value.token || !named(value.user) || !object(value.user) || !text(value.user.email) || ![null, "ADMIN", "MEDICO", "INSTRUTOR"].includes(value.user.role as string | null)) return invalid("auth/login");
  return value as Session;
}

export function parseDemandOptions(value: unknown): DemandOptions {
  const selections = (items: unknown) => Array.isArray(items) && items.length > 0 && items.every(item => object(item) && text(item.value) && text(item.label));
  if (!object(value) || !selections(value.categories) || !selections(value.returnPreferences) || !object(value.consent) || !text(value.consent.version) || !text(value.consent.text)) return invalid("demandas/options");
  return value as DemandOptions;
}

import { useEffect, useState } from "react";
import { endpoints } from "./api";
import type { CreateDemandPayload, DemandDraft, DemandOptions } from "./types";
import { normalizeApiError } from "./utils";

export function emptyDemandDraft(): DemandDraft {
  return { description: "", phone: "", neighborhood: "", returnPreference: "", category: "", otherDescription: "", urgent: "", contactConsent: false };
}

export function useDemandOptions() {
  const [state, setState] = useState<{ options: DemandOptions | null; error: string; loading: boolean }>({ options: null, error: "", loading: true });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ options: null, error: "", loading: true });
    endpoints.getDemandOptions(controller.signal)
      .then(options => { if (!controller.signal.aborted) setState({ options, error: "", loading: false }); })
      .catch(error => { if (!controller.signal.aborted) setState({ options: null, error: normalizeApiError(error), loading: false }); });
    return () => controller.abort();
  }, [attempt]);
  return { ...state, retry: () => setAttempt(value => value + 1) };
}

export function normalizeDemandPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return (digits.length === 12 || digits.length === 13) && digits.startsWith("55") ? digits.slice(2) : digits;
}

export function formatDemandPhone(value: string | null) {
  if (!value) return "Não informado neste registro";
  if (/^\d{11}$/.test(value)) return `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
  if (/^\d{10}$/.test(value)) return `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
  return value;
}

export function validateDemandDraft(draft: DemandDraft, options: DemandOptions): string | null {
  if (!/^\+?[\d\s().-]+$/.test(draft.phone.trim()) || !/^[1-9]{2}(?:[2-5]\d{7}|9\d{8})$/.test(normalizeDemandPhone(draft.phone))) return "Informe um telefone brasileiro válido com DDD.";
  if (!draft.neighborhood.trim() || draft.neighborhood.trim().length > 120) return "Informe o bairro em até 120 caracteres.";
  if (!options.returnPreferences.some(option => option.value === draft.returnPreference)) return "Selecione como prefere receber o retorno.";
  if (!options.categories.some(option => option.value === draft.category)) return "Selecione o tipo de pedido.";
  if (draft.category === "OTHER" && (!draft.otherDescription.trim() || draft.otherDescription.trim().length > 200)) return "Especifique o pedido em até 200 caracteres.";
  if (draft.urgent !== "true" && draft.urgent !== "false") return "Informe se precisa de atenção urgente.";
  if (!draft.description.trim() || draft.description.trim().length > 2000) return "Descreva o apoio solicitado em 1 a 2.000 caracteres.";
  if (!draft.contactConsent) return "É necessário autorizar o contato para enviar a solicitação.";
  return null;
}

export function demandPayload(draft: DemandDraft, requestKey: string): CreateDemandPayload {
  return {
    description: draft.description.trim(), phone: normalizeDemandPhone(draft.phone), neighborhood: draft.neighborhood.trim(),
    returnPreference: draft.returnPreference as CreateDemandPayload["returnPreference"],
    category: draft.category as CreateDemandPayload["category"],
    ...(draft.category === "OTHER" ? { otherDescription: draft.otherDescription.trim() } : {}),
    urgent: draft.urgent === "true", contactConsent: true, requestKey,
  };
}

export function demandLabel(options: DemandOptions | null, field: "categories" | "returnPreferences", value: string | null) {
  return value ? options?.[field].find(option => option.value === value)?.label ?? value : "Não informado neste registro";
}

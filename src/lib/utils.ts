import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function toIsoFromLocalDateTime(value: string) {
  return new Date(value).toISOString();
}

export function normalizeApiError(error: unknown) {
  if (typeof error === "object" && error !== null && "error" in error) {
    const payload = (error as { error: unknown }).error;

    if (Array.isArray(payload)) {
      return payload
        .map((item) => {
          if (typeof item === "object" && item !== null && "message" in item) {
            return String((item as { message: unknown }).message);
          }

          return String(item);
        })
        .join(", ");
    }

    return String(payload);
  }

  if (error instanceof Error) return error.message;
  return "Nao foi possivel concluir a operacao.";
}

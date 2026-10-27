import { useEffect, useState } from "react";
import { endpoints } from "./api";
import type { ListParams, Page } from "./types";
import { normalizeApiError } from "./utils";

export function useListing<T>(resource: string, revision: unknown, enabled = true) {
  const [query, setQuery] = useState<{ page: number; filters: ListParams }>({ page: 1, filters: {} });
  const [result, setResult] = useState<Page<T>>({ data: [], page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(() => {
      endpoints.list<T>(resource, { ...query.filters, page: query.page }, controller.signal)
        .then(page => {
          if (controller.signal.aborted) return;
          if (page.page > Math.max(1, page.totalPages)) {
            setQuery(current => ({ ...current, page: Math.max(1, page.totalPages) }));
          } else { setResult(page); setError(""); }
        })
        .catch(err => { if (!controller.signal.aborted) setError(normalizeApiError(err)); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 300);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [resource, query, revision, enabled]);
  return {
    ...result, loading, error, filters: query.filters,
    filter: (key: string, value: string) => setQuery(current => ({ page: 1, filters: { ...current.filters, [key]: value || undefined } })),
    clear: () => setQuery({ page: 1, filters: {} }),
    go: (page: number) => setQuery(current => ({ ...current, page })),
  };
}

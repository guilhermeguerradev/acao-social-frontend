import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "./button";

export function CopyButton({ value, label = "Copiar identificação" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  async function copy() {
    try {
      await window.navigator.clipboard.writeText(value);
      setCopied(true); setError("");
    } catch { setError("Não foi possível copiar. Selecione a identificação e copie manualmente."); }
  }
  return (
    <div className="grid gap-2">
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
        {copied ? "Copiado" : label}
      </Button>
      <span className="sr-only" role="status">{copied ? "Identificação copiada." : ""}</span>
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

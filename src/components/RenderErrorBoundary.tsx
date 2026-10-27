import { Component, type ReactNode } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

// Last resort for unexpected render failures. API failures are handled at the request boundary.
export class RenderErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="mx-auto max-w-xl px-4 py-8">
      <Card><CardHeader><CardTitle>Não foi possível exibir esta tela</CardTitle></CardHeader>
        <CardContent className="grid justify-items-start gap-4">
          <p role="alert">Ocorreu uma falha ao exibir os dados. Recarregue a página; se persistir, informe a equipe.</p>
          <Button type="button" onClick={() => window.location.reload()}>Recarregar página</Button>
        </CardContent>
      </Card>
    </main>;
  }
}

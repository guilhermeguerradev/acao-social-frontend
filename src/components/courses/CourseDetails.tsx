import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { endpoints } from "../../lib/api";
import type { Aula } from "../../lib/types";
import { normalizeApiError } from "../../lib/utils";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { CourseAvailability } from "./CourseAvailability";

type CourseState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; course: Aula };

export function CourseDetails({
  courseId,
  revision,
  onBack,
}: {
  courseId: string;
  revision: unknown;
  onBack: () => void;
}) {
  const [state, setState] = useState<CourseState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });

    endpoints.getAula(courseId, controller.signal)
      .then(course => {
        if (!controller.signal.aborted) setState({ status: "ready", course });
      })
      .catch(error => {
        if (!controller.signal.aborted) setState({ status: "error", message: normalizeApiError(error) });
      });

    return () => controller.abort();
  }, [courseId, revision, attempt]);

  return (
    <section className="grid gap-5" aria-label="Detalhes do curso">
      <div>
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar ao catálogo
        </Button>
      </div>
      {state.status === "loading" ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Carregando curso...
        </p>
      ) : state.status === "error" ? (
        <Card>
          <CardHeader><CardTitle>Não foi possível carregar o curso</CardTitle></CardHeader>
          <CardContent className="grid justify-items-start gap-4">
            <p role="alert" className="text-sm text-destructive">{state.message}</p>
            <Button type="button" variant="outline" onClick={() => setAttempt(current => current + 1)}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="break-words leading-snug">{state.course.titulo}</CardTitle>
          </CardHeader>
          <CardContent className="grid justify-items-start gap-5">
            <CourseAvailability course={state.course} />
            <dl className="grid w-full gap-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Modalidade</dt>
                <dd className="mt-1 break-words font-medium">{state.course.modalidade}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Instrutor</dt>
                <dd className="mt-1 break-words font-medium">{state.course.instrutor.user.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Total de vagas</dt>
                <dd className="mt-1 font-medium">{state.course.vagas}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Matriculados</dt>
                <dd className="mt-1 font-medium">{state.course._count.matriculas}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

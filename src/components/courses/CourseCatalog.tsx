import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useListing } from "../../lib/listing";
import type { Aula } from "../../lib/types";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { EmptyState } from "../ui/empty-state";
import { CourseCard } from "./CourseCard";
import { CourseDetails } from "./CourseDetails";

export function CourseCatalog({ revision }: { revision: unknown }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const listRevision = useMemo(() => ({ revision, attempt }), [revision, attempt]);
  const listing = useListing<Aula>("aulas", listRevision, selectedId === null);

  if (selectedId !== null) {
    return <CourseDetails key={selectedId} courseId={selectedId} revision={revision} onBack={() => setSelectedId(null)} />;
  }

  return (
    <section aria-label="Catálogo de cursos">
      <Card>
        <CardHeader>
          <CardTitle>Catálogo de cursos</CardTitle>
          <CardDescription>Conheça os cursos e atividades cadastrados no Ação Social.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5" aria-busy={listing.loading}>
          {listing.loading ? (
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Carregando cursos...
            </p>
          ) : listing.error ? (
            <div className="grid justify-items-start gap-4">
              <p role="alert" className="text-sm text-destructive">{listing.error}</p>
              <Button type="button" variant="outline" onClick={() => setAttempt(current => current + 1)}>
                Tentar novamente
              </Button>
            </div>
          ) : listing.data.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {listing.data.map(course => <CourseCard key={course.id} course={course} onSelect={setSelectedId} />)}
            </div>
          ) : (
            <EmptyState message="Nenhum curso cadastrado." />
          )}

          {!listing.error ? (
            <nav className="flex flex-wrap items-center gap-3" aria-label="Páginas do catálogo">
              <Button type="button" variant="outline" size="sm" disabled={listing.loading || listing.page <= 1} onClick={() => listing.go(listing.page - 1)}>
                Anterior
              </Button>
              <span className="text-sm" aria-live="polite">
                Página {listing.page} de {Math.max(1, listing.totalPages)} · {listing.total} resultados
              </span>
              <Button type="button" variant="outline" size="sm" disabled={listing.loading || listing.page >= listing.totalPages} onClick={() => listing.go(listing.page + 1)}>
                Próxima
              </Button>
            </nav>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

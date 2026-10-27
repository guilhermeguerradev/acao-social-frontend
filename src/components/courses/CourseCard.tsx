import type { Aula } from "../../lib/types";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { CourseAvailability } from "./CourseAvailability";

export function CourseCard({ course, onSelect }: { course: Aula; onSelect: (id: string) => void }) {
  return (
    <Card className="flex min-w-0 flex-col">
      <CardHeader>
        <CardTitle className="break-words leading-snug">{course.titulo}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-start gap-4">
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Modalidade</dt>
            <dd className="break-words">{course.modalidade}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Instrutor</dt>
            <dd className="break-words">{course.instrutor.user.name}</dd>
          </div>
        </dl>
        <CourseAvailability course={course} />
        <Button
          type="button"
          variant="outline"
          className="mt-auto w-full"
          aria-label={`Ver detalhes de ${course.titulo}`}
          onClick={() => onSelect(course.id)}
        >
          Ver detalhes
        </Button>
      </CardContent>
    </Card>
  );
}

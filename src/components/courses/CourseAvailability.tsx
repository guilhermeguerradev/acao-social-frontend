import type { Aula } from "../../lib/types";
import { Badge } from "../ui/badge";

export function CourseAvailability({ course }: { course: Pick<Aula, "vagas" | "_count"> }) {
  const available = Math.max(0, course.vagas - course._count.matriculas);

  return (
    <Badge variant={available > 0 ? "secondary" : "outline"}>
      {available > 0
        ? `${available} ${available === 1 ? "vaga disponível" : "vagas disponíveis"}`
        : "Sem vagas disponíveis"}
    </Badge>
  );
}

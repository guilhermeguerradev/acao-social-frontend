import { Inbox } from "lucide-react";

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      <Inbox className="h-5 w-5" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

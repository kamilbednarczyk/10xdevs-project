import { Skeleton } from "@/components/ui/skeleton";
import type { FlashcardResponseDTO, UpdateFlashcardCommand } from "@/types";

import { FlashcardActions } from "../FlashcardActions";

export interface DataTableContentProps {
  data: FlashcardResponseDTO[];
  isLoading: boolean;
  deletingIds: Record<string, boolean>;
  updatingIds: Record<string, boolean>;
  onDelete: (id: string) => void;
  onUpdate: (id: string, payload: UpdateFlashcardCommand) => Promise<boolean>;
}

const formatDate = (value?: string | null) => {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat("pl-PL", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const LoadingRow = () => (
  <tr>
    <td colSpan={5} className="px-4 py-4">
      <Skeleton className="h-10 w-full" />
    </td>
  </tr>
);

export function DataTableContent({ data, isLoading, deletingIds, updatingIds, onDelete, onUpdate }: DataTableContentProps) {
  const shouldShowSkeletons = isLoading && data.length === 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left" data-testid="flashcards-table-content">
        <thead>
          <tr className="text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 font-semibold">Przód</th>
            <th className="px-4 py-3 font-semibold">Tył</th>
            <th className="px-4 py-3 font-semibold">Typ</th>
            <th className="px-4 py-3 font-semibold">Utworzono</th>
            <th className="px-4 py-3 font-semibold text-right">Akcje</th>
          </tr>
        </thead>
        <tbody>
          {shouldShowSkeletons
            ? Array.from({ length: 5 }).map((_, index) => <LoadingRow key={`row-${index}`} />)
            : data.map((flashcard) => (
                <tr
                  key={flashcard.id}
                  className="border-t border-border/40 text-sm"
                  data-testid="flashcard-table-row"
                  data-flashcard-id={flashcard.id}
                >
                  <td className="px-4 py-4 font-medium text-foreground" data-testid="flashcard-table-front">
                    {flashcard.front}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground" data-testid="flashcard-table-back">
                    {flashcard.back}
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full border border-border/50 px-2 py-1 text-xs uppercase tracking-wider text-muted-foreground">
                      {flashcard.generation_type === "manual" ? "Ręczna" : "AI"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{formatDate(flashcard.created_at)}</td>
                  <td className="px-4 py-4 text-right">
                    <FlashcardActions
                      flashcard={flashcard}
                      onDelete={onDelete}
                      onUpdate={onUpdate}
                      isDeleting={Boolean(deletingIds[flashcard.id])}
                      isUpdating={Boolean(updatingIds[flashcard.id])}
                    />
                  </td>
                </tr>
              ))}
          {!isLoading && data.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                Brak wyników na tej stronie.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}




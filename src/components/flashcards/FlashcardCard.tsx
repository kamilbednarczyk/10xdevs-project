import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FlashcardResponseDTO, UpdateFlashcardCommand } from "@/types";

import { FlashcardActions } from "./FlashcardActions";

export interface FlashcardCardProps {
  flashcard: FlashcardResponseDTO;
  onDelete: (id: string) => void;
  onUpdate: (id: string, payload: UpdateFlashcardCommand) => Promise<boolean>;
  isDeleting?: boolean;
  isUpdating?: boolean;
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

export function FlashcardCard({ flashcard, onDelete, onUpdate, isDeleting, isUpdating }: FlashcardCardProps) {
  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
            {flashcard.generation_type === "manual" ? "Ręczna" : "AI"}
          </p>
          <CardTitle className="mt-1 text-lg">{flashcard.front}</CardTitle>
        </div>
        <FlashcardActions
          flashcard={flashcard}
          onDelete={onDelete}
          onUpdate={onUpdate}
          isDeleting={isDeleting}
          isUpdating={isUpdating}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Tył</p>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground">{flashcard.back}</p>
        </section>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>
            Utworzono: <span className="font-medium text-foreground">{formatDate(flashcard.created_at)}</span>
          </span>
          <span>
            Aktualizacja: <span className="font-medium text-foreground">{formatDate(flashcard.updated_at)}</span>
          </span>
          <span>
            Termin powtórki: <span className="font-medium text-foreground">{formatDate(flashcard.due_date)}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

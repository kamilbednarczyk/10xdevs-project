import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { StudyFlashcardViewModel } from "@/types";

interface FlashcardDisplayProps {
  flashcard: StudyFlashcardViewModel;
  isRevealed: boolean;
}

export function FlashcardDisplay({ flashcard, isRevealed }: FlashcardDisplayProps) {
  return (
    <Card className="w-full border-border/60 shadow-sm" data-testid="study-flashcard-card">
      <CardHeader className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Awers</p>
        <h2 className="text-2xl font-semibold text-foreground" data-testid="study-flashcard-front">
          {flashcard.front}
        </h2>
      </CardHeader>
      <CardContent className="mt-2 space-y-4">
        <div
          data-testid="study-flashcard-content"
          className={cn(
            "rounded-3xl border border-dashed border-muted-foreground/40 p-6 text-left transition-all",
            isRevealed ? "bg-muted/50" : "bg-muted/10 text-muted-foreground"
          )}
          aria-live="polite"
        >
          {isRevealed ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70" data-testid="study-flashcard-back-label">
                Rewers
              </p>
              <p className="mt-3 text-lg font-medium text-foreground" data-testid="study-flashcard-back-value">
                {flashcard.back}
              </p>
            </>
          ) : (
            <p className="text-base font-medium" data-testid="study-flashcard-placeholder">
              Kliknij &quot;Pokaż odpowiedź&quot;, gdy będziesz gotowy.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

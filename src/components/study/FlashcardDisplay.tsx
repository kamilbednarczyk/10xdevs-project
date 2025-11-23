import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { StudyFlashcardViewModel } from "@/types";

interface FlashcardDisplayProps {
  flashcard: StudyFlashcardViewModel;
  isRevealed: boolean;
}

export function FlashcardDisplay({ flashcard, isRevealed }: FlashcardDisplayProps) {
  return (
    <Card className="w-full border-border/60 shadow-sm">
      <CardHeader className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Awers</p>
        <h2 className="text-2xl font-semibold text-foreground">{flashcard.front}</h2>
      </CardHeader>
      <CardContent className="mt-2 space-y-4">
        <div
          className={cn(
            "rounded-3xl border border-dashed border-muted-foreground/40 p-6 text-left transition-all",
            isRevealed ? "bg-muted/50" : "bg-muted/10 text-muted-foreground"
          )}
          aria-live="polite"
        >
          {isRevealed ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">Rewers</p>
              <p className="mt-3 text-lg font-medium text-foreground">{flashcard.back}</p>
            </>
          ) : (
            <p className="text-base font-medium">Kliknij &quot;Pokaż odpowiedź&quot;, gdy będziesz gotowy.</p>
          )}
        </div>
        <dl className="grid gap-4 text-sm text-muted-foreground md:grid-cols-4">
          <div>
            <dt className="font-medium text-foreground">Interwał</dt>
            <dd>{flashcard.interval} dni</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Powtórzenia</dt>
            <dd>{flashcard.repetition}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Wsp. łatwości</dt>
            <dd>{flashcard.ease_factor.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Termin</dt>
            <dd>{formatShortDate(flashcard.due_date)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "brak danych";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

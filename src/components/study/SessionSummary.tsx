import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface SessionSummaryProps {
  totalFlashcards: number;
  onRestart?: () => void;
  secondaryActionHref?: string;
  secondaryActionLabel?: string;
}

export function SessionSummary({
  totalFlashcards,
  onRestart,
  secondaryActionHref = "/flashcards",
  secondaryActionLabel = "Przejdź do listy fiszek",
}: SessionSummaryProps) {
  const isEmptySession = totalFlashcards === 0;

  return (
    <Card className="w-full border-border/70 text-center shadow-sm">
      <CardHeader>
        <CardTitle className="text-3xl font-bold">
          {isEmptySession ? "Brak fiszek do powtórki na dziś!" : "Świetna robota, sesja zakończona!"}
        </CardTitle>
        <CardDescription className="text-base">
          {isEmptySession
            ? "Możesz wrócić później, gdy pojawią się nowe fiszki wymagające nauki."
            : `Oceniłeś ${totalFlashcards} ${formatFlashcardLabel(totalFlashcards)}. Kolejna sesja już wkrótce.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isEmptySession ? (
          <div className="inline-flex items-baseline gap-1 rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary">
            {totalFlashcards} {formatFlashcardLabel(totalFlashcards)}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Gdy tylko pojawią się nowe powtórki, powiadomimy Cię w panelu głównym.
          </p>
        )}
      </CardContent>
      {(onRestart || secondaryActionHref) && (
        <CardFooter className="flex flex-col gap-3 md:flex-row md:justify-center">
          {onRestart ? (
            <Button variant="outline" onClick={onRestart}>
              Rozpocznij ponownie
            </Button>
          ) : null}
          {secondaryActionHref ? (
            <Button variant="ghost" asChild>
              <a href={secondaryActionHref}>{secondaryActionLabel}</a>
            </Button>
          ) : null}
        </CardFooter>
      )}
    </Card>
  );
}

function formatFlashcardLabel(value: number) {
  if (value === 1) {
    return "fiszka";
  }
  if (value >= 2 && value <= 4) {
    return "fiszki";
  }
  return "fiszek";
}

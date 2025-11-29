import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface SessionSummaryProps {
  totalFlashcards: number;
  secondaryActionHref?: string;
  secondaryActionLabel?: string;
}

export function SessionSummary({
  totalFlashcards,
  secondaryActionHref = "/flashcards",
  secondaryActionLabel = "Przejdź do listy fiszek",
}: SessionSummaryProps) {
  const isEmptySession = totalFlashcards === 0;

  return (
    <Card className="w-full border-border/70 text-center shadow-sm" data-testid="study-session-summary">
      <CardHeader>
        <CardTitle className="text-3xl font-bold" data-testid="study-session-summary-title">
          {isEmptySession ? "Brak fiszek do powtórki na dziś!" : "Świetna robota, sesja zakończona!"}
        </CardTitle>
        {!isEmptySession && (
          <CardDescription className="text-base" data-testid="study-session-summary-description">
            {`Liczba ocenionych fiszek: ${totalFlashcards}. Kolejna sesja już wkrótce.`}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isEmptySession && (
          <p className="text-sm text-muted-foreground" data-testid="study-session-summary-empty-state">
            Gdy tylko pojawią się nowe powtórki, powiadomimy Cię w panelu głównym.
          </p>
        )}
      </CardContent>
      {secondaryActionHref && (
        <CardFooter className="flex flex-col gap-3 md:flex-row md:justify-center">
          <Button variant="ghost" asChild data-testid="study-session-summary-secondary-action">
            <a href={secondaryActionHref}>{secondaryActionLabel}</a>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

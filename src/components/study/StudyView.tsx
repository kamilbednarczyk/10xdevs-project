import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

import { FlashcardDisplay } from "./FlashcardDisplay";
import { LoadingSpinner } from "./LoadingSpinner";
import { ReviewControls } from "./ReviewControls";
import { SessionSummary } from "./SessionSummary";
import { useStudySession } from "./useStudySession";

export function StudyView() {
  const {
    currentFlashcard,
    sessionStatus,
    progress,
    isAnswerRevealed,
    errorMessage,
    revealAnswer,
    submitReview,
    retry,
  } = useStudySession();

  if (sessionStatus === "loading") {
    return <LoadingSpinner message="Ładuję fiszki zaplanowane na dziś..." />;
  }

  if (sessionStatus === "error") {
    return (
      <ErrorMessage
        description={errorMessage ?? "Nie udało się załadować danych sesji."}
        onRetry={retry}
        className="mx-auto"
      />
    );
  }

  if (sessionStatus === "ended") {
    return (
      <SessionSummary
        totalFlashcards={progress.total}
        secondaryActionHref="/flashcards"
        secondaryActionLabel="Zobacz wszystkie fiszki"
      />
    );
  }

  if (!currentFlashcard) {
    return <LoadingSpinner message="Przygotowuję kolejną fiszkę..." />;
  }

  const isSubmitting = sessionStatus === "submitting";
  const showProgress = progress.total > 0;
  const progressPercent = showProgress ? Math.round((progress.current / progress.total) * 100) : 0;
  const nextReviewLabel = formatDueDate(currentFlashcard.due_date);

  return (
    <section className="space-y-10 rounded-3xl border border-border/60 bg-card/60 p-6 shadow-xl lg:p-10">
      <header className="space-y-4 text-center">
        {showProgress ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.4em] text-muted-foreground/80">
              <span>
                Fiszka {progress.current} z {progress.total}
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : null}
        <div className="space-y-3">
          <p className="text-base text-muted-foreground">
            Najpierw spróbuj przypomnieć sobie odpowiedź, a dopiero potem odkryj rewers i oceń swoją pamięć.
          </p>
        </div>
      </header>

      <FlashcardDisplay flashcard={currentFlashcard} isRevealed={isAnswerRevealed} />

      <div className="space-y-6">
        <div className="flex flex-col items-center gap-6">
          {isAnswerRevealed ? (
            <ReviewControls onReview={submitReview} isDisabled={isSubmitting} />
          ) : (
            <Button size="lg" onClick={revealAnswer} disabled={isSubmitting}>
              Pokaż odpowiedź
            </Button>
          )}
          {isSubmitting ? <p className="text-sm text-muted-foreground">Zapisywanie oceny...</p> : null}
        </div>

        <div className="rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Planowana powtórka: {nextReviewLabel}</p>
          <p className="text-xs text-muted-foreground/90">
            Oceń rzetelnie – SM-2 dopasuje harmonogram do Twojej pamięci.
          </p>
        </div>
      </div>
    </section>
  );
}

function formatDueDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "wkrótce";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

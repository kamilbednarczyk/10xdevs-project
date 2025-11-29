import { Button } from "@/components/ui/button";

export interface DeleteFlashcardDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  flashcardFront?: string;
  isDeleting?: boolean;
}

export function DeleteFlashcardDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  flashcardFront,
  isDeleting,
}: DeleteFlashcardDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
      data-testid="delete-flashcard-dialog"
    >
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-6 shadow-2xl">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-destructive/80">Potwierdzenie</p>
          <h3 className="text-xl font-semibold text-foreground">Usunąć fiszkę?</h3>
          <p className="text-sm text-muted-foreground" data-testid="delete-flashcard-message">
            {flashcardFront ? (
              <>
                Fiszka <span className="font-semibold">&ldquo;{flashcardFront}&rdquo;</span> zostanie trwale usunięta.
              </>
            ) : (
              "Wybrana fiszka zostanie trwale usunięta."
            )}{" "}
            Tej operacji nie można cofnąć.
          </p>
        </header>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            data-testid="delete-flashcard-cancel-button"
          >
            Anuluj
          </Button>
          <Button
            variant="destructive"
            className="w-full sm:w-auto"
            onClick={onConfirm}
            disabled={isDeleting}
            data-testid="delete-flashcard-confirm-button"
          >
            {isDeleting ? "Usuwanie..." : "Usuń"}
          </Button>
        </div>
      </div>
    </div>
  );
}

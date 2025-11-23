import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const FRONT_LIMIT = 200;
const BACK_LIMIT = 500;

type FlashcardDialogMode = "create" | "edit";

const dialogCopy: Record<FlashcardDialogMode, { eyebrow: string; title: string; description: string; submit: string }> = {
  create: {
    eyebrow: "Ręczne tworzenie",
    title: "Nowa fiszka",
    description: "Uzupełnij przód i tył, aby dodać fiszkę do swojej kolekcji.",
    submit: "Zapisz fiszkę",
  },
  edit: {
    eyebrow: "Edycja fiszki",
    title: "Zaktualizuj treść",
    description: "Wprowadź poprawki i zapisz zmiany.",
    submit: "Zapisz zmiany",
  },
};

interface FieldErrors {
  front?: string;
  back?: string;
  global?: string;
}

export interface FlashcardFormDialogProps {
  mode: FlashcardDialogMode;
  isOpen: boolean;
  isSubmitting?: boolean;
  initialValues?: {
    front: string;
    back: string;
  };
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: { front: string; back: string }) => Promise<boolean>;
}

export function FlashcardFormDialog({
  mode,
  isOpen,
  isSubmitting,
  initialValues,
  onOpenChange,
  onSubmit,
}: FlashcardFormDialogProps) {
  const [front, setFront] = useState(initialValues?.front ?? "");
  const [back, setBack] = useState(initialValues?.back ?? "");
  const [{ front: frontError, back: backError, global }, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFront(initialValues?.front ?? "");
    setBack(initialValues?.back ?? "");
    setErrors({});
  }, [initialValues?.back, initialValues?.front, isOpen]);

  const charactersLeft = useMemo(
    () => ({
      front: FRONT_LIMIT - front.length,
      back: BACK_LIMIT - back.length,
    }),
    [front.length, back.length]
  );

  if (!isOpen) {
    return null;
  }

  const validate = (): FieldErrors => {
    const trimmedFront = front.trim();
    const trimmedBack = back.trim();
    const nextErrors: FieldErrors = {};

    if (!trimmedFront) {
      nextErrors.front = "Przód fiszki jest wymagany.";
    } else if (trimmedFront.length > FRONT_LIMIT) {
      nextErrors.front = `Maksymalnie ${FRONT_LIMIT} znaków.`;
    }

    if (!trimmedBack) {
      nextErrors.back = "Tył fiszki jest wymagany.";
    } else if (trimmedBack.length > BACK_LIMIT) {
      nextErrors.back = `Maksymalnie ${BACK_LIMIT} znaków.`;
    }

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validate();
    if (validationErrors.front || validationErrors.back) {
      setErrors(validationErrors);
      return;
    }

    try {
      const success = await onSubmit({ front: front.trim(), back: back.trim() });
      if (success) {
        onOpenChange(false);
      }
    } catch (error) {
      setErrors({
        global: error instanceof Error ? error.message : "Nie udało się zapisać zmian.",
      });
    }
  };

  const copy = dialogCopy[mode];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-8 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <header className="mb-6 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">{copy.eyebrow}</p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{copy.title}</h2>
          <p className="text-sm text-muted-foreground">{copy.description}</p>
        </header>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="flashcard-front" className="text-sm font-medium text-foreground">
              Przód
            </label>
            <Input
              id="flashcard-front"
              value={front}
              maxLength={FRONT_LIMIT}
              placeholder="Wpisz pytanie lub pojęcie..."
              onChange={(event) => setFront(event.target.value)}
              aria-invalid={Boolean(frontError)}
              autoFocus
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="text-destructive">{frontError}</span>
              <span>Pozostało {charactersLeft.front}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="flashcard-back" className="text-sm font-medium text-foreground">
              Tył
            </label>
            <Textarea
              id="flashcard-back"
              value={back}
              maxLength={BACK_LIMIT}
              placeholder="Dodaj odpowiedź lub wyjaśnienie..."
              rows={5}
              onChange={(event) => setBack(event.target.value)}
              aria-invalid={Boolean(backError)}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="text-destructive">{backError}</span>
              <span>Pozostało {charactersLeft.back}</span>
            </div>
          </div>

          {global ? <p className="text-sm text-destructive">{global}</p> : null}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Anuluj
            </Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? "Zapisywanie..." : copy.submit}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}



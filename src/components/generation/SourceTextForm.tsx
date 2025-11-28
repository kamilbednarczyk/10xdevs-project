import { useCallback, useId, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { MAX_SOURCE_TEXT_LENGTH } from "./types";

interface SourceTextFormProps {
  sourceText: string;
  isValid: boolean;
  isLoading: boolean;
  onTextChange: (text: string) => void;
  onSubmit: () => void;
}

export function SourceTextForm({ sourceText, isValid, isLoading, onTextChange, onSubmit }: SourceTextFormProps) {
  const charactersCount = sourceText.length;
  const counterId = useId();

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!isValid || isLoading) {
        return;
      }

      onSubmit();
    },
    [isLoading, isValid, onSubmit]
  );

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Textarea
          id="source-text"
          name="source-text"
          value={sourceText}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="Wklej fragment podręcznika, artykułu lub notatek..."
          aria-invalid={!isValid}
          aria-describedby={`${counterId}`}
          disabled={isLoading}
        />
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-muted/30 px-4 py-4 text-sm text-muted-foreground md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-6">
        <div id={counterId} aria-live="polite">
          <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Liczba znaków</p>
          <p className={`text-base font-semibold ${!isValid ? "text-destructive" : "text-foreground"}`}>
            {charactersCount.toLocaleString("pl-PL")} / {MAX_SOURCE_TEXT_LENGTH.toLocaleString("pl-PL")}
          </p>
        </div>
        <Button type="submit" className="w-full md:w-auto md:justify-self-end" disabled={!isValid || isLoading}>
          {isLoading ? "Generowanie..." : "Generuj fiszki"}
        </Button>
      </div>
    </form>
  );
}

import { useEffect, useRef } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGenerateFlashcards, type UseGenerateFlashcardsResult } from "@/lib/hooks/useGenerateFlashcards";
import { useToast } from "@/lib/hooks/useToast";

import { ActionsFooter } from "./ActionsFooter";
import { ProposalsList } from "./ProposalsList";
import { SelectionToolbar } from "./SelectionToolbar";
import { SourceTextForm } from "./SourceTextForm";

const STATUS_COPY: Record<UseGenerateFlashcardsResult["state"]["status"], { label: string; description: string }> = {
  idle: {
    label: "Gotowy do startu",
    description: "Wklej tekst źródłowy i rozpocznij generowanie fiszek.",
  },
  loading: {
    label: "Generowanie w toku",
    description: "AI analizuje tekst i przygotowuje propozycje fiszek.",
  },
  proposalsReady: {
    label: "Propozycje gotowe",
    description: "Przejrzyj fiszki, zaznacz najlepsze i wprowadź ewentualne poprawki.",
  },
  saving: {
    label: "Zapisywanie fiszek",
    description: "Zaznaczone fiszki są dodawane do Twojej kolekcji.",
  },
  success: {
    label: "Zapisano!",
    description: "Wybrane fiszki trafiły do Twojej kolekcji. Możesz wygenerować kolejną partię.",
  },
};

export function GenerateFlashcardsView() {
  const {
    state,
    isValidSourceText,
    selectedProposals,
    canSave,
    updateSourceText,
    updateProposal,
    selectAllProposals,
    clearSelectedProposals,
    handleGenerate,
    handleSaveSelected,
  } = useGenerateFlashcards();
  const { showToast } = useToast();
  const previousStatusRef = useRef(state.status);
  const lastErrorToastRef = useRef<string | null>(null);

  useEffect(() => {
    if (previousStatusRef.current === "loading" && state.status === "proposalsReady") {
      showToast({
        variant: "success",
        title: "Propozycje gotowe",
        description: `AI przygotowała ${state.proposals.length} ${state.proposals.length === 1 ? "fiszka" : "fiszek"}.`,
      });
    }

    if (previousStatusRef.current === "saving" && state.status === "success") {
      showToast({
        variant: "success",
        title: "Fiszki zapisane",
        description: "Wybrane propozycje trafiły do Twojej kolekcji.",
      });
    }

    previousStatusRef.current = state.status;
  }, [showToast, state.proposals.length, state.status]);

  useEffect(() => {
    if (state.error && state.error !== lastErrorToastRef.current) {
      showToast({
        variant: "error",
        title: "Wystąpił błąd",
        description: state.error,
      });
      lastErrorToastRef.current = state.error;
    }

    if (!state.error) {
      lastErrorToastRef.current = null;
    }
  }, [showToast, state.error]);

  const statusMeta = STATUS_COPY[state.status];

  return (
    <section className="flex flex-col gap-10">
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Tekst źródłowy</CardTitle>
          <CardDescription>
            Wklej treść (od 1&nbsp;000 do 10&nbsp;000 znaków), z której AI przygotuje propozycje fiszek.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SourceTextForm
            sourceText={state.sourceText}
            isValid={isValidSourceText}
            isLoading={state.status === "loading"}
            onTextChange={updateSourceText}
            onSubmit={handleGenerate}
          />
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="gap-4">
          <div>
            <CardTitle>Propozycje AI</CardTitle>
            <CardDescription>
              W tym miejscu pojawi się lista fiszek wraz z możliwością edycji i zaznaczania do zapisu.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-border/70 bg-background/70 px-4 py-2">
            <div className="size-2 rounded-full bg-primary" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-foreground">{statusMeta.label}</p>
              <p className="text-xs text-muted-foreground">{statusMeta.description}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {state.proposals.length > 0 ? (
            <SelectionToolbar
              totalCount={state.proposals.length}
              selectedCount={selectedProposals.length}
              isSaving={state.status === "saving"}
              onSelectAll={selectAllProposals}
              onClearSelection={clearSelectedProposals}
            />
          ) : null}

          {state.error ? (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {state.error}
            </div>
          ) : null}

          {state.status === "loading" ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={`proposal-skeleton-${index}`} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : state.proposals.length > 0 ? (
            <ProposalsList
              proposals={state.proposals}
              onUpdateProposal={updateProposal}
              isDisabled={state.status === "saving"}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                {state.status === "success" ? "Fiszki zapisane!" : "Brak wygenerowanych propozycji."}
              </p>
              <p className="mt-2">
                {state.status === "success"
                  ? "Możesz wkleić kolejny tekst i wygenerować następną partię fiszek."
                  : "Wklej tekst źródłowy i kliknij „Generuj fiszki”, aby zobaczyć propozycje AI."}
              </p>
            </div>
          )}
        </CardContent>
        <ActionsFooter
          totalCount={state.proposals.length}
          selectedCount={selectedProposals.length}
          canSave={canSave}
          isSaving={state.status === "saving"}
          onSave={handleSaveSelected}
        />
      </Card>
    </section>
  );
}

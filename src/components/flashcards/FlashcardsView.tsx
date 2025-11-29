import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import { useFlashcards } from "@/lib/hooks/useFlashcards";

import { CreateFlashcardDialog } from "./CreateFlashcardDialog";
import { FlashcardsEmptyState, FlashcardsLoadingPlaceholder } from "./Placeholders";
import { FlashcardsList } from "./FlashcardsList";
import { FlashcardsTable } from "./data-table/DataTable";
import type { UpdateFlashcardCommand } from "@/types";

export function FlashcardsView() {
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const isDesktop = useBreakpoint("lg");
  const {
    flashcards,
    pagination,
    isLoading,
    isCreating,
    deletingIds,
    updatingIds,
    error,
    changePage,
    refresh,
    createFlashcard,
    updateFlashcard,
    deleteFlashcard,
  } = useFlashcards({ pageSize: 10 });

  const hasFlashcards = flashcards.length > 0;

  const handleUpdate = useCallback(
    async (id: string, payload: UpdateFlashcardCommand) => {
      const updated = await updateFlashcard(id, payload);
      return Boolean(updated);
    },
    [updateFlashcard]
  );

  const content = useMemo(() => {
    if (isLoading && !hasFlashcards) {
      return <FlashcardsLoadingPlaceholder />;
    }

    if (error) {
      return (
        <ErrorMessage
          title="Nie udało się pobrać fiszek"
          description={error}
          retryLabel="Spróbuj ponownie"
          onRetry={refresh}
        />
      );
    }

    if (!hasFlashcards) {
      return <FlashcardsEmptyState onCreate={() => setCreateDialogOpen(true)} />;
    }

    if (isDesktop) {
      return (
        <FlashcardsTable
          data={flashcards}
          pagination={pagination}
          isLoading={isLoading}
          deletingIds={deletingIds}
          updatingIds={updatingIds}
          onDelete={deleteFlashcard}
          onUpdate={handleUpdate}
          onPageChange={changePage}
        />
      );
    }

    return (
      <FlashcardsList
        data={flashcards}
        pagination={pagination}
        isLoading={isLoading}
        deletingIds={deletingIds}
        updatingIds={updatingIds}
        onDelete={deleteFlashcard}
        onUpdate={handleUpdate}
        onPageChange={changePage}
      />
    );
  }, [
    changePage,
    deleteFlashcard,
    deletingIds,
    updatingIds,
    error,
    flashcards,
    hasFlashcards,
    isDesktop,
    isLoading,
    handleUpdate,
    pagination,
    refresh,
  ]);

  return (
    <section className="space-y-6">
      <div className="grid gap-4 border-b border-border/40 pb-6 md:grid-cols-[2fr_1fr] md:items-center">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">Kolekcja</p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Moje fiszki</h2>
          <p className="text-sm text-muted-foreground">
            Zarządzaj ręcznie tworzonymi fiszkami, usuwaj niepotrzebne pozycje i utrzymuj porządek w bazie wiedzy.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            variant="outline"
            className="flex-1 sm:flex-none"
            onClick={() => refresh()}
            data-testid="flashcards-refresh-button"
          >
            Odśwież listę
          </Button>
          <Button
            className="flex-1 sm:flex-none"
            onClick={() => setCreateDialogOpen(true)}
            data-testid="flashcards-add-button"
          >
            Dodaj nową fiszkę
          </Button>
        </div>
      </div>

      {content}

      <CreateFlashcardDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={createFlashcard}
        isSubmitting={isCreating}
        onSuccess={() => {
          setCreateDialogOpen(false);
        }}
      />
    </section>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  CreateFlashcardCommand,
  FlashcardResponseDTO,
  PaginationDTO,
  UpdateFlashcardCommand,
} from "@/types";
import { useToast } from "./useToast";

const DEFAULT_PAGE_SIZE = 10;

interface FlashcardsState {
  flashcards: FlashcardResponseDTO[];
  pagination: PaginationDTO | null;
  currentPage: number;
  isLoading: boolean;
  isCreating: boolean;
  deletingIds: Record<string, boolean>;
  updatingIds: Record<string, boolean>;
  error: string | null;
}

export interface UseFlashcardsOptions {
  initialPage?: number;
  pageSize?: number;
}

export interface UseFlashcardsResult {
  flashcards: FlashcardResponseDTO[];
  pagination: PaginationDTO | null;
  currentPage: number;
  isLoading: boolean;
  isCreating: boolean;
  deletingIds: Record<string, boolean>;
  updatingIds: Record<string, boolean>;
  error: string | null;
  fetchFlashcards: (page?: number) => Promise<void>;
  changePage: (page: number) => void;
  refresh: () => Promise<void>;
  createFlashcard: (payload: CreateFlashcardCommand) => Promise<FlashcardResponseDTO | null>;
  updateFlashcard: (id: string, payload: UpdateFlashcardCommand) => Promise<FlashcardResponseDTO | null>;
  deleteFlashcard: (id: string) => Promise<void>;
}

const parseErrorResponse = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as {
      error?: { message?: string };
    };

    if (payload?.error?.message) {
      return payload.error.message;
    }
  } catch {
    // Ignore JSON parsing issues and fall back to generic message.
  }

  return `Wystąpił błąd (status: ${response.status}). Spróbuj ponownie później.`;
};

const getUnexpectedErrorMessage = (cause: unknown) =>
  cause instanceof Error ? cause.message : "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.";

export function useFlashcards(options?: UseFlashcardsOptions): UseFlashcardsResult {
  const initialPage = options?.initialPage ?? 1;
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;

  const [{ flashcards, pagination, currentPage, isLoading, isCreating, deletingIds, updatingIds, error }, setState] =
    useState<FlashcardsState>({
      flashcards: [],
      pagination: null,
      currentPage: initialPage,
      isLoading: false,
      isCreating: false,
      deletingIds: {},
      updatingIds: {},
      error: null,
    });

  const currentPageRef = useRef(initialPage);
  const { showToast } = useToast();

  const fetchFlashcards = useCallback(
    async (page: number = currentPageRef.current) => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      currentPageRef.current = page;

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(pageSize),
        });

        const response = await fetch(`/api/flashcards?${params.toString()}`);

        if (!response.ok) {
          const message = await parseErrorResponse(response);
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: message,
          }));
          return;
        }

        const payload = (await response.json()) as {
          data: FlashcardResponseDTO[];
          pagination: PaginationDTO;
        };

        if (payload.pagination.total_pages > 0 && page > payload.pagination.total_pages) {
          currentPageRef.current = payload.pagination.total_pages;
          await fetchFlashcards(payload.pagination.total_pages);
          return;
        }

        setState((prev) => ({
          ...prev,
          flashcards: payload.data,
          pagination: payload.pagination,
          currentPage: page,
          isLoading: false,
          error: null,
        }));
      } catch (cause) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: getUnexpectedErrorMessage(cause),
        }));
      }
    },
    [pageSize]
  );

  const refresh = useCallback(async () => {
    await fetchFlashcards(currentPageRef.current);
  }, [fetchFlashcards]);

  const changePage = useCallback(
    (page: number) => {
      if (page === currentPageRef.current) {
        return;
      }

      void fetchFlashcards(page);
    },
    [fetchFlashcards]
  );

  const createFlashcard = useCallback(
    async (payload: CreateFlashcardCommand): Promise<FlashcardResponseDTO | null> => {
      setState((prev) => ({
        ...prev,
        isCreating: true,
      }));

      try {
        const response = await fetch("/api/flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const message = await parseErrorResponse(response);
          showToast({
            title: "Nie udało się dodać fiszki",
            description: message,
            variant: "error",
          });
          return null;
        }

        const created = (await response.json()) as FlashcardResponseDTO;
        showToast({
          title: "Dodano nową fiszkę",
          description: "Twoja fiszka została zapisana.",
          variant: "success",
        });

        // Po dodaniu nowej fiszki wracamy na pierwszą stronę, aby ją wyświetlić.
        currentPageRef.current = 1;
        await fetchFlashcards(1);

        return created;
      } catch (cause) {
        showToast({
          title: "Nie udało się dodać fiszki",
          description: getUnexpectedErrorMessage(cause),
          variant: "error",
        });
        return null;
      } finally {
        setState((prev) => ({
          ...prev,
          isCreating: false,
        }));
      }
    },
    [fetchFlashcards, showToast]
  );

  const deleteFlashcard = useCallback(
    async (id: string) => {
      setState((prev) => ({
        ...prev,
        flashcards: prev.flashcards.filter((flashcard) => flashcard.id !== id),
        deletingIds: { ...prev.deletingIds, [id]: true },
      }));

      try {
        const response = await fetch(`/api/flashcards/${id}`, {
          method: "DELETE",
        });

        if (!response.ok && response.status !== 204) {
          const message = await parseErrorResponse(response);
          throw new Error(message);
        }

        showToast({
          title: "Fiszka została usunięta",
          description: "Pomyślnie usunięto element z kolekcji.",
          variant: "success",
        });

        const nextPage =
          pagination && pagination.total_pages > 0
            ? Math.min(currentPageRef.current, pagination.total_pages)
            : currentPageRef.current;

        await fetchFlashcards(Math.max(nextPage, 1));
      } catch (cause) {
        showToast({
          title: "Nie udało się usunąć fiszki",
          description: getUnexpectedErrorMessage(cause),
          variant: "error",
        });
        await refresh();
      } finally {
        setState((prev) => {
          const updatedDeleting = { ...prev.deletingIds };
          delete updatedDeleting[id];
          return {
            ...prev,
            deletingIds: updatedDeleting,
          };
        });
      }
    },
    [fetchFlashcards, pagination, refresh, showToast]
  );

  const updateFlashcard = useCallback(
    async (id: string, payload: UpdateFlashcardCommand): Promise<FlashcardResponseDTO | null> => {
      setState((prev) => ({
        ...prev,
        updatingIds: { ...prev.updatingIds, [id]: true },
      }));

      try {
        const response = await fetch(`/api/flashcards/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const message = await parseErrorResponse(response);
          showToast({
            title: "Nie udało się zaktualizować fiszki",
            description: message,
            variant: "error",
          });
          return null;
        }

        const updated = (await response.json()) as FlashcardResponseDTO;
        setState((prev) => ({
          ...prev,
          flashcards: prev.flashcards.map((flashcard) => (flashcard.id === id ? updated : flashcard)),
        }));

        showToast({
          title: "Zapisano zmiany",
          description: "Treść fiszki została zaktualizowana.",
          variant: "success",
        });

        return updated;
      } catch (cause) {
        showToast({
          title: "Nie udało się zaktualizować fiszki",
          description: getUnexpectedErrorMessage(cause),
          variant: "error",
        });
        return null;
      } finally {
        setState((prev) => {
          const nextUpdating = { ...prev.updatingIds };
          delete nextUpdating[id];
          return {
            ...prev,
            updatingIds: nextUpdating,
          };
        });
      }
    },
    [showToast]
  );

  useEffect(() => {
    void fetchFlashcards(initialPage);
  }, [fetchFlashcards, initialPage]);

  return {
    flashcards,
    pagination,
    currentPage,
    isLoading,
    isCreating,
    deletingIds,
    updatingIds,
    error,
    fetchFlashcards,
    changePage,
    refresh,
    createFlashcard,
    updateFlashcard,
    deleteFlashcard,
  };
}


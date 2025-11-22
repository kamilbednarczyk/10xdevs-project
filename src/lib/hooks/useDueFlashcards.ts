import { useEffect, useState } from "react";

import type { DashboardViewModel } from "@/components/dashboard/types";
import type { StudyFlashcardDTO } from "@/types";

export interface UseDueFlashcardsState {
  data: DashboardViewModel | null;
  isLoading: boolean;
  error: Error | null;
}

const mapToViewModel = (payload: StudyFlashcardDTO[]): DashboardViewModel => ({
  dueFlashcardsCount: payload.length,
});

const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }

  return new Error("Unexpected error while loading due flashcards");
};

export function useDueFlashcards(): UseDueFlashcardsState {
  const [state, setState] = useState<UseDueFlashcardsState>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const abortController = new AbortController();

    const fetchDueFlashcards = async () => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch("/api/study/due", { signal: abortController.signal });

        if (!response.ok) {
          throw new Error(`Unable to load due flashcards (status: ${response.status})`);
        }

        const payload: StudyFlashcardDTO[] = await response.json();

        if (abortController.signal.aborted) {
          return;
        }

        setState({
          data: mapToViewModel(payload),
          isLoading: false,
          error: null,
        });
      } catch (cause) {
        if (abortController.signal.aborted) {
          return;
        }

        setState({
          data: null,
          isLoading: false,
          error: toError(cause),
        });
      }
    };

    fetchDueFlashcards();

    return () => {
      abortController.abort();
    };
  }, []);

  return state;
}

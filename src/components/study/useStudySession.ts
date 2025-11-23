import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SubmitReviewCommand, StudyFlashcardViewModel, StudySessionViewModel } from "@/types";

interface SubmitReviewOperation {
  flashcardId: string;
  quality: SubmitReviewCommand["quality"];
  cardIndex: number;
}

type LastOperation = { type: "fetch_flashcards" } | ({ type: "submit_review" } & SubmitReviewOperation) | null;

const initialState: StudySessionViewModel = {
  flashcards: [],
  currentCardIndex: 0,
  isAnswerRevealed: false,
  sessionStatus: "loading",
};

async function resolveErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: { message?: string } };
    if (data?.error?.message) {
      return data.error.message;
    }
  } catch {
    // Ignore JSON parse errors – fallback message will be used
  }
  return fallback;
}

export function useStudySession() {
  const [sessionState, setSessionState] = useState<StudySessionViewModel>(initialState);
  const [lastOperation, setLastOperation] = useState<LastOperation>(null);
  const cachedFlashcardsRef = useRef<StudyFlashcardViewModel[] | null>(null);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const submitControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const bootSession = useCallback((flashcards: StudyFlashcardViewModel[]) => {
    cachedFlashcardsRef.current = flashcards;
    if (!isMountedRef.current) {
      return;
    }

    setSessionState({
      flashcards,
      currentCardIndex: 0,
      isAnswerRevealed: false,
      sessionStatus: flashcards.length === 0 ? "ended" : "in_progress",
      errorMessage: undefined,
    });
    setLastOperation(null);
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      fetchControllerRef.current?.abort();
      submitControllerRef.current?.abort();
    };
  }, []);

  const fetchFlashcards = useCallback(async () => {
    fetchControllerRef.current?.abort();
    const controller = new AbortController();
    fetchControllerRef.current = controller;

    setSessionState((prev) => ({
      ...prev,
      sessionStatus: "loading",
      errorMessage: undefined,
    }));

    try {
      const response = await fetch("/api/study/due", { signal: controller.signal });
      if (!response.ok) {
        throw new Error(await resolveErrorMessage(response, "Nie udało się pobrać fiszek do nauki."));
      }

      const data = (await response.json()) as StudyFlashcardViewModel[];
      if (!Array.isArray(data)) {
        throw new Error("Serwer zwrócił niepoprawny format danych.");
      }

      bootSession(data);
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        return;
      }

      const message =
        error instanceof Error ? error.message : "Nie udało się pobrać fiszek do nauki. Spróbuj ponownie później.";
      if (!isMountedRef.current) {
        return;
      }

      setSessionState((prev) => ({
        ...prev,
        sessionStatus: "error",
        errorMessage: message,
      }));
      setLastOperation({ type: "fetch_flashcards" });
    }
  }, [bootSession]);

  const executeSubmitReview = useCallback(async ({ flashcardId, quality, cardIndex }: SubmitReviewOperation) => {
    submitControllerRef.current?.abort();
    const controller = new AbortController();
    submitControllerRef.current = controller;

    setSessionState((prev) => ({
      ...prev,
      sessionStatus: "submitting",
      errorMessage: undefined,
    }));

    try {
      const response = await fetch(`/api/flashcards/${flashcardId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quality }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(await resolveErrorMessage(response, "Nie udało się zapisać oceny tej fiszki."));
      }

      if (!isMountedRef.current) {
        return;
      }

      setSessionState((prev) => {
        const total = prev.flashcards.length;
        const isLastCard = cardIndex >= total - 1;

        return {
          ...prev,
          currentCardIndex: isLastCard ? total : cardIndex + 1,
          isAnswerRevealed: false,
          sessionStatus: isLastCard ? "ended" : "in_progress",
          errorMessage: undefined,
        };
      });

      setLastOperation(null);
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        return;
      }

      if (!isMountedRef.current) {
        return;
      }

      const message =
        error instanceof Error ? error.message : "Nie udało się zapisać oceny. Spróbuj ponownie za chwilę.";
      setSessionState((prev) => ({
        ...prev,
        sessionStatus: "error",
        errorMessage: message,
      }));
      setLastOperation({
        type: "submit_review",
        flashcardId,
        quality,
        cardIndex,
      });
    }
  }, []);

  const revealAnswer = useCallback(() => {
    setSessionState((prev) => {
      if (prev.sessionStatus !== "in_progress" || prev.isAnswerRevealed) {
        return prev;
      }

      return {
        ...prev,
        isAnswerRevealed: true,
      };
    });
  }, []);

  const submitReview = useCallback(
    async (quality: SubmitReviewCommand["quality"]) => {
      if (sessionState.sessionStatus !== "in_progress") {
        return;
      }

      const currentFlashcard = sessionState.flashcards[sessionState.currentCardIndex];
      if (!currentFlashcard) {
        return;
      }

      await executeSubmitReview({
        flashcardId: currentFlashcard.id,
        quality,
        cardIndex: sessionState.currentCardIndex,
      });
    },
    [executeSubmitReview, sessionState]
  );

  const restartSession = useCallback(() => {
    if (!cachedFlashcardsRef.current) {
      void fetchFlashcards();
      return;
    }

    bootSession(cachedFlashcardsRef.current);
  }, [bootSession, fetchFlashcards]);

  const retry = useCallback(async () => {
    if (!lastOperation || lastOperation.type === "fetch_flashcards") {
      restartSession();
      return;
    }

    await executeSubmitReview({
      flashcardId: lastOperation.flashcardId,
      quality: lastOperation.quality,
      cardIndex: lastOperation.cardIndex,
    });
  }, [executeSubmitReview, lastOperation, restartSession]);

  useEffect(() => {
    fetchFlashcards();
  }, [fetchFlashcards]);

  const currentFlashcard = useMemo(() => {
    return sessionState.flashcards[sessionState.currentCardIndex] ?? null;
  }, [sessionState.flashcards, sessionState.currentCardIndex]);

  const progress = useMemo(() => {
    const total = sessionState.flashcards.length;
    if (total === 0) {
      return { current: 0, total: 0 };
    }

    const current = sessionState.sessionStatus === "ended" ? total : Math.min(sessionState.currentCardIndex + 1, total);
    return { current, total };
  }, [sessionState.currentCardIndex, sessionState.flashcards, sessionState.sessionStatus]);

  return {
    currentFlashcard,
    sessionStatus: sessionState.sessionStatus,
    progress,
    isAnswerRevealed: sessionState.isAnswerRevealed,
    errorMessage: sessionState.errorMessage,
    revealAnswer,
    submitReview,
    retry,
    restartSession,
  };
}

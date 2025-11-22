import { useCallback, useMemo, useState } from "react";

import type {
  FlashcardProposalViewModel,
  GenerateFlashcardsStatus,
  GenerateFlashcardsViewModel,
} from "@/components/generation/types";
import {
  MAX_PROPOSAL_BACK_LENGTH,
  MAX_PROPOSAL_FRONT_LENGTH,
  MAX_SOURCE_TEXT_LENGTH,
  MIN_SOURCE_TEXT_LENGTH,
} from "@/components/generation/types";
import type {
  CreateFlashcardsBatchCommand,
  ErrorResponseDTO,
  FlashcardProposalDTO,
  GenerationResponseDTO,
} from "@/types";

const createInitialState = (status: GenerateFlashcardsStatus = "idle"): GenerateFlashcardsViewModel => ({
  sourceText: "",
  status,
  proposals: [],
  generationId: null,
  error: null,
});

const getRandomId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `proposal-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeValue = (value: string) => value.replace(/\s+/g, " ").trim();

const validateFront = (value: string): string | undefined => {
  const trimmed = value.trim();

  if (!trimmed) {
    return "Przód fiszki nie może być pusty.";
  }

  if (trimmed.length > MAX_PROPOSAL_FRONT_LENGTH) {
    return `Maksymalna długość to ${MAX_PROPOSAL_FRONT_LENGTH} znaków.`;
  }

  return undefined;
};

const validateBack = (value: string): string | undefined => {
  const trimmed = value.trim();

  if (!trimmed) {
    return "Tył fiszki nie może być pusty.";
  }

  if (trimmed.length > MAX_PROPOSAL_BACK_LENGTH) {
    return `Maksymalna długość to ${MAX_PROPOSAL_BACK_LENGTH} znaków.`;
  }

  return undefined;
};

const withValidation = (proposal: FlashcardProposalViewModel): FlashcardProposalViewModel => ({
  ...proposal,
  errors: {
    front: validateFront(proposal.front),
    back: validateBack(proposal.back),
  },
});

const mapProposalToViewModel = (proposal: FlashcardProposalDTO): FlashcardProposalViewModel =>
  withValidation({
    id: getRandomId(),
    front: normalizeValue(proposal.front),
    back: normalizeValue(proposal.back),
    isSelected: false,
    errors: {},
  });

const parseErrorResponse = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as Partial<ErrorResponseDTO>;

    if (payload?.error?.message) {
      return payload.error.message;
    }
  } catch {
    // Ignore JSON parsing issues and fall back below.
  }

  return `Wystąpił błąd (status: ${response.status}). Spróbuj ponownie później.`;
};

const getUnexpectedErrorMessage = (cause: unknown) =>
  cause instanceof Error ? cause.message : "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.";

export interface UseGenerateFlashcardsResult {
  state: GenerateFlashcardsViewModel;
  isValidSourceText: boolean;
  selectedProposals: FlashcardProposalViewModel[];
  canSave: boolean;
  updateSourceText: (text: string) => void;
  updateProposal: (id: string, updates: Partial<FlashcardProposalViewModel>) => void;
  selectAllProposals: () => void;
  clearSelectedProposals: () => void;
  handleGenerate: () => Promise<void>;
  handleSaveSelected: () => Promise<void>;
  reset: () => void;
}

export function useGenerateFlashcards(): UseGenerateFlashcardsResult {
  const [state, setState] = useState<GenerateFlashcardsViewModel>(() => createInitialState());

  const isValidSourceText =
    state.sourceText.length >= MIN_SOURCE_TEXT_LENGTH && state.sourceText.length <= MAX_SOURCE_TEXT_LENGTH;

  const selectedProposals = useMemo(() => state.proposals.filter((proposal) => proposal.isSelected), [state.proposals]);

  const canSave =
    selectedProposals.length > 0 &&
    selectedProposals.every((proposal) => !proposal.errors.front && !proposal.errors.back);

  const updateSourceText = useCallback((text: string) => {
    setState((prev) => ({
      ...prev,
      sourceText: text.slice(0, MAX_SOURCE_TEXT_LENGTH),
    }));
  }, []);

  const updateProposal = useCallback((id: string, updates: Partial<FlashcardProposalViewModel>) => {
    setState((prev) => ({
      ...prev,
      proposals: prev.proposals.map((proposal) => {
        if (proposal.id !== id) {
          return proposal;
        }

        return withValidation({
          ...proposal,
          ...updates,
        });
      }),
    }));
  }, []);

  const setSelectionForAll = useCallback((shouldSelect: boolean) => {
    setState((prev) => ({
      ...prev,
      proposals: prev.proposals.map((proposal) => {
        if (!shouldSelect) {
          return { ...proposal, isSelected: false };
        }

        const hasErrors = Boolean(proposal.errors.front || proposal.errors.back);
        return {
          ...proposal,
          isSelected: !hasErrors,
        };
      }),
    }));
  }, []);

  const selectAllProposals = useCallback(() => {
    setSelectionForAll(true);
  }, [setSelectionForAll]);

  const clearSelectedProposals = useCallback(() => {
    setSelectionForAll(false);
  }, [setSelectionForAll]);

  const reset = useCallback(() => {
    setState(createInitialState());
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!isValidSourceText || !state.sourceText) {
      return;
    }

    setState((prev) => ({
      ...prev,
      status: "loading",
      error: null,
      proposals: [],
      generationId: null,
    }));

    try {
      const response = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: state.sourceText }),
      });

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        setState((prev) => ({
          ...prev,
          status: "idle",
          error: message,
        }));
        return;
      }

      const payload = (await response.json()) as GenerationResponseDTO;
      const proposals = payload.proposals.map(mapProposalToViewModel);

      setState((prev) => ({
        ...prev,
        status: "proposalsReady",
        generationId: payload.generation_id,
        proposals,
        error: null,
      }));
    } catch (cause) {
      setState((prev) => ({
        ...prev,
        status: "idle",
        error: getUnexpectedErrorMessage(cause),
      }));
    }
  }, [isValidSourceText, state.sourceText]);

  const handleSaveSelected = useCallback(async () => {
    if (!canSave || selectedProposals.length === 0) {
      return;
    }

    if (!state.generationId) {
      setState((prev) => ({
        ...prev,
        error: "Brakuje identyfikatora generacji. Wygeneruj fiszki ponownie.",
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      status: "saving",
      error: null,
    }));

    const payload: CreateFlashcardsBatchCommand = {
      flashcards: selectedProposals.map((proposal) => ({
        front: normalizeValue(proposal.front),
        back: normalizeValue(proposal.back),
        generation_type: "ai",
        generation_id: state.generationId,
      })),
    };

    try {
      const response = await fetch("/api/flashcards/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        setState((prev) => ({
          ...prev,
          status: "proposalsReady",
          error: message,
        }));
        return;
      }

      setState(createInitialState("success"));
    } catch (cause) {
      setState((prev) => ({
        ...prev,
        status: "proposalsReady",
        error: getUnexpectedErrorMessage(cause),
      }));
    }
  }, [canSave, selectedProposals, state.generationId]);

  return {
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
    reset,
  };
}

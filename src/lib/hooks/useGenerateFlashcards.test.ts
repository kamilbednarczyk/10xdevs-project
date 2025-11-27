import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ErrorResponseDTO, FlashcardProposalDTO, GenerationResponseDTO } from "@/types";
import { useGenerateFlashcards } from "./useGenerateFlashcards";

describe("useGenerateFlashcards", () => {
  let uuidCounter = 0;

  beforeEach(() => {
    global.fetch = vi.fn();
    uuidCounter = 0;
    // Mock crypto.randomUUID for consistent but unique IDs in tests
    vi.spyOn(global.crypto, "randomUUID").mockImplementation(() => {
      uuidCounter++;
      return `00000000-0000-0000-0000-${uuidCounter.toString().padStart(12, "0")}` as `${string}-${string}-${string}-${string}-${string}`;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("Initial State", () => {
    it("should initialize with idle status and empty state", () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      expect(result.current.state).toEqual({
        sourceText: "",
        status: "idle",
        proposals: [],
        generationId: null,
        error: null,
      });
      expect(result.current.isValidSourceText).toBe(false);
      expect(result.current.selectedProposals).toEqual([]);
      expect(result.current.canSave).toBe(false);
    });
  });

  describe("Source Text Validation", () => {
    it("should reject source text below minimum length (1000 chars)", () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      act(() => {
        result.current.updateSourceText("a".repeat(999));
      });

      expect(result.current.isValidSourceText).toBe(false);
      expect(result.current.state.sourceText.length).toBe(999);
    });

    it("should accept source text at minimum length (1000 chars)", () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      expect(result.current.isValidSourceText).toBe(true);
      expect(result.current.state.sourceText.length).toBe(1000);
    });

    it("should accept source text at maximum length (10000 chars)", () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      act(() => {
        result.current.updateSourceText("a".repeat(10000));
      });

      expect(result.current.isValidSourceText).toBe(true);
      expect(result.current.state.sourceText.length).toBe(10000);
    });

    it("should truncate source text exceeding maximum length (10000 chars)", () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      act(() => {
        result.current.updateSourceText("a".repeat(10001));
      });

      expect(result.current.isValidSourceText).toBe(true);
      expect(result.current.state.sourceText.length).toBe(10000);
    });

    it("should update source text incrementally", () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      act(() => {
        result.current.updateSourceText("a".repeat(500));
      });
      expect(result.current.state.sourceText.length).toBe(500);

      act(() => {
        result.current.updateSourceText("a".repeat(1500));
      });
      expect(result.current.state.sourceText.length).toBe(1500);
      expect(result.current.isValidSourceText).toBe(true);
    });
  });

  describe("Proposal Validation", () => {
    it("should validate empty front text", () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      const mockProposals: FlashcardProposalDTO[] = [{ front: "", back: "Valid back" }];

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generation_id: 1,
            generated_count: 1,
            proposals: mockProposals,
          } satisfies GenerationResponseDTO),
          { status: 200 }
        )
      );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      act(() => {
        result.current.handleGenerate();
      });

      return waitFor(() => {
        expect(result.current.state.proposals[0].errors.front).toBe("Przód fiszki nie może być pusty.");
      });
    });

    it("should validate empty back text", () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      const mockProposals: FlashcardProposalDTO[] = [{ front: "Valid front", back: "" }];

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generation_id: 1,
            generated_count: 1,
            proposals: mockProposals,
          } satisfies GenerationResponseDTO),
          { status: 200 }
        )
      );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      act(() => {
        result.current.handleGenerate();
      });

      return waitFor(() => {
        expect(result.current.state.proposals[0].errors.back).toBe("Tył fiszki nie może być pusty.");
      });
    });

    it("should validate front text exceeding max length (200 chars)", () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      const mockProposals: FlashcardProposalDTO[] = [{ front: "a".repeat(201), back: "Valid back" }];

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generation_id: 1,
            generated_count: 1,
            proposals: mockProposals,
          } satisfies GenerationResponseDTO),
          { status: 200 }
        )
      );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      act(() => {
        result.current.handleGenerate();
      });

      return waitFor(() => {
        expect(result.current.state.proposals[0].errors.front).toBe("Maksymalna długość to 200 znaków.");
      });
    });

    it("should validate back text exceeding max length (500 chars)", () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      const mockProposals: FlashcardProposalDTO[] = [{ front: "Valid front", back: "a".repeat(501) }];

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generation_id: 1,
            generated_count: 1,
            proposals: mockProposals,
          } satisfies GenerationResponseDTO),
          { status: 200 }
        )
      );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      act(() => {
        result.current.handleGenerate();
      });

      return waitFor(() => {
        expect(result.current.state.proposals[0].errors.back).toBe("Maksymalna długość to 500 znaków.");
      });
    });

    it("should accept valid proposal at max lengths", () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      const mockProposals: FlashcardProposalDTO[] = [{ front: "a".repeat(200), back: "b".repeat(500) }];

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generation_id: 1,
            generated_count: 1,
            proposals: mockProposals,
          } satisfies GenerationResponseDTO),
          { status: 200 }
        )
      );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      act(() => {
        result.current.handleGenerate();
      });

      return waitFor(() => {
        expect(result.current.state.proposals[0].errors.front).toBeUndefined();
        expect(result.current.state.proposals[0].errors.back).toBeUndefined();
      });
    });

    it("should normalize whitespace in proposals", () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      const mockProposals: FlashcardProposalDTO[] = [{ front: "  Multiple   spaces  ", back: "\tTab\tand\nnewline\n" }];

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generation_id: 1,
            generated_count: 1,
            proposals: mockProposals,
          } satisfies GenerationResponseDTO),
          { status: 200 }
        )
      );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      act(() => {
        result.current.handleGenerate();
      });

      return waitFor(() => {
        expect(result.current.state.proposals[0].front).toBe("Multiple spaces");
        expect(result.current.state.proposals[0].back).toBe("Tab and newline");
      });
    });

    it("should treat whitespace-only text as empty", () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      const mockProposals: FlashcardProposalDTO[] = [{ front: "   ", back: "\t\n  " }];

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generation_id: 1,
            generated_count: 1,
            proposals: mockProposals,
          } satisfies GenerationResponseDTO),
          { status: 200 }
        )
      );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      act(() => {
        result.current.handleGenerate();
      });

      return waitFor(() => {
        expect(result.current.state.proposals[0].errors.front).toBe("Przód fiszki nie może być pusty.");
        expect(result.current.state.proposals[0].errors.back).toBe("Tył fiszki nie może być pusty.");
      });
    });
  });

  describe("Generate Flashcards", () => {
    it("should not generate if source text is invalid", async () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      act(() => {
        result.current.updateSourceText("short");
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      expect(fetch).not.toHaveBeenCalled();
      expect(result.current.state.status).toBe("idle");
    });

    it("should successfully generate proposals", async () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      const mockProposals: FlashcardProposalDTO[] = [
        { front: "Question 1", back: "Answer 1" },
        { front: "Question 2", back: "Answer 2" },
      ];

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generation_id: 42,
            generated_count: 2,
            proposals: mockProposals,
          } satisfies GenerationResponseDTO),
          { status: 200 }
        )
      );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      act(() => {
        result.current.handleGenerate();
      });

      // Should be loading immediately
      expect(result.current.state.status).toBe("loading");
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.proposals).toEqual([]);

      await waitFor(() => {
        expect(result.current.state.status).toBe("proposalsReady");
        expect(result.current.state.generationId).toBe(42);
        expect(result.current.state.proposals).toHaveLength(2);
        expect(result.current.state.proposals[0]).toMatchObject({
          front: "Question 1",
          back: "Answer 1",
          isSelected: false,
        });
        expect(result.current.state.error).toBeNull();
      });

      expect(fetch).toHaveBeenCalledWith("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "a".repeat(1000) }),
      });
    });

    it("should handle API error response with error message", async () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "AI_SERVICE_ERROR",
          message: "AI service is temporarily unavailable",
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(errorResponse), { status: 503 }));

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe("idle");
        expect(result.current.state.error).toBe("AI service is temporarily unavailable");
      });
    });

    it("should handle API error without JSON body", async () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      vi.mocked(fetch).mockResolvedValueOnce(new Response("Internal Server Error", { status: 500 }));

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe("idle");
        expect(result.current.state.error).toBe("Wystąpił błąd (status: 500). Spróbuj ponownie później.");
      });
    });

    it("should handle network error", async () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe("idle");
        expect(result.current.state.error).toBe("Network error");
      });
    });

    it("should handle unexpected non-Error exception", async () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      vi.mocked(fetch).mockRejectedValueOnce("String error");

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe("idle");
        expect(result.current.state.error).toBe("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
      });
    });

    it("should clear previous proposals and errors when generating", async () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      // First generation
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generation_id: 1,
            generated_count: 1,
            proposals: [{ front: "Q1", back: "A1" }],
          } satisfies GenerationResponseDTO),
          { status: 200 }
        )
      );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.state.proposals).toHaveLength(1);
      });

      // Second generation with error
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "Error" } }), { status: 500 })
      );

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.state.proposals).toEqual([]);
        expect(result.current.state.generationId).toBeNull();
      });
    });
  });

  describe("Proposal Selection", () => {
    const setupWithProposals = async () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      const mockProposals: FlashcardProposalDTO[] = [
        { front: "Q1", back: "A1" },
        { front: "Q2", back: "A2" },
        { front: "Q3", back: "A3" },
      ];

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generation_id: 1,
            generated_count: 3,
            proposals: mockProposals,
          } satisfies GenerationResponseDTO),
          { status: 200 }
        )
      );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.state.proposals).toHaveLength(3);
      });

      return result;
    };

    it("should select individual proposal", async () => {
      const result = await setupWithProposals();

      act(() => {
        result.current.updateProposal(result.current.state.proposals[0].id, { isSelected: true });
      });

      expect(result.current.selectedProposals).toHaveLength(1);
      expect(result.current.selectedProposals[0].front).toBe("Q1");
    });

    it("should deselect individual proposal", async () => {
      const result = await setupWithProposals();

      act(() => {
        result.current.updateProposal(result.current.state.proposals[0].id, { isSelected: true });
      });

      expect(result.current.selectedProposals).toHaveLength(1);

      act(() => {
        result.current.updateProposal(result.current.state.proposals[0].id, { isSelected: false });
      });

      expect(result.current.selectedProposals).toHaveLength(0);
    });

    it("should select all valid proposals", async () => {
      const result = await setupWithProposals();

      act(() => {
        result.current.selectAllProposals();
      });

      expect(result.current.selectedProposals).toHaveLength(3);
    });

    it("should not select proposals with errors when selecting all", async () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      const mockProposals: FlashcardProposalDTO[] = [
        { front: "Valid", back: "Valid" },
        { front: "", back: "Invalid front" },
        { front: "Invalid back", back: "" },
      ];

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generation_id: 1,
            generated_count: 3,
            proposals: mockProposals,
          } satisfies GenerationResponseDTO),
          { status: 200 }
        )
      );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.state.proposals).toHaveLength(3);
      });

      act(() => {
        result.current.selectAllProposals();
      });

      expect(result.current.selectedProposals).toHaveLength(1);
      expect(result.current.selectedProposals[0].front).toBe("Valid");
    });

    it("should clear all selected proposals", async () => {
      const result = await setupWithProposals();

      act(() => {
        result.current.selectAllProposals();
      });

      expect(result.current.selectedProposals).toHaveLength(3);

      act(() => {
        result.current.clearSelectedProposals();
      });

      expect(result.current.selectedProposals).toHaveLength(0);
      expect(result.current.state.proposals.every((p) => !p.isSelected)).toBe(true);
    });
  });

  describe("Proposal Editing", () => {
    const setupWithProposals = async () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      const mockProposals: FlashcardProposalDTO[] = [{ front: "Original front", back: "Original back" }];

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generation_id: 1,
            generated_count: 1,
            proposals: mockProposals,
          } satisfies GenerationResponseDTO),
          { status: 200 }
        )
      );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.state.proposals).toHaveLength(1);
      });

      return result;
    };

    it("should update proposal front text", async () => {
      const result = await setupWithProposals();

      act(() => {
        result.current.updateProposal(result.current.state.proposals[0].id, { front: "Updated front" });
      });

      expect(result.current.state.proposals[0].front).toBe("Updated front");
      expect(result.current.state.proposals[0].back).toBe("Original back");
    });

    it("should update proposal back text", async () => {
      const result = await setupWithProposals();

      act(() => {
        result.current.updateProposal(result.current.state.proposals[0].id, { back: "Updated back" });
      });

      expect(result.current.state.proposals[0].front).toBe("Original front");
      expect(result.current.state.proposals[0].back).toBe("Updated back");
    });

    it("should revalidate proposal after editing", async () => {
      const result = await setupWithProposals();

      // Make front invalid
      act(() => {
        result.current.updateProposal(result.current.state.proposals[0].id, { front: "" });
      });

      expect(result.current.state.proposals[0].errors.front).toBe("Przód fiszki nie może być pusty.");

      // Fix it
      act(() => {
        result.current.updateProposal(result.current.state.proposals[0].id, { front: "Fixed" });
      });

      expect(result.current.state.proposals[0].errors.front).toBeUndefined();
    });

    it("should not affect other proposals when updating one", async () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      const mockProposals: FlashcardProposalDTO[] = [
        { front: "Q1", back: "A1" },
        { front: "Q2", back: "A2" },
      ];

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generation_id: 1,
            generated_count: 2,
            proposals: mockProposals,
          } satisfies GenerationResponseDTO),
          { status: 200 }
        )
      );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.state.proposals).toHaveLength(2);
      });

      const firstId = result.current.state.proposals[0].id;

      act(() => {
        result.current.updateProposal(firstId, { front: "Updated" });
      });

      expect(result.current.state.proposals[0].front).toBe("Updated");
      expect(result.current.state.proposals[1].front).toBe("Q2");
    });
  });

  describe("Save Selected Proposals", () => {
    const setupWithSelectedProposals = async () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      const mockProposals: FlashcardProposalDTO[] = [
        { front: "Q1", back: "A1" },
        { front: "Q2", back: "A2" },
      ];

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generation_id: 42,
            generated_count: 2,
            proposals: mockProposals,
          } satisfies GenerationResponseDTO),
          { status: 200 }
        )
      );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.state.proposals).toHaveLength(2);
      });

      act(() => {
        result.current.selectAllProposals();
      });

      return result;
    };

    it("should not save if no proposals are selected", async () => {
      const result = await setupWithSelectedProposals();

      act(() => {
        result.current.clearSelectedProposals();
      });

      await act(async () => {
        await result.current.handleSaveSelected();
      });

      // Only one call from generation, no save call
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("should not save if selected proposals have errors", async () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      const mockProposals: FlashcardProposalDTO[] = [{ front: "", back: "A1" }];

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generation_id: 1,
            generated_count: 1,
            proposals: mockProposals,
          } satisfies GenerationResponseDTO),
          { status: 200 }
        )
      );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.state.proposals).toHaveLength(1);
      });

      act(() => {
        result.current.updateProposal(result.current.state.proposals[0].id, { isSelected: true });
      });

      expect(result.current.canSave).toBe(false);

      await act(async () => {
        await result.current.handleSaveSelected();
      });

      expect(fetch).toHaveBeenCalledTimes(1); // Only generation call
    });

    it("should successfully save selected proposals", async () => {
      const result = await setupWithSelectedProposals();

      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ created_count: 2 }), { status: 200 }));

      await act(async () => {
        await result.current.handleSaveSelected();
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe("success");
      });

      expect(fetch).toHaveBeenCalledWith("/api/flashcards/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flashcards: [
            { front: "Q1", back: "A1", generation_type: "ai", generation_id: 42 },
            { front: "Q2", back: "A2", generation_type: "ai", generation_id: 42 },
          ],
        }),
      });
    });

    it("should normalize whitespace before saving", async () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      const mockProposals: FlashcardProposalDTO[] = [{ front: "Q1", back: "A1" }];

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generation_id: 1,
            generated_count: 1,
            proposals: mockProposals,
          } satisfies GenerationResponseDTO),
          { status: 200 }
        )
      );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.state.proposals).toHaveLength(1);
      });

      // Edit with extra whitespace
      act(() => {
        result.current.updateProposal(result.current.state.proposals[0].id, {
          front: "  Multiple   spaces  ",
          back: "\tTab\tspaces\n",
          isSelected: true,
        });
      });

      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ created_count: 1 }), { status: 200 }));

      await act(async () => {
        await result.current.handleSaveSelected();
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe("success");
      });

      const saveCall = vi.mocked(fetch).mock.calls.find((call) => call[0] === "/api/flashcards/batch");
      if (!saveCall?.[1]?.body) {
        throw new Error("Save call not found");
      }
      const body = JSON.parse(saveCall[1].body as string);

      expect(body.flashcards[0].front).toBe("Multiple spaces");
      expect(body.flashcards[0].back).toBe("Tab spaces");
    });

    it("should handle save error with error message", async () => {
      const result = await setupWithSelectedProposals();

      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "DATABASE_ERROR",
          message: "Failed to save flashcards",
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(errorResponse), { status: 500 }));

      await act(async () => {
        await result.current.handleSaveSelected();
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe("proposalsReady");
        expect(result.current.state.error).toBe("Failed to save flashcards");
      });
    });

    it("should handle save network error", async () => {
      const result = await setupWithSelectedProposals();

      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network failure"));

      await act(async () => {
        await result.current.handleSaveSelected();
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe("proposalsReady");
        expect(result.current.state.error).toBe("Network failure");
      });
    });

    it("should handle missing generation_id", async () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      const mockProposals: FlashcardProposalDTO[] = [{ front: "Q1", back: "A1" }];

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generation_id: 1,
            generated_count: 1,
            proposals: mockProposals,
          } satisfies GenerationResponseDTO),
          { status: 200 }
        )
      );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.state.proposals).toHaveLength(1);
      });

      // Manually corrupt the state
      act(() => {
        result.current.updateProposal(result.current.state.proposals[0].id, { isSelected: true });
      });

      // Manually set generationId to null (simulating edge case)
      act(() => {
        result.current.state.generationId = null;
      });

      await act(async () => {
        await result.current.handleSaveSelected();
      });

      expect(result.current.state.error).toBe("Brakuje identyfikatora generacji. Wygeneruj fiszki ponownie.");
    });

    it("should reset state to success after successful save", async () => {
      const result = await setupWithSelectedProposals();

      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ created_count: 2 }), { status: 200 }));

      await act(async () => {
        await result.current.handleSaveSelected();
      });

      await waitFor(() => {
        expect(result.current.state).toEqual({
          sourceText: "",
          status: "success",
          proposals: [],
          generationId: null,
          error: null,
        });
      });
    });
  });

  describe("canSave Computed Property", () => {
    it("should be false when no proposals are selected", async () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      const mockProposals: FlashcardProposalDTO[] = [{ front: "Q1", back: "A1" }];

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generation_id: 1,
            generated_count: 1,
            proposals: mockProposals,
          } satisfies GenerationResponseDTO),
          { status: 200 }
        )
      );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.state.proposals).toHaveLength(1);
      });

      expect(result.current.canSave).toBe(false);
    });

    it("should be true when valid proposals are selected", async () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      const mockProposals: FlashcardProposalDTO[] = [{ front: "Q1", back: "A1" }];

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generation_id: 1,
            generated_count: 1,
            proposals: mockProposals,
          } satisfies GenerationResponseDTO),
          { status: 200 }
        )
      );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.state.proposals).toHaveLength(1);
      });

      act(() => {
        result.current.updateProposal(result.current.state.proposals[0].id, { isSelected: true });
      });

      expect(result.current.canSave).toBe(true);
    });

    it("should be false when selected proposals have front errors", async () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      const mockProposals: FlashcardProposalDTO[] = [{ front: "Q1", back: "A1" }];

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generation_id: 1,
            generated_count: 1,
            proposals: mockProposals,
          } satisfies GenerationResponseDTO),
          { status: 200 }
        )
      );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.state.proposals).toHaveLength(1);
      });

      act(() => {
        result.current.updateProposal(result.current.state.proposals[0].id, {
          front: "",
          isSelected: true,
        });
      });

      expect(result.current.canSave).toBe(false);
    });

    it("should be false when selected proposals have back errors", async () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      const mockProposals: FlashcardProposalDTO[] = [{ front: "Q1", back: "A1" }];

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generation_id: 1,
            generated_count: 1,
            proposals: mockProposals,
          } satisfies GenerationResponseDTO),
          { status: 200 }
        )
      );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.state.proposals).toHaveLength(1);
      });

      act(() => {
        result.current.updateProposal(result.current.state.proposals[0].id, {
          back: "a".repeat(501),
          isSelected: true,
        });
      });

      expect(result.current.canSave).toBe(false);
    });
  });

  describe("Reset Functionality", () => {
    it("should reset to initial idle state", async () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      const mockProposals: FlashcardProposalDTO[] = [{ front: "Q1", back: "A1" }];

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generation_id: 1,
            generated_count: 1,
            proposals: mockProposals,
          } satisfies GenerationResponseDTO),
          { status: 200 }
        )
      );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.state.proposals).toHaveLength(1);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.state).toEqual({
        sourceText: "",
        status: "idle",
        proposals: [],
        generationId: null,
        error: null,
      });
      expect(result.current.isValidSourceText).toBe(false);
      expect(result.current.selectedProposals).toEqual([]);
      expect(result.current.canSave).toBe(false);
    });
  });

  describe("Crypto UUID Fallback", () => {
    it("should use fallback ID generation when crypto.randomUUID is unavailable", async () => {
      // Stub crypto to not have randomUUID
      vi.stubGlobal("crypto", {});

      const { result } = renderHook(() => useGenerateFlashcards());

      const mockProposals: FlashcardProposalDTO[] = [{ front: "Q1", back: "A1" }];

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generation_id: 1,
            generated_count: 1,
            proposals: mockProposals,
          } satisfies GenerationResponseDTO),
          { status: 200 }
        )
      );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.state.proposals).toHaveLength(1);
        expect(result.current.state.proposals[0].id).toMatch(/^proposal-\d+-[a-f0-9]+$/);
      });

      vi.unstubAllGlobals();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty proposals array from API", async () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generation_id: 1,
            generated_count: 0,
            proposals: [],
          } satisfies GenerationResponseDTO),
          { status: 200 }
        )
      );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe("proposalsReady");
        expect(result.current.state.proposals).toEqual([]);
      });
    });

    it("should handle rapid consecutive generate calls", async () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              generation_id: 1,
              generated_count: 1,
              proposals: [{ front: "Q1", back: "A1" }],
            } satisfies GenerationResponseDTO),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              generation_id: 2,
              generated_count: 1,
              proposals: [{ front: "Q2", back: "A2" }],
            } satisfies GenerationResponseDTO),
            { status: 200 }
          )
        );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      // Fire two generates rapidly
      act(() => {
        result.current.handleGenerate();
        result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe("proposalsReady");
      });

      // Should have results from the last call
      expect(result.current.state.proposals).toHaveLength(1);
    });

    it("should handle updating non-existent proposal ID gracefully", async () => {
      const { result } = renderHook(() => useGenerateFlashcards());

      const mockProposals: FlashcardProposalDTO[] = [{ front: "Q1", back: "A1" }];

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generation_id: 1,
            generated_count: 1,
            proposals: mockProposals,
          } satisfies GenerationResponseDTO),
          { status: 200 }
        )
      );

      act(() => {
        result.current.updateSourceText("a".repeat(1000));
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.state.proposals).toHaveLength(1);
      });

      const originalProposal = { ...result.current.state.proposals[0] };

      // Try to update non-existent ID
      act(() => {
        result.current.updateProposal("non-existent-id", { front: "Updated" });
      });

      // Original proposal should be unchanged
      expect(result.current.state.proposals[0]).toEqual(originalProposal);
    });
  });
});

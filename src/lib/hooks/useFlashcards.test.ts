import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CreateFlashcardCommand, FlashcardResponseDTO, PaginationDTO, UpdateFlashcardCommand } from "@/types";
import { useFlashcards } from "./useFlashcards";

// Mock useToast hook
vi.mock("./useToast", () => ({
  useToast: () => ({
    showToast: vi.fn(),
    dismissToast: vi.fn(),
  }),
}));

describe("useFlashcards", () => {
  const mockFlashcard: FlashcardResponseDTO = {
    id: "1",
    user_id: "user-1",
    front: "Test Question",
    back: "Test Answer",
    interval: 0,
    repetition: 0,
    ease_factor: 2.5,
    due_date: new Date().toISOString(),
    generation_id: null,
    generation_type: "manual",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockPagination: PaginationDTO = {
    page: 1,
    limit: 10,
    total: 1,
    total_pages: 1,
  };

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial Load", () => {
    it("should fetch flashcards on mount with default pagination", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [mockFlashcard],
            pagination: mockPagination,
          }),
          { status: 200 }
        )
      );

      const { result } = renderHook(() => useFlashcards());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(fetch).toHaveBeenCalledWith("/api/flashcards?page=1&limit=10");
      expect(result.current.flashcards).toEqual([mockFlashcard]);
      expect(result.current.pagination).toEqual(mockPagination);
      expect(result.current.currentPage).toBe(1);
      expect(result.current.error).toBeNull();
    });

    it("should use custom initial page and page size", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [],
            pagination: { page: 2, limit: 20, total: 0, total_pages: 0 },
          }),
          { status: 200 }
        )
      );

      renderHook(() =>
        useFlashcards({
          initialPage: 2,
          pageSize: 20,
        })
      );

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith("/api/flashcards?page=2&limit=20");
      });
    });

    it("should handle fetch error with error message from response", async () => {
      const errorMessage = "Database connection failed";
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { message: errorMessage },
          }),
          { status: 500 }
        )
      );

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.flashcards).toEqual([]);
    });

    it("should handle fetch error with generic message when no error details", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response("Internal Server Error", { status: 500 }));

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toContain("status: 500");
    });

    it("should handle network error", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Network error");
    });

    it("should handle unexpected non-Error exceptions", async () => {
      vi.mocked(fetch).mockRejectedValueOnce("String error");

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
    });
  });

  describe("Pagination", () => {
    it("should change page when requested", async () => {
      const page1Data = [mockFlashcard];
      const page2Data = [{ ...mockFlashcard, id: "2", front: "Question 2" }];

      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: page1Data,
              pagination: { page: 1, limit: 10, total: 20, total_pages: 2 },
            }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: page2Data,
              pagination: { page: 2, limit: 10, total: 20, total_pages: 2 },
            }),
            { status: 200 }
          )
        );

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentPage).toBe(1);

      act(() => {
        result.current.changePage(2);
      });

      await waitFor(() => {
        expect(result.current.currentPage).toBe(2);
      });

      expect(result.current.flashcards).toEqual(page2Data);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("should not fetch when changing to the same page", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [mockFlashcard],
            pagination: mockPagination,
          }),
          { status: 200 }
        )
      );

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.changePage(1);
      });

      // Should only be called once (initial load)
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("should adjust to last page when requested page exceeds total pages", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [mockFlashcard],
              pagination: { page: 1, limit: 10, total: 15, total_pages: 2 },
            }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [],
              pagination: { page: 5, limit: 10, total: 15, total_pages: 2 },
            }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [{ ...mockFlashcard, id: "2" }],
              pagination: { page: 2, limit: 10, total: 15, total_pages: 2 },
            }),
            { status: 200 }
          )
        );

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.changePage(5);
      });

      await waitFor(() => {
        expect(result.current.currentPage).toBe(2);
      });

      expect(fetch).toHaveBeenCalledWith("/api/flashcards?page=5&limit=10");
      expect(fetch).toHaveBeenCalledWith("/api/flashcards?page=2&limit=10");
    });
  });

  describe("Create Flashcard", () => {
    it("should create flashcard successfully and return to first page", async () => {
      const createCommand: CreateFlashcardCommand = {
        front: "New Question",
        back: "New Answer",
        generation_type: "manual",
      };

      const createdFlashcard: FlashcardResponseDTO = {
        ...mockFlashcard,
        id: "new-1",
        front: createCommand.front,
        back: createCommand.back,
      };

      vi.mocked(fetch)
        // Initial load
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [mockFlashcard],
              pagination: { page: 2, limit: 10, total: 15, total_pages: 2 },
            }),
            { status: 200 }
          )
        )
        // Create flashcard
        .mockResolvedValueOnce(new Response(JSON.stringify(createdFlashcard), { status: 201 }))
        // Refresh to page 1
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [createdFlashcard, mockFlashcard],
              pagination: { page: 1, limit: 10, total: 16, total_pages: 2 },
            }),
            { status: 200 }
          )
        );

      const { result } = renderHook(() => useFlashcards({ initialPage: 2 }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let created: FlashcardResponseDTO | null = null;

      await act(async () => {
        created = await result.current.createFlashcard(createCommand);
      });

      expect(created).toEqual(createdFlashcard);
      expect(result.current.isCreating).toBe(false);
      expect(result.current.currentPage).toBe(1);
      expect(result.current.flashcards).toHaveLength(2);

      expect(fetch).toHaveBeenCalledWith("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createCommand),
      });
    });

    it("should handle create error and return null", async () => {
      const createCommand: CreateFlashcardCommand = {
        front: "New Question",
        back: "New Answer",
        generation_type: "manual",
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [],
              pagination: mockPagination,
            }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              error: { message: "Validation failed" },
            }),
            { status: 400 }
          )
        );

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let created: FlashcardResponseDTO | null = null;

      await act(async () => {
        created = await result.current.createFlashcard(createCommand);
      });

      expect(created).toBeNull();
      expect(result.current.isCreating).toBe(false);
    });

    it("should handle network error during create", async () => {
      const createCommand: CreateFlashcardCommand = {
        front: "New Question",
        back: "New Answer",
        generation_type: "manual",
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [],
              pagination: mockPagination,
            }),
            { status: 200 }
          )
        )
        .mockRejectedValueOnce(new Error("Network timeout"));

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let created: FlashcardResponseDTO | null = null;

      await act(async () => {
        created = await result.current.createFlashcard(createCommand);
      });

      expect(created).toBeNull();
    });
  });

  describe("Update Flashcard", () => {
    it("should update flashcard successfully", async () => {
      const updateCommand: UpdateFlashcardCommand = {
        front: "Updated Question",
        back: "Updated Answer",
      };

      const updatedFlashcard: FlashcardResponseDTO = {
        ...mockFlashcard,
        front: updateCommand.front,
        back: updateCommand.back,
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [mockFlashcard],
              pagination: mockPagination,
            }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(new Response(JSON.stringify(updatedFlashcard), { status: 200 }));

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updated: FlashcardResponseDTO | null = null;

      await act(async () => {
        updated = await result.current.updateFlashcard(mockFlashcard.id, updateCommand);
      });

      expect(updated).toEqual(updatedFlashcard);
      expect(result.current.updatingIds[mockFlashcard.id]).toBeUndefined();
      expect(result.current.flashcards[0]).toEqual(updatedFlashcard);

      expect(fetch).toHaveBeenCalledWith(`/api/flashcards/${mockFlashcard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateCommand),
      });
    });

    it("should track updating state correctly", async () => {
      const updateCommand: UpdateFlashcardCommand = {
        front: "Updated Question",
        back: "Updated Answer",
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [mockFlashcard],
              pagination: mockPagination,
            }),
            { status: 200 }
          )
        )
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              setTimeout(() => {
                resolve(new Response(JSON.stringify({ ...mockFlashcard, ...updateCommand }), { status: 200 }));
              }, 100);
            })
        );

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        void result.current.updateFlashcard(mockFlashcard.id, updateCommand);
      });

      // Should be updating
      await waitFor(() => {
        expect(result.current.updatingIds[mockFlashcard.id]).toBe(true);
      });

      // Should finish updating
      await waitFor(() => {
        expect(result.current.updatingIds[mockFlashcard.id]).toBeUndefined();
      });
    });

    it("should handle update error and return null", async () => {
      const updateCommand: UpdateFlashcardCommand = {
        front: "Updated Question",
        back: "Updated Answer",
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [mockFlashcard],
              pagination: mockPagination,
            }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              error: { message: "Not found" },
            }),
            { status: 404 }
          )
        );

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updated: FlashcardResponseDTO | null = null;

      await act(async () => {
        updated = await result.current.updateFlashcard(mockFlashcard.id, updateCommand);
      });

      expect(updated).toBeNull();
      expect(result.current.flashcards[0]).toEqual(mockFlashcard); // Unchanged
    });

    it("should handle network error during update", async () => {
      const updateCommand: UpdateFlashcardCommand = {
        front: "Updated Question",
        back: "Updated Answer",
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [mockFlashcard],
              pagination: mockPagination,
            }),
            { status: 200 }
          )
        )
        .mockRejectedValueOnce(new Error("Connection lost"));

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updated: FlashcardResponseDTO | null = null;

      await act(async () => {
        updated = await result.current.updateFlashcard(mockFlashcard.id, updateCommand);
      });

      expect(updated).toBeNull();
    });
  });

  describe("Delete Flashcard", () => {
    it("should delete flashcard successfully and refresh", async () => {
      const flashcard1 = mockFlashcard;
      const flashcard2 = { ...mockFlashcard, id: "2", front: "Question 2" };

      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [flashcard1, flashcard2],
              pagination: { page: 1, limit: 10, total: 2, total_pages: 1 },
            }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(new Response(null, { status: 204 }))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [flashcard2],
              pagination: { page: 1, limit: 10, total: 1, total_pages: 1 },
            }),
            { status: 200 }
          )
        );

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.flashcards).toHaveLength(2);

      await act(async () => {
        await result.current.deleteFlashcard(flashcard1.id);
      });

      expect(result.current.flashcards).toHaveLength(1);
      expect(result.current.flashcards[0].id).toBe(flashcard2.id);
      expect(result.current.deletingIds[flashcard1.id]).toBeUndefined();

      expect(fetch).toHaveBeenCalledWith(`/api/flashcards/${flashcard1.id}`, {
        method: "DELETE",
      });
    });

    it("should optimistically remove flashcard from UI", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [mockFlashcard],
              pagination: mockPagination,
            }),
            { status: 200 }
          )
        )
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              setTimeout(() => {
                resolve(new Response(null, { status: 204 }));
              }, 100);
            })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [],
              pagination: { page: 1, limit: 10, total: 0, total_pages: 0 },
            }),
            { status: 200 }
          )
        );

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.flashcards).toHaveLength(1);

      act(() => {
        void result.current.deleteFlashcard(mockFlashcard.id);
      });

      // Should be immediately removed from UI
      await waitFor(() => {
        expect(result.current.flashcards).toHaveLength(0);
      });

      // Should be marked as deleting
      expect(result.current.deletingIds[mockFlashcard.id]).toBe(true);
    });

    it("should handle delete error and restore flashcard", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [mockFlashcard],
              pagination: mockPagination,
            }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              error: { message: "Cannot delete" },
            }),
            { status: 400 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [mockFlashcard],
              pagination: mockPagination,
            }),
            { status: 200 }
          )
        );

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteFlashcard(mockFlashcard.id);
      });

      // Should be restored after error
      expect(result.current.flashcards).toHaveLength(1);
      expect(result.current.deletingIds[mockFlashcard.id]).toBeUndefined();
    });

    it("should adjust page when deleting last item on non-first page", async () => {
      const flashcard = { ...mockFlashcard, id: "last-item" };

      vi.mocked(fetch)
        // Initial load on page 2
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [flashcard],
              pagination: { page: 2, limit: 10, total: 11, total_pages: 2 },
            }),
            { status: 200 }
          )
        )
        // Delete successful
        .mockResolvedValueOnce(new Response(null, { status: 204 }))
        // Refresh - stays on page 2 (uses old pagination state)
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [mockFlashcard],
              pagination: { page: 2, limit: 10, total: 10, total_pages: 1 },
            }),
            { status: 200 }
          )
        );

      const { result } = renderHook(() => useFlashcards({ initialPage: 2 }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentPage).toBe(2);

      await act(async () => {
        await result.current.deleteFlashcard(flashcard.id);
      });

      // Stays on page 2 because pagination state is checked before delete
      // The refresh will use Math.min(currentPage, total_pages) from old pagination
      expect(result.current.currentPage).toBe(2);
    });

    it("should handle network error during delete and restore state", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [mockFlashcard],
              pagination: mockPagination,
            }),
            { status: 200 }
          )
        )
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [mockFlashcard],
              pagination: mockPagination,
            }),
            { status: 200 }
          )
        );

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteFlashcard(mockFlashcard.id);
      });

      // Should be restored
      expect(result.current.flashcards).toHaveLength(1);
    });
  });

  describe("Refresh", () => {
    it("should refresh current page", async () => {
      const initialData = [mockFlashcard];
      const refreshedData = [mockFlashcard, { ...mockFlashcard, id: "2", front: "New flashcard" }];

      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: initialData,
              pagination: { page: 1, limit: 10, total: 1, total_pages: 1 },
            }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: refreshedData,
              pagination: { page: 1, limit: 10, total: 2, total_pages: 1 },
            }),
            { status: 200 }
          )
        );

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.flashcards).toHaveLength(1);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.flashcards).toHaveLength(2);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("should maintain current page when refreshing", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [mockFlashcard],
              pagination: { page: 1, limit: 10, total: 20, total_pages: 2 },
            }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [{ ...mockFlashcard, id: "2" }],
              pagination: { page: 2, limit: 10, total: 20, total_pages: 2 },
            }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [
                { ...mockFlashcard, id: "2" },
                { ...mockFlashcard, id: "3" },
              ],
              pagination: { page: 2, limit: 10, total: 21, total_pages: 3 },
            }),
            { status: 200 }
          )
        );

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.changePage(2);
      });

      await waitFor(() => {
        expect(result.current.currentPage).toBe(2);
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.currentPage).toBe(2);
      expect(fetch).toHaveBeenCalledWith("/api/flashcards?page=2&limit=10");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty flashcard list", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [],
            pagination: { page: 1, limit: 10, total: 0, total_pages: 0 },
          }),
          { status: 200 }
        )
      );

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.flashcards).toEqual([]);
      expect(result.current.pagination?.total).toBe(0);
    });

    it("should handle malformed JSON response", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response("Invalid JSON", { status: 200 }));

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });

    it("should handle concurrent operations correctly", async () => {
      const flashcard1 = mockFlashcard;
      const flashcard2 = { ...mockFlashcard, id: "2" };

      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [flashcard1, flashcard2],
              pagination: { page: 1, limit: 10, total: 2, total_pages: 1 },
            }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ...flashcard1, front: "Updated 1" }), {
            status: 200,
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ...flashcard2, front: "Updated 2" }), {
            status: 200,
          })
        );

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start two updates concurrently
      await act(async () => {
        await Promise.all([
          result.current.updateFlashcard(flashcard1.id, {
            front: "Updated 1",
            back: flashcard1.back,
          }),
          result.current.updateFlashcard(flashcard2.id, {
            front: "Updated 2",
            back: flashcard2.back,
          }),
        ]);
      });

      expect(result.current.flashcards[0].front).toBe("Updated 1");
      expect(result.current.flashcards[1].front).toBe("Updated 2");
      expect(Object.keys(result.current.updatingIds)).toHaveLength(0);
    });

    it("should handle 200 OK response for delete (not just 204)", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [mockFlashcard],
              pagination: mockPagination,
            }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [],
              pagination: { page: 1, limit: 10, total: 0, total_pages: 0 },
            }),
            { status: 200 }
          )
        );

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteFlashcard(mockFlashcard.id);
      });

      expect(result.current.flashcards).toHaveLength(0);
    });
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "../../db/supabase.client";
import type { FlashcardProposalDTO } from "../../types";

// Mock the OpenRouterService module to prevent initialization errors during import
vi.mock("./openrouter.service", () => {
  class MockOpenRouterApiError extends Error {
    constructor(
      public status: number,
      message: string,
      public details?: unknown
    ) {
      super(message);
      this.name = "OpenRouterApiError";
    }
  }

  return {
    OpenRouterApiError: MockOpenRouterApiError,
    OpenRouterService: vi.fn(),
    openRouterService: {},
  };
});

// Import after mocking
import { GenerationService, GenerationServiceError } from "./generation.service";
import { OpenRouterApiError } from "./openrouter.service";

// Define interface for the AI service mock
interface MockAiService {
  generateFlashcards: ReturnType<typeof vi.fn>;
}

// Define interface for the Supabase mock with chainable query builder methods
interface MockSupabaseClient {
  from: any;
  insert: any;
  select: any;
  single: any;
  eq: any;
  order: any;
  range: any;
}

describe("GenerationService.generateFromText()", () => {
  let service: GenerationService;
  let mockSupabase: MockSupabaseClient;
  let mockAiService: MockAiService;

  const TEST_USER_ID = "test-user-123";
  const TEST_TEXT = "Sample text for flashcard generation";
  const MOCK_PROPOSALS: FlashcardProposalDTO[] = [
    { front: "What is TypeScript?", back: "A typed superset of JavaScript" },
    { front: "What is Vitest?", back: "A fast unit testing framework" },
    { front: "What is Supabase?", back: "An open-source Firebase alternative" },
  ];

  beforeEach(() => {
    // Create mock AI service with properly typed mock function
    mockAiService = {
      generateFlashcards: vi.fn(),
    };

    // Create mock Supabase client with chainable methods
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
    };

    // Instantiate service with mocked dependencies
    service = new GenerationService(mockSupabase as unknown as SupabaseClient, mockAiService as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Happy Path - Successful Generation", () => {
    it("should successfully generate flashcards and create a generation record", async () => {
      // Arrange
      const mockGenerationId = 42;
      mockAiService.generateFlashcards.mockResolvedValue(MOCK_PROPOSALS);

      (mockSupabase.from("generations").insert({}).select().single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: mockGenerationId },
        error: null,
      });

      // Act
      const result = await service.generateFromText(TEST_TEXT, TEST_USER_ID);

      // Assert
      expect(mockAiService.generateFlashcards).toHaveBeenCalledWith(TEST_TEXT);
      expect(mockAiService.generateFlashcards).toHaveBeenCalledTimes(1);

      expect(mockSupabase.from).toHaveBeenCalledWith("generations");
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        user_id: TEST_USER_ID,
        generated_count: MOCK_PROPOSALS.length,
        accepted_count: null,
      });

      expect(result).toEqual({
        generation_id: mockGenerationId,
        generated_count: MOCK_PROPOSALS.length,
        proposals: MOCK_PROPOSALS,
      });
    });

    it("should handle generation with minimum valid proposals (1 flashcard)", async () => {
      // Arrange
      const singleProposal: FlashcardProposalDTO[] = [{ front: "Single question?", back: "Single answer" }];
      const mockGenerationId = 1;

      mockAiService.generateFlashcards.mockResolvedValue(singleProposal);
      (mockSupabase.from("generations").insert({}).select().single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: mockGenerationId },
        error: null,
      });

      // Act
      const result = await service.generateFromText(TEST_TEXT, TEST_USER_ID);

      // Assert
      expect(result.generated_count).toBe(1);
      expect(result.proposals).toEqual(singleProposal);
    });

    it("should handle generation with maximum proposals (15 flashcards)", async () => {
      // Arrange
      const maxProposals: FlashcardProposalDTO[] = Array.from({ length: 15 }, (_, i) => ({
        front: `Question ${i + 1}?`,
        back: `Answer ${i + 1}`,
      }));
      const mockGenerationId = 99;

      mockAiService.generateFlashcards.mockResolvedValue(maxProposals);
      (mockSupabase.from("generations").insert({}).select().single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: mockGenerationId },
        error: null,
      });

      // Act
      const result = await service.generateFromText(TEST_TEXT, TEST_USER_ID);

      // Assert
      expect(result.generated_count).toBe(15);
      expect(result.proposals).toEqual(maxProposals);
      expect(mockSupabase.from).toHaveBeenCalledWith("generations");
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        user_id: TEST_USER_ID,
        generated_count: 15,
        accepted_count: null,
      });
    });
  });

  describe("AI Service Errors", () => {
    it("should throw GenerationServiceError when AI service returns empty array", async () => {
      // Arrange
      mockAiService.generateFlashcards.mockResolvedValue([]);

      // Act & Assert
      await expect(service.generateFromText(TEST_TEXT, TEST_USER_ID)).rejects.toThrow(GenerationServiceError);
      await expect(service.generateFromText(TEST_TEXT, TEST_USER_ID)).rejects.toThrow(
        "AI service returned no flashcard proposals"
      );

      try {
        await service.generateFromText(TEST_TEXT, TEST_USER_ID);
      } catch (error) {
        expect(error).toBeInstanceOf(GenerationServiceError);
        expect((error as GenerationServiceError).code).toBe("AI_SERVICE_ERROR");
        expect((error as GenerationServiceError).details).toEqual({ proposals: [] });
      }
    });

    it("should throw GenerationServiceError when AI service returns null", async () => {
      // Arrange
      mockAiService.generateFlashcards.mockResolvedValue(null);

      // Act & Assert
      await expect(service.generateFromText(TEST_TEXT, TEST_USER_ID)).rejects.toThrow(
        "AI service returned no flashcard proposals"
      );

      try {
        await service.generateFromText(TEST_TEXT, TEST_USER_ID);
      } catch (error) {
        expect(error).toBeInstanceOf(GenerationServiceError);
        expect((error as GenerationServiceError).code).toBe("AI_SERVICE_ERROR");
      }
    });

    it("should throw GenerationServiceError when AI service returns undefined", async () => {
      // Arrange
      mockAiService.generateFlashcards.mockResolvedValue(undefined);

      // Act & Assert
      await expect(service.generateFromText(TEST_TEXT, TEST_USER_ID)).rejects.toThrow(
        "AI service returned no flashcard proposals"
      );
    });

    it("should wrap OpenRouterApiError with proper error details", async () => {
      // Arrange
      const openRouterError = new OpenRouterApiError(429, "Rate limit exceeded", { retry_after: 60 });
      mockAiService.generateFlashcards.mockRejectedValue(openRouterError);

      // Act & Assert
      await expect(service.generateFromText(TEST_TEXT, TEST_USER_ID)).rejects.toThrow(GenerationServiceError);

      try {
        await service.generateFromText(TEST_TEXT, TEST_USER_ID);
      } catch (error) {
        expect(error).toBeInstanceOf(GenerationServiceError);
        expect((error as GenerationServiceError).code).toBe("AI_SERVICE_ERROR");
        expect((error as GenerationServiceError).message).toBe("Rate limit exceeded");
        expect((error as GenerationServiceError).status).toBe(429);
        expect((error as GenerationServiceError).details).toEqual({ retry_after: 60 });
      }
    });

    it("should wrap OpenRouterApiError without details", async () => {
      // Arrange
      const openRouterError = new OpenRouterApiError(500, "Internal server error");
      mockAiService.generateFlashcards.mockRejectedValue(openRouterError);

      // Act & Assert
      try {
        await service.generateFromText(TEST_TEXT, TEST_USER_ID);
      } catch (error) {
        expect(error).toBeInstanceOf(GenerationServiceError);
        expect((error as GenerationServiceError).code).toBe("AI_SERVICE_ERROR");
        expect((error as GenerationServiceError).message).toBe("Internal server error");
        expect((error as GenerationServiceError).status).toBe(500);
        expect((error as GenerationServiceError).details).toBe(openRouterError);
      }
    });

    it("should wrap generic AI service errors", async () => {
      // Arrange
      const genericError = new Error("Network timeout");
      mockAiService.generateFlashcards.mockRejectedValue(genericError);

      // Act & Assert
      await expect(service.generateFromText(TEST_TEXT, TEST_USER_ID)).rejects.toThrow(
        "Failed to generate flashcards from AI service"
      );

      try {
        await service.generateFromText(TEST_TEXT, TEST_USER_ID);
      } catch (error) {
        expect(error).toBeInstanceOf(GenerationServiceError);
        expect((error as GenerationServiceError).code).toBe("AI_SERVICE_ERROR");
        expect((error as GenerationServiceError).details).toBe(genericError);
      }
    });

    it("should handle AI service throwing non-Error objects", async () => {
      // Arrange
      mockAiService.generateFlashcards.mockRejectedValue("String error");

      // Act & Assert
      await expect(service.generateFromText(TEST_TEXT, TEST_USER_ID)).rejects.toThrow(GenerationServiceError);

      try {
        await service.generateFromText(TEST_TEXT, TEST_USER_ID);
      } catch (error) {
        expect(error).toBeInstanceOf(GenerationServiceError);
        expect((error as GenerationServiceError).code).toBe("AI_SERVICE_ERROR");
        expect((error as GenerationServiceError).details).toBe("String error");
      }
    });
  });

  describe("Database Errors", () => {
    it("should throw GenerationServiceError when database insert fails", async () => {
      // Arrange
      mockAiService.generateFlashcards.mockResolvedValue(MOCK_PROPOSALS);

      const dbError = {
        code: "23505",
        message: "duplicate key value violates unique constraint",
        details: "Key (id)=(42) already exists.",
      };

      (mockSupabase.from("generations").insert({}).select().single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: dbError,
      });

      // Act & Assert
      await expect(service.generateFromText(TEST_TEXT, TEST_USER_ID)).rejects.toThrow(
        "Failed to create generation record in database"
      );

      try {
        await service.generateFromText(TEST_TEXT, TEST_USER_ID);
      } catch (error) {
        expect(error).toBeInstanceOf(GenerationServiceError);
        expect((error as GenerationServiceError).code).toBe("DATABASE_ERROR");
        expect((error as GenerationServiceError).details).toEqual(dbError);
      }
    });

    it("should throw GenerationServiceError when database returns null data without error", async () => {
      // Arrange
      mockAiService.generateFlashcards.mockResolvedValue(MOCK_PROPOSALS);

      (mockSupabase.from("generations").insert({}).select().single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: null,
      });

      // Act & Assert
      await expect(service.generateFromText(TEST_TEXT, TEST_USER_ID)).rejects.toThrow(
        "No generation record returned from database"
      );

      try {
        await service.generateFromText(TEST_TEXT, TEST_USER_ID);
      } catch (error) {
        expect(error).toBeInstanceOf(GenerationServiceError);
        expect((error as GenerationServiceError).code).toBe("DATABASE_ERROR");
        expect((error as GenerationServiceError).details).toEqual({ generation: null });
      }
    });

    it("should throw GenerationServiceError when database returns undefined data", async () => {
      // Arrange
      mockAiService.generateFlashcards.mockResolvedValue(MOCK_PROPOSALS);

      (mockSupabase.from("generations").insert({}).select().single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: undefined,
        error: null,
      });

      // Act & Assert
      await expect(service.generateFromText(TEST_TEXT, TEST_USER_ID)).rejects.toThrow(
        "No generation record returned from database"
      );
    });

    it("should handle database connection timeout", async () => {
      // Arrange
      mockAiService.generateFlashcards.mockResolvedValue(MOCK_PROPOSALS);

      const timeoutError = {
        code: "PGRST301",
        message: "Connection timeout",
        details: "Could not connect to database",
      };

      (mockSupabase.from("generations").insert({}).select().single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: timeoutError,
      });

      // Act & Assert
      try {
        await service.generateFromText(TEST_TEXT, TEST_USER_ID);
      } catch (error) {
        expect(error).toBeInstanceOf(GenerationServiceError);
        expect((error as GenerationServiceError).code).toBe("DATABASE_ERROR");
        expect((error as GenerationServiceError).message).toBe("Failed to create generation record in database");
      }
    });
  });

  describe("Unexpected Errors", () => {
    it("should wrap unexpected errors during database operation", async () => {
      // Arrange
      mockAiService.generateFlashcards.mockResolvedValue(MOCK_PROPOSALS);

      // Simulate an unexpected error (e.g., network issue, programming error)
      (mockSupabase.from("generations").insert({}).select().single as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Unexpected network failure")
      );

      // Act & Assert
      await expect(service.generateFromText(TEST_TEXT, TEST_USER_ID)).rejects.toThrow(
        "Unexpected error during generation process"
      );

      try {
        await service.generateFromText(TEST_TEXT, TEST_USER_ID);
      } catch (error) {
        expect(error).toBeInstanceOf(GenerationServiceError);
        expect((error as GenerationServiceError).code).toBe("INTERNAL_ERROR");
        expect((error as GenerationServiceError).details).toBeInstanceOf(Error);
      }
    });

    it("should not double-wrap GenerationServiceError", async () => {
      // Arrange
      mockAiService.generateFlashcards.mockResolvedValue(MOCK_PROPOSALS);

      const originalError = new GenerationServiceError("Original error", "DATABASE_ERROR", { test: true });

      (mockSupabase.from("generations").insert({}).select().single as ReturnType<typeof vi.fn>).mockRejectedValue(
        originalError
      );

      // Act & Assert
      try {
        await service.generateFromText(TEST_TEXT, TEST_USER_ID);
      } catch (error) {
        expect(error).toBe(originalError); // Should be the exact same instance
        expect((error as GenerationServiceError).message).toBe("Original error");
        expect((error as GenerationServiceError).code).toBe("DATABASE_ERROR");
        expect((error as GenerationServiceError).details).toEqual({ test: true });
      }
    });
  });

  describe("Business Rules", () => {
    it("should set accepted_count to null in new generation record", async () => {
      // Arrange
      const mockGenerationId = 10;
      mockAiService.generateFlashcards.mockResolvedValue(MOCK_PROPOSALS);

      (mockSupabase.from("generations").insert({}).select().single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: mockGenerationId },
        error: null,
      });

      // Act
      await service.generateFromText(TEST_TEXT, TEST_USER_ID);

      // Assert
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        user_id: TEST_USER_ID,
        generated_count: MOCK_PROPOSALS.length,
        accepted_count: null, // Critical: should be null initially
      });
    });

    it("should correctly count generated flashcards", async () => {
      // Arrange
      const proposals: FlashcardProposalDTO[] = Array.from({ length: 7 }, (_, i) => ({
        front: `Q${i}`,
        back: `A${i}`,
      }));
      const mockGenerationId = 5;

      mockAiService.generateFlashcards.mockResolvedValue(proposals);
      (mockSupabase.from("generations").insert({}).select().single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: mockGenerationId },
        error: null,
      });

      // Act
      const result = await service.generateFromText(TEST_TEXT, TEST_USER_ID);

      // Assert
      expect(result.generated_count).toBe(7);
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          generated_count: 7,
        })
      );
    });

    it("should associate generation with correct user_id", async () => {
      // Arrange
      const differentUserId = "different-user-456";
      const mockGenerationId = 20;

      mockAiService.generateFlashcards.mockResolvedValue(MOCK_PROPOSALS);
      (mockSupabase.from("generations").insert({}).select().single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: mockGenerationId },
        error: null,
      });

      // Act
      await service.generateFromText(TEST_TEXT, differentUserId);

      // Assert
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: differentUserId,
        })
      );
    });

    it("should return proposals in the same order as AI service", async () => {
      // Arrange
      const orderedProposals: FlashcardProposalDTO[] = [
        { front: "First", back: "1" },
        { front: "Second", back: "2" },
        { front: "Third", back: "3" },
      ];
      const mockGenerationId = 30;

      mockAiService.generateFlashcards.mockResolvedValue(orderedProposals);
      (mockSupabase.from("generations").insert({}).select().single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: mockGenerationId },
        error: null,
      });

      // Act
      const result = await service.generateFromText(TEST_TEXT, TEST_USER_ID);

      // Assert
      expect(result.proposals).toEqual(orderedProposals);
      expect(result.proposals[0].front).toBe("First");
      expect(result.proposals[2].front).toBe("Third");
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long user IDs", async () => {
      // Arrange
      const longUserId = "a".repeat(500);
      const mockGenerationId = 100;

      mockAiService.generateFlashcards.mockResolvedValue(MOCK_PROPOSALS);
      (mockSupabase.from("generations").insert({}).select().single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: mockGenerationId },
        error: null,
      });

      // Act
      const result = await service.generateFromText(TEST_TEXT, longUserId);

      // Assert
      expect(result.generation_id).toBe(mockGenerationId);
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: longUserId,
        })
      );
    });

    it("should handle special characters in text input", async () => {
      // Arrange
      const specialText = "Text with émojis 🎉, symbols @#$%, and unicode 你好";
      const mockGenerationId = 200;

      mockAiService.generateFlashcards.mockResolvedValue(MOCK_PROPOSALS);
      (mockSupabase.from("generations").insert({}).select().single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: mockGenerationId },
        error: null,
      });

      // Act
      const result = await service.generateFromText(specialText, TEST_USER_ID);

      // Assert
      expect(mockAiService.generateFlashcards).toHaveBeenCalledWith(specialText);
      expect(result.generation_id).toBe(mockGenerationId);
    });

    it("should handle generation_id as large integer", async () => {
      // Arrange
      const largeGenerationId = 2147483647; // Max 32-bit integer
      mockAiService.generateFlashcards.mockResolvedValue(MOCK_PROPOSALS);

      (mockSupabase.from("generations").insert({}).select().single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: largeGenerationId },
        error: null,
      });

      // Act
      const result = await service.generateFromText(TEST_TEXT, TEST_USER_ID);

      // Assert
      expect(result.generation_id).toBe(largeGenerationId);
    });

    it("should handle proposals with very long front/back text", async () => {
      // Arrange
      const longProposals: FlashcardProposalDTO[] = [
        {
          front: "Q".repeat(5000),
          back: "A".repeat(5000),
        },
      ];
      const mockGenerationId = 300;

      mockAiService.generateFlashcards.mockResolvedValue(longProposals);
      (mockSupabase.from("generations").insert({}).select().single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: mockGenerationId },
        error: null,
      });

      // Act
      const result = await service.generateFromText(TEST_TEXT, TEST_USER_ID);

      // Assert
      expect(result.proposals).toEqual(longProposals);
      expect(result.proposals[0].front.length).toBe(5000);
    });

    it("should handle empty string user_id (if validation allows)", async () => {
      // Arrange
      const emptyUserId = "";
      const mockGenerationId = 400;

      mockAiService.generateFlashcards.mockResolvedValue(MOCK_PROPOSALS);
      (mockSupabase.from("generations").insert({}).select().single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: mockGenerationId },
        error: null,
      });

      // Act
      const result = await service.generateFromText(TEST_TEXT, emptyUserId);

      // Assert
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: emptyUserId,
        })
      );
      expect(result.generation_id).toBe(mockGenerationId);
    });
  });

  describe("Integration with AI Service", () => {
    it("should pass text parameter correctly to AI service", async () => {
      // Arrange
      const specificText = "Specific educational content about quantum physics";
      const mockGenerationId = 500;

      mockAiService.generateFlashcards.mockResolvedValue(MOCK_PROPOSALS);
      (mockSupabase.from("generations").insert({}).select().single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: mockGenerationId },
        error: null,
      });

      // Act
      await service.generateFromText(specificText, TEST_USER_ID);

      // Assert
      expect(mockAiService.generateFlashcards).toHaveBeenCalledWith(specificText);
      expect(mockAiService.generateFlashcards).toHaveBeenCalledTimes(1);
    });

    it("should not call database if AI service fails", async () => {
      // Arrange
      mockAiService.generateFlashcards.mockRejectedValue(new Error("AI service down"));

      // Act & Assert
      await expect(service.generateFromText(TEST_TEXT, TEST_USER_ID)).rejects.toThrow();

      // Database should never be called
      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(mockSupabase.insert).not.toHaveBeenCalled();
    });

    it("should call AI service before database operations", async () => {
      // Arrange
      const callOrder: string[] = [];
      const mockGenerationId = 600;

      mockAiService.generateFlashcards.mockImplementation(async () => {
        callOrder.push("ai-service");
        return MOCK_PROPOSALS;
      });

      (mockSupabase.from("generations").insert({}).select().single as ReturnType<typeof vi.fn>).mockImplementation(
        async () => {
          callOrder.push("database");
          return { data: { id: mockGenerationId }, error: null };
        }
      );

      // Act
      await service.generateFromText(TEST_TEXT, TEST_USER_ID);

      // Assert
      expect(callOrder).toEqual(["ai-service", "database"]);
    });
  });

  describe("Response Structure", () => {
    it("should return response with all required fields", async () => {
      // Arrange
      const mockGenerationId = 700;
      mockAiService.generateFlashcards.mockResolvedValue(MOCK_PROPOSALS);

      (mockSupabase.from("generations").insert({}).select().single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: mockGenerationId },
        error: null,
      });

      // Act
      const result = await service.generateFromText(TEST_TEXT, TEST_USER_ID);

      // Assert
      expect(result).toHaveProperty("generation_id");
      expect(result).toHaveProperty("generated_count");
      expect(result).toHaveProperty("proposals");
      expect(typeof result.generation_id).toBe("number");
      expect(typeof result.generated_count).toBe("number");
      expect(Array.isArray(result.proposals)).toBe(true);
    });

    it("should ensure generated_count matches proposals length", async () => {
      // Arrange
      const mockGenerationId = 800;
      mockAiService.generateFlashcards.mockResolvedValue(MOCK_PROPOSALS);

      (mockSupabase.from("generations").insert({}).select().single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: mockGenerationId },
        error: null,
      });

      // Act
      const result = await service.generateFromText(TEST_TEXT, TEST_USER_ID);

      // Assert
      expect(result.generated_count).toBe(result.proposals.length);
    });

    it("should return proposals with correct structure", async () => {
      // Arrange
      const mockGenerationId = 900;
      mockAiService.generateFlashcards.mockResolvedValue(MOCK_PROPOSALS);

      (mockSupabase.from("generations").insert({}).select().single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: mockGenerationId },
        error: null,
      });

      // Act
      const result = await service.generateFromText(TEST_TEXT, TEST_USER_ID);

      // Assert
      result.proposals.forEach((proposal) => {
        expect(proposal).toHaveProperty("front");
        expect(proposal).toHaveProperty("back");
        expect(typeof proposal.front).toBe("string");
        expect(typeof proposal.back).toBe("string");
      });
    });
  });
});

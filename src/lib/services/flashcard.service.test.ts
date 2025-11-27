import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlashcardService } from "./flashcard.service";
import type { Flashcard } from "../../types";
import type { SupabaseClient } from "../../db/supabase.client";

describe("FlashcardService.reviewFlashcard()", () => {
  let service: FlashcardService;
  let mockSupabase: SupabaseClient;
  let baseFlashcard: Flashcard;

  beforeEach(() => {
    // Mock Supabase client (not needed for reviewFlashcard but required for service instantiation)
    mockSupabase = {} as SupabaseClient;
    service = new FlashcardService(mockSupabase);

    // Base flashcard with default SM-2 parameters
    baseFlashcard = {
      id: "test-flashcard-id",
      user_id: "test-user-id",
      front: "Test Question",
      back: "Test Answer",
      generation_type: "manual",
      generation_id: null,
      interval: 0,
      repetition: 0,
      ease_factor: 2.5,
      due_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Flashcard;

    // Mock Date to ensure consistent due_date calculations
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Ease Factor Calculation", () => {
    it("should decrease ease factor for quality 0 (complete blackout)", () => {
      const result = service.reviewFlashcard(baseFlashcard, 0);

      // Formula: EF' = 2.5 + (0.1 - (5 - 0) * (0.08 + (5 - 0) * 0.02))
      // EF' = 2.5 + (0.1 - 5 * (0.08 + 5 * 0.02))
      // EF' = 2.5 + (0.1 - 5 * 0.18) = 2.5 + (0.1 - 0.9) = 2.5 - 0.8 = 1.7
      expect(result.ease_factor).toBeCloseTo(1.7, 10);
    });

    it("should decrease ease factor for quality 1 (incorrect but familiar)", () => {
      const result = service.reviewFlashcard(baseFlashcard, 1);

      // Formula: EF' = 2.5 + (0.1 - (5 - 1) * (0.08 + (5 - 1) * 0.02))
      // EF' = 2.5 + (0.1 - 4 * (0.08 + 4 * 0.02))
      // EF' = 2.5 + (0.1 - 4 * 0.16) = 2.5 + (0.1 - 0.64) = 2.5 - 0.54 = 1.96
      expect(result.ease_factor).toBe(1.96);
    });

    it("should slightly decrease ease factor for quality 2 (incorrect but easy to recall)", () => {
      const result = service.reviewFlashcard(baseFlashcard, 2);

      // Formula: EF' = 2.5 + (0.1 - (5 - 2) * (0.08 + (5 - 2) * 0.02))
      // EF' = 2.5 + (0.1 - 3 * (0.08 + 3 * 0.02))
      // EF' = 2.5 + (0.1 - 3 * 0.14) = 2.5 + (0.1 - 0.42) = 2.5 - 0.32 = 2.18
      expect(result.ease_factor).toBeCloseTo(2.18, 10);
    });

    it("should slightly increase ease factor for quality 3 (correct with effort)", () => {
      const result = service.reviewFlashcard(baseFlashcard, 3);

      // Formula: EF' = 2.5 + (0.1 - (5 - 3) * (0.08 + (5 - 3) * 0.02))
      // EF' = 2.5 + (0.1 - 2 * (0.08 + 2 * 0.02))
      // EF' = 2.5 + (0.1 - 2 * 0.12) = 2.5 + (0.1 - 0.24) = 2.5 - 0.14 = 2.36
      expect(result.ease_factor).toBe(2.36);
    });

    it("should increase ease factor for quality 4 (correct with hesitation)", () => {
      const result = service.reviewFlashcard(baseFlashcard, 4);

      // Formula: EF' = 2.5 + (0.1 - (5 - 4) * (0.08 + (5 - 4) * 0.02))
      // EF' = 2.5 + (0.1 - 1 * (0.08 + 1 * 0.02))
      // EF' = 2.5 + (0.1 - 1 * 0.10) = 2.5 + (0.1 - 0.10) = 2.5
      expect(result.ease_factor).toBe(2.5);
    });

    it("should increase ease factor for quality 5 (perfect response)", () => {
      const result = service.reviewFlashcard(baseFlashcard, 5);

      // Formula: EF' = 2.5 + (0.1 - (5 - 5) * (0.08 + (5 - 5) * 0.02))
      // EF' = 2.5 + (0.1 - 0 * (0.08 + 0 * 0.02))
      // EF' = 2.5 + (0.1 - 0) = 2.5 + 0.1 = 2.6
      expect(result.ease_factor).toBe(2.6);
    });

    it("should enforce minimum ease factor of 1.3", () => {
      const flashcardWithLowEF: Flashcard = {
        ...baseFlashcard,
        ease_factor: 1.4,
      };

      const result = service.reviewFlashcard(flashcardWithLowEF, 0);

      // Formula would give: 1.4 + (0.1 - 5 * 0.18) = 1.4 - 0.8 = 0.6
      // But minimum is 1.3
      expect(result.ease_factor).toBe(1.3);
    });

    it("should not cap ease factor at maximum (can grow indefinitely)", () => {
      const flashcardWithHighEF: Flashcard = {
        ...baseFlashcard,
        ease_factor: 3.5,
      };

      const result = service.reviewFlashcard(flashcardWithHighEF, 5);

      // Formula: 3.5 + 0.1 = 3.6
      expect(result.ease_factor).toBe(3.6);
    });
  });

  describe("Failed Recall (Quality < 3)", () => {
    it("should reset repetition to 0 for quality 0", () => {
      const flashcardWithProgress: Flashcard = {
        ...baseFlashcard,
        repetition: 5,
        interval: 30,
      };

      const result = service.reviewFlashcard(flashcardWithProgress, 0);

      expect(result.repetition).toBe(0);
    });

    it("should reset repetition to 0 for quality 1", () => {
      const flashcardWithProgress: Flashcard = {
        ...baseFlashcard,
        repetition: 3,
        interval: 15,
      };

      const result = service.reviewFlashcard(flashcardWithProgress, 1);

      expect(result.repetition).toBe(0);
    });

    it("should reset repetition to 0 for quality 2", () => {
      const flashcardWithProgress: Flashcard = {
        ...baseFlashcard,
        repetition: 10,
        interval: 100,
      };

      const result = service.reviewFlashcard(flashcardWithProgress, 2);

      expect(result.repetition).toBe(0);
    });

    it("should set interval to 1 day for quality 0", () => {
      const result = service.reviewFlashcard(baseFlashcard, 0);

      expect(result.interval).toBe(1);
    });

    it("should set interval to 1 day for quality 1", () => {
      const result = service.reviewFlashcard(baseFlashcard, 1);

      expect(result.interval).toBe(1);
    });

    it("should set interval to 1 day for quality 2", () => {
      const result = service.reviewFlashcard(baseFlashcard, 2);

      expect(result.interval).toBe(1);
    });

    it("should set due date to tomorrow for failed recall", () => {
      const result = service.reviewFlashcard(baseFlashcard, 1);

      const expectedDueDate = new Date("2025-01-02T00:00:00.000Z");
      expect(result.due_date).toBe(expectedDueDate.toISOString());
    });

    it("should reset interval to 1 even if previous interval was high", () => {
      const flashcardWithHighInterval: Flashcard = {
        ...baseFlashcard,
        repetition: 8,
        interval: 200,
      };

      const result = service.reviewFlashcard(flashcardWithHighInterval, 2);

      expect(result.interval).toBe(1);
      expect(result.repetition).toBe(0);
    });
  });

  describe("Successful Recall (Quality >= 3) - First Review", () => {
    it("should set repetition to 1 for first successful review (quality 3)", () => {
      const result = service.reviewFlashcard(baseFlashcard, 3);

      expect(result.repetition).toBe(1);
    });

    it("should set repetition to 1 for first successful review (quality 4)", () => {
      const result = service.reviewFlashcard(baseFlashcard, 4);

      expect(result.repetition).toBe(1);
    });

    it("should set repetition to 1 for first successful review (quality 5)", () => {
      const result = service.reviewFlashcard(baseFlashcard, 5);

      expect(result.repetition).toBe(1);
    });

    it("should set interval to 1 day for first successful review", () => {
      const result = service.reviewFlashcard(baseFlashcard, 3);

      expect(result.interval).toBe(1);
    });

    it("should set due date to tomorrow for first successful review", () => {
      const result = service.reviewFlashcard(baseFlashcard, 5);

      const expectedDueDate = new Date("2025-01-02T00:00:00.000Z");
      expect(result.due_date).toBe(expectedDueDate.toISOString());
    });
  });

  describe("Successful Recall (Quality >= 3) - Second Review", () => {
    it("should set repetition to 2 for second successful review", () => {
      const flashcardAfterFirstReview: Flashcard = {
        ...baseFlashcard,
        repetition: 1,
        interval: 1,
      };

      const result = service.reviewFlashcard(flashcardAfterFirstReview, 3);

      expect(result.repetition).toBe(2);
    });

    it("should set interval to 6 days for second successful review", () => {
      const flashcardAfterFirstReview: Flashcard = {
        ...baseFlashcard,
        repetition: 1,
        interval: 1,
      };

      const result = service.reviewFlashcard(flashcardAfterFirstReview, 4);

      expect(result.interval).toBe(6);
    });

    it("should set due date to 6 days from now for second successful review", () => {
      const flashcardAfterFirstReview: Flashcard = {
        ...baseFlashcard,
        repetition: 1,
        interval: 1,
      };

      const result = service.reviewFlashcard(flashcardAfterFirstReview, 5);

      const expectedDueDate = new Date("2025-01-07T00:00:00.000Z");
      expect(result.due_date).toBe(expectedDueDate.toISOString());
    });
  });

  describe("Successful Recall (Quality >= 3) - Subsequent Reviews", () => {
    it("should multiply interval by ease factor for third review", () => {
      const flashcardAfterSecondReview: Flashcard = {
        ...baseFlashcard,
        repetition: 2,
        interval: 6,
        ease_factor: 2.5,
      };

      const result = service.reviewFlashcard(flashcardAfterSecondReview, 4);

      // 6 * 2.5 = 15
      expect(result.interval).toBe(15);
      expect(result.repetition).toBe(3);
    });

    it("should round interval to nearest integer", () => {
      const flashcardAfterSecondReview: Flashcard = {
        ...baseFlashcard,
        repetition: 2,
        interval: 6,
        ease_factor: 2.3,
      };

      const result = service.reviewFlashcard(flashcardAfterSecondReview, 4);

      // 6 * 2.3 = 13.8, rounds to 14
      expect(result.interval).toBe(14);
    });

    it("should handle multiple subsequent reviews with increasing intervals", () => {
      // Third review
      let flashcard: Flashcard = {
        ...baseFlashcard,
        repetition: 2,
        interval: 6,
        ease_factor: 2.5,
      };

      let result = service.reviewFlashcard(flashcard, 4);
      expect(result.repetition).toBe(3);
      expect(result.interval).toBe(15); // 6 * 2.5 = 15

      // Fourth review
      flashcard = {
        ...baseFlashcard,
        repetition: 3,
        interval: 15,
        ease_factor: 2.5,
      };

      result = service.reviewFlashcard(flashcard, 4);
      expect(result.repetition).toBe(4);
      expect(result.interval).toBe(38); // 15 * 2.5 = 37.5, rounds to 38

      // Fifth review
      flashcard = {
        ...baseFlashcard,
        repetition: 4,
        interval: 38,
        ease_factor: 2.5,
      };

      result = service.reviewFlashcard(flashcard, 4);
      expect(result.repetition).toBe(5);
      expect(result.interval).toBe(95); // 38 * 2.5 = 95
    });

    it("should use updated ease factor for interval calculation", () => {
      const flashcardAfterSecondReview: Flashcard = {
        ...baseFlashcard,
        repetition: 2,
        interval: 6,
        ease_factor: 2.5,
      };

      const result = service.reviewFlashcard(flashcardAfterSecondReview, 5);

      // Ease factor becomes: 2.5 + 0.1 = 2.6
      // Interval: 6 * 2.6 = 15.6, rounds to 16
      expect(result.ease_factor).toBe(2.6);
      expect(result.interval).toBe(16);
    });

    it("should calculate correct due date for subsequent reviews", () => {
      const flashcardAfterSecondReview: Flashcard = {
        ...baseFlashcard,
        repetition: 2,
        interval: 6,
        ease_factor: 2.5,
      };

      const result = service.reviewFlashcard(flashcardAfterSecondReview, 4);

      // Interval is 15 days
      const expectedDueDate = new Date("2025-01-16T00:00:00.000Z");
      expect(result.due_date).toBe(expectedDueDate.toISOString());
    });
  });

  describe("Edge Cases - Ease Factor Boundaries", () => {
    it("should handle ease factor at minimum (1.3) with successful recall", () => {
      const flashcardWithMinEF: Flashcard = {
        ...baseFlashcard,
        repetition: 2,
        interval: 6,
        ease_factor: 1.3,
      };

      const result = service.reviewFlashcard(flashcardWithMinEF, 3);

      // EF: 1.3 + (0.1 - 2 * 0.12) = 1.3 - 0.14 = 1.16, clamped to 1.3
      expect(result.ease_factor).toBe(1.3);
      // Interval: 6 * 1.3 = 7.8, rounds to 8
      expect(result.interval).toBe(8);
      expect(result.repetition).toBe(3);
    });

    it("should handle very high ease factor", () => {
      const flashcardWithHighEF: Flashcard = {
        ...baseFlashcard,
        repetition: 10,
        interval: 500,
        ease_factor: 4.0,
      };

      const result = service.reviewFlashcard(flashcardWithHighEF, 5);

      // EF: 4.0 + 0.1 = 4.1
      expect(result.ease_factor).toBe(4.1);
      // Interval: 500 * 4.1 = 2050
      expect(result.interval).toBe(2050);
      expect(result.repetition).toBe(11);
    });
  });

  describe("Edge Cases - Repetition and Interval Boundaries", () => {
    it("should handle very high repetition count", () => {
      const flashcardWithHighRep: Flashcard = {
        ...baseFlashcard,
        repetition: 100,
        interval: 10000,
        ease_factor: 2.5,
      };

      const result = service.reviewFlashcard(flashcardWithHighRep, 4);

      expect(result.repetition).toBe(101);
      // Interval: 10000 * 2.5 = 25000
      expect(result.interval).toBe(25000);
    });

    it("should handle zero interval with successful recall", () => {
      const flashcardWithZeroInterval: Flashcard = {
        ...baseFlashcard,
        repetition: 0,
        interval: 0,
        ease_factor: 2.5,
      };

      const result = service.reviewFlashcard(flashcardWithZeroInterval, 4);

      // First successful review: interval = 1
      expect(result.interval).toBe(1);
      expect(result.repetition).toBe(1);
    });

    it("should reset high repetition count on failed recall", () => {
      const flashcardWithHighRep: Flashcard = {
        ...baseFlashcard,
        repetition: 50,
        interval: 5000,
        ease_factor: 3.0,
      };

      const result = service.reviewFlashcard(flashcardWithHighRep, 1);

      expect(result.repetition).toBe(0);
      expect(result.interval).toBe(1);
    });
  });

  describe("Edge Cases - Quality Transitions", () => {
    it("should handle transition from failed to successful recall", () => {
      // First, fail the card
      let flashcard: Flashcard = {
        ...baseFlashcard,
        repetition: 5,
        interval: 50,
        ease_factor: 2.5,
      };

      let result = service.reviewFlashcard(flashcard, 2);
      expect(result.repetition).toBe(0);
      expect(result.interval).toBe(1);

      // Then succeed
      flashcard = {
        ...baseFlashcard,
        repetition: 0,
        interval: 1,
        ease_factor: result.ease_factor,
      };

      result = service.reviewFlashcard(flashcard, 4);
      expect(result.repetition).toBe(1);
      expect(result.interval).toBe(1);
    });

    it("should handle alternating quality ratings", () => {
      // Quality 5
      let flashcard: Flashcard = { ...baseFlashcard };
      let result = service.reviewFlashcard(flashcard, 5);
      expect(result.repetition).toBe(1);
      expect(result.ease_factor).toBe(2.6);

      // Quality 0
      flashcard = {
        ...baseFlashcard,
        repetition: result.repetition,
        interval: result.interval,
        ease_factor: result.ease_factor,
      };
      result = service.reviewFlashcard(flashcard, 0);
      expect(result.repetition).toBe(0);
      expect(result.interval).toBe(1);

      // Quality 5 again
      flashcard = {
        ...baseFlashcard,
        repetition: result.repetition,
        interval: result.interval,
        ease_factor: result.ease_factor,
      };
      result = service.reviewFlashcard(flashcard, 5);
      expect(result.repetition).toBe(1);
      expect(result.interval).toBe(1);
    });
  });

  describe("Due Date Calculation", () => {
    it("should calculate due date correctly for interval of 1 day", () => {
      const result = service.reviewFlashcard(baseFlashcard, 3);

      const expectedDueDate = new Date("2025-01-02T00:00:00.000Z");
      expect(result.due_date).toBe(expectedDueDate.toISOString());
    });

    it("should calculate due date correctly for interval of 6 days", () => {
      const flashcard: Flashcard = {
        ...baseFlashcard,
        repetition: 1,
        interval: 1,
      };

      const result = service.reviewFlashcard(flashcard, 4);

      const expectedDueDate = new Date("2025-01-07T00:00:00.000Z");
      expect(result.due_date).toBe(expectedDueDate.toISOString());
    });

    it("should calculate due date correctly for large intervals", () => {
      const flashcard: Flashcard = {
        ...baseFlashcard,
        repetition: 10,
        interval: 100,
        ease_factor: 2.5,
      };

      const result = service.reviewFlashcard(flashcard, 4);

      // Interval: 100 * 2.5 = 250 days
      const expectedDueDate = new Date("2025-01-01T00:00:00.000Z");
      expectedDueDate.setDate(expectedDueDate.getDate() + 250);
      expect(result.due_date).toBe(expectedDueDate.toISOString());
    });

    it("should handle due date calculation across month boundaries", () => {
      vi.setSystemTime(new Date("2025-01-30T00:00:00.000Z"));

      const flashcard: Flashcard = {
        ...baseFlashcard,
        repetition: 1,
        interval: 1,
      };

      const result = service.reviewFlashcard(flashcard, 4);

      // 6 days from Jan 30 = Feb 5
      const expectedDueDate = new Date("2025-02-05T00:00:00.000Z");
      expect(result.due_date).toBe(expectedDueDate.toISOString());
    });

    it("should handle due date calculation across year boundaries", () => {
      vi.setSystemTime(new Date("2025-12-28T00:00:00.000Z"));

      const flashcard: Flashcard = {
        ...baseFlashcard,
        repetition: 2,
        interval: 6,
        ease_factor: 2.5,
      };

      const result = service.reviewFlashcard(flashcard, 4);

      // Interval: 6 * 2.5 = 15 days from Dec 28 = Jan 12, 2026
      const expectedDueDate = new Date("2026-01-12T00:00:00.000Z");
      expect(result.due_date).toBe(expectedDueDate.toISOString());
    });

    it("should handle leap year calculations", () => {
      vi.setSystemTime(new Date("2024-02-28T00:00:00.000Z"));

      const flashcard: Flashcard = {
        ...baseFlashcard,
        repetition: 1,
        interval: 1,
      };

      const result = service.reviewFlashcard(flashcard, 4);

      // 6 days from Feb 28 in leap year = Mar 5
      const expectedDueDate = new Date("2024-03-05T00:00:00.000Z");
      expect(result.due_date).toBe(expectedDueDate.toISOString());
    });
  });

  describe("Return Value Structure", () => {
    it("should return all required SM-2 parameters", () => {
      const result = service.reviewFlashcard(baseFlashcard, 4);

      expect(result).toHaveProperty("interval");
      expect(result).toHaveProperty("repetition");
      expect(result).toHaveProperty("ease_factor");
      expect(result).toHaveProperty("due_date");
    });

    it("should return only SM-2 parameters (no other flashcard fields)", () => {
      const result = service.reviewFlashcard(baseFlashcard, 4);

      expect(Object.keys(result)).toEqual(["interval", "repetition", "ease_factor", "due_date"]);
    });

    it("should return numeric values for interval, repetition, and ease_factor", () => {
      const result = service.reviewFlashcard(baseFlashcard, 4);

      expect(typeof result.interval).toBe("number");
      expect(typeof result.repetition).toBe("number");
      expect(typeof result.ease_factor).toBe("number");
    });

    it("should return ISO 8601 string for due_date", () => {
      const result = service.reviewFlashcard(baseFlashcard, 4);

      expect(typeof result.due_date).toBe("string");
      expect(result.due_date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe("Business Rule Verification", () => {
    it("should implement SM-2 algorithm correctly for typical learning progression", () => {
      // Simulate a typical learning progression
      let flashcard: Flashcard = { ...baseFlashcard };

      // First review: quality 4
      let result = service.reviewFlashcard(flashcard, 4);
      expect(result.repetition).toBe(1);
      expect(result.interval).toBe(1);
      expect(result.ease_factor).toBe(2.5);

      // Second review: quality 4
      flashcard = {
        ...flashcard,
        repetition: result.repetition,
        interval: result.interval,
        ease_factor: result.ease_factor,
      };
      result = service.reviewFlashcard(flashcard, 4);
      expect(result.repetition).toBe(2);
      expect(result.interval).toBe(6);
      expect(result.ease_factor).toBe(2.5);

      // Third review: quality 5
      flashcard = {
        ...flashcard,
        repetition: result.repetition,
        interval: result.interval,
        ease_factor: result.ease_factor,
      };
      result = service.reviewFlashcard(flashcard, 5);
      expect(result.repetition).toBe(3);
      expect(result.interval).toBe(16); // 6 * 2.6 = 15.6, rounds to 16
      expect(result.ease_factor).toBe(2.6);

      // Fourth review: quality 3 (struggled)
      flashcard = {
        ...flashcard,
        repetition: result.repetition,
        interval: result.interval,
        ease_factor: result.ease_factor,
      };
      result = service.reviewFlashcard(flashcard, 3);
      expect(result.repetition).toBe(4);
      // EF' = 2.6 + (0.1 - 2 * (0.08 + 2 * 0.02)) = 2.6 - 0.14 = 2.46
      // Interval = 16 * 2.46 = 39.36, rounds to 39
      expect(result.interval).toBe(39);
      expect(result.ease_factor).toBeCloseTo(2.46, 10);
    });

    it("should penalize cards that are consistently difficult", () => {
      let flashcard: Flashcard = { ...baseFlashcard };

      // Multiple quality 3 reviews
      for (let i = 0; i < 5; i++) {
        const result = service.reviewFlashcard(flashcard, 3);
        flashcard = {
          ...flashcard,
          repetition: result.repetition,
          interval: result.interval,
          ease_factor: result.ease_factor,
        };
      }

      // Ease factor should have decreased significantly
      expect(flashcard.ease_factor).toBeLessThan(2.0);
    });

    it("should reward cards that are consistently easy", () => {
      let flashcard: Flashcard = { ...baseFlashcard };

      // Multiple quality 5 reviews
      for (let i = 0; i < 5; i++) {
        const result = service.reviewFlashcard(flashcard, 5);
        flashcard = {
          ...flashcard,
          repetition: result.repetition,
          interval: result.interval,
          ease_factor: result.ease_factor,
        };
      }

      // Ease factor should have increased
      expect(flashcard.ease_factor).toBeGreaterThan(2.5);
      // Intervals should grow rapidly
      expect(flashcard.interval).toBeGreaterThan(50);
    });
  });
});

// Define interface for the Supabase mock with chainable query builder methods
interface MockSupabaseBatchClient {
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
}

describe("FlashcardService.createFlashcardsBatch()", () => {
  let service: FlashcardService;
  let mockSupabase: MockSupabaseBatchClient;
  const TEST_USER_ID = "test-user-123";
  const TEST_OTHER_USER_ID = "other-user-456";
  const MOCK_NOW = "2025-01-01T00:00:00.000Z";

  beforeEach(() => {
    // Create mock Supabase client with chainable methods
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };

    service = new FlashcardService(mockSupabase as unknown as SupabaseClient);

    // Mock Date to ensure consistent timestamps
    vi.useFakeTimers();
    vi.setSystemTime(new Date(MOCK_NOW));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Happy Path - Manual Flashcards Only", () => {
    it("should create a single manual flashcard successfully", async () => {
      // Arrange
      const command = {
        flashcards: [
          {
            front: "What is TypeScript?",
            back: "A typed superset of JavaScript",
            generation_type: "manual" as const,
            generation_id: null,
          },
        ],
      };

      const mockCreatedFlashcard = {
        id: "flashcard-1",
        user_id: TEST_USER_ID,
        front: command.flashcards[0].front,
        back: command.flashcards[0].back,
        generation_type: "manual",
        generation_id: null,
        interval: 0,
        repetition: 0,
        ease_factor: 2.5,
        due_date: MOCK_NOW,
        created_at: MOCK_NOW,
        updated_at: MOCK_NOW,
      };

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: [mockCreatedFlashcard],
        error: null,
      });

      // Act
      const result = await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith("flashcards");
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        {
          user_id: TEST_USER_ID,
          front: command.flashcards[0].front,
          back: command.flashcards[0].back,
          generation_type: "manual",
          generation_id: null,
          interval: 0,
          repetition: 0,
          ease_factor: 2.5,
          due_date: MOCK_NOW,
        },
      ]);
      expect(result).toEqual([mockCreatedFlashcard]);
    });

    it("should create multiple manual flashcards successfully", async () => {
      // Arrange
      const command = {
        flashcards: [
          {
            front: "Question 1?",
            back: "Answer 1",
            generation_type: "manual" as const,
            generation_id: null,
          },
          {
            front: "Question 2?",
            back: "Answer 2",
            generation_type: "manual" as const,
            generation_id: null,
          },
          {
            front: "Question 3?",
            back: "Answer 3",
            generation_type: "manual" as const,
            generation_id: null,
          },
        ],
      };

      const mockCreatedFlashcards = command.flashcards.map((fc, index) => ({
        id: `flashcard-${index + 1}`,
        user_id: TEST_USER_ID,
        front: fc.front,
        back: fc.back,
        generation_type: "manual",
        generation_id: null,
        interval: 0,
        repetition: 0,
        ease_factor: 2.5,
        due_date: MOCK_NOW,
        created_at: MOCK_NOW,
        updated_at: MOCK_NOW,
      }));

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: mockCreatedFlashcards,
        error: null,
      });

      // Act
      const result = await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert
      expect(result).toHaveLength(3);
      expect(result).toEqual(mockCreatedFlashcards);
    });

    it("should not query generations table when all flashcards are manual", async () => {
      // Arrange
      const command = {
        flashcards: [
          {
            front: "Manual card",
            back: "Manual answer",
            generation_type: "manual" as const,
            generation_id: null,
          },
        ],
      };

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: [
          {
            id: "flashcard-1",
            user_id: TEST_USER_ID,
            ...command.flashcards[0],
            interval: 0,
            repetition: 0,
            ease_factor: 2.5,
            due_date: MOCK_NOW,
            created_at: MOCK_NOW,
            updated_at: MOCK_NOW,
          },
        ],
        error: null,
      });

      // Act
      await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert - verify generations table was never queried
      const fromCalls = mockSupabase.from.mock.calls as [string][];
      expect(fromCalls.every((call) => call[0] === "flashcards")).toBe(true);
    });
  });

  describe("Happy Path - AI Flashcards with Single Generation", () => {
    it("should create AI flashcards and update generation accepted_count", async () => {
      // Arrange
      const GENERATION_ID = 42;
      const command = {
        flashcards: [
          {
            front: "AI Question 1?",
            back: "AI Answer 1",
            generation_type: "ai" as const,
            generation_id: GENERATION_ID,
          },
          {
            front: "AI Question 2?",
            back: "AI Answer 2",
            generation_type: "ai" as const,
            generation_id: GENERATION_ID,
          },
        ],
      };

      // Mock generation verification
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "generations") {
          return {
            ...mockSupabase,
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{ id: GENERATION_ID, user_id: TEST_USER_ID }],
              error: null,
            }),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { accepted_count: 0 },
              error: null,
            }),
            update: vi.fn().mockReturnThis(),
          };
        }
        return mockSupabase;
      });

      // Mock flashcard creation
      const mockCreatedFlashcards = command.flashcards.map((fc, index) => ({
        id: `flashcard-${index + 1}`,
        user_id: TEST_USER_ID,
        front: fc.front,
        back: fc.back,
        generation_type: "ai",
        generation_id: GENERATION_ID,
        interval: 0,
        repetition: 0,
        ease_factor: 2.5,
        due_date: MOCK_NOW,
        created_at: MOCK_NOW,
        updated_at: MOCK_NOW,
      }));

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: mockCreatedFlashcards,
        error: null,
      });

      // Act
      const result = await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert
      expect(result).toEqual(mockCreatedFlashcards);
      expect(mockSupabase.from).toHaveBeenCalledWith("generations");
      expect(mockSupabase.from).toHaveBeenCalledWith("flashcards");
    });

    it("should correctly increment accepted_count from existing value", async () => {
      // Arrange
      const GENERATION_ID = 10;
      const EXISTING_ACCEPTED_COUNT = 5;
      const command = {
        flashcards: [
          {
            front: "New AI card",
            back: "New AI answer",
            generation_type: "ai" as const,
            generation_id: GENERATION_ID,
          },
        ],
      };

      let updateCallCount = 0;

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "generations") {
          return {
            ...mockSupabase,
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{ id: GENERATION_ID, user_id: TEST_USER_ID }],
              error: null,
            }),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { accepted_count: EXISTING_ACCEPTED_COUNT },
              error: null,
            }),
            update: vi.fn((data: { accepted_count: number }) => {
              updateCallCount++;
              expect(data.accepted_count).toBe(EXISTING_ACCEPTED_COUNT + 1);
              return {
                ...mockSupabase,
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        return mockSupabase;
      });

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: [
          {
            id: "flashcard-1",
            user_id: TEST_USER_ID,
            ...command.flashcards[0],
            interval: 0,
            repetition: 0,
            ease_factor: 2.5,
            due_date: MOCK_NOW,
            created_at: MOCK_NOW,
            updated_at: MOCK_NOW,
          },
        ],
        error: null,
      });

      // Act
      await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert
      expect(updateCallCount).toBe(1);
    });

    it("should handle null accepted_count (treat as 0)", async () => {
      // Arrange
      const GENERATION_ID = 15;
      const command = {
        flashcards: [
          {
            front: "First accepted card",
            back: "First accepted answer",
            generation_type: "ai" as const,
            generation_id: GENERATION_ID,
          },
        ],
      };

      let capturedUpdateValue: number | null = null;

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "generations") {
          return {
            ...mockSupabase,
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{ id: GENERATION_ID, user_id: TEST_USER_ID }],
              error: null,
            }),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { accepted_count: null },
              error: null,
            }),
            update: vi.fn((data: { accepted_count: number }) => {
              capturedUpdateValue = data.accepted_count;
              return {
                ...mockSupabase,
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        return mockSupabase;
      });

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: [
          {
            id: "flashcard-1",
            user_id: TEST_USER_ID,
            ...command.flashcards[0],
            interval: 0,
            repetition: 0,
            ease_factor: 2.5,
            due_date: MOCK_NOW,
            created_at: MOCK_NOW,
            updated_at: MOCK_NOW,
          },
        ],
        error: null,
      });

      // Act
      await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert
      expect(capturedUpdateValue).toBe(1); // 0 + 1
    });
  });

  describe("Happy Path - AI Flashcards with Multiple Generations", () => {
    it("should handle flashcards from different generations", async () => {
      // Arrange
      const GENERATION_ID_1 = 10;
      const GENERATION_ID_2 = 20;
      const command = {
        flashcards: [
          {
            front: "Gen 1 Card 1",
            back: "Gen 1 Answer 1",
            generation_type: "ai" as const,
            generation_id: GENERATION_ID_1,
          },
          {
            front: "Gen 1 Card 2",
            back: "Gen 1 Answer 2",
            generation_type: "ai" as const,
            generation_id: GENERATION_ID_1,
          },
          {
            front: "Gen 2 Card 1",
            back: "Gen 2 Answer 1",
            generation_type: "ai" as const,
            generation_id: GENERATION_ID_2,
          },
        ],
      };

      const generationUpdates = new Map<number, number>();

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "generations") {
          return {
            ...mockSupabase,
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [
                { id: GENERATION_ID_1, user_id: TEST_USER_ID },
                { id: GENERATION_ID_2, user_id: TEST_USER_ID },
              ],
              error: null,
            }),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { accepted_count: 0 },
              error: null,
            }),
            update: vi.fn((data: { accepted_count: number }) => {
              // Track which generation was updated
              return {
                ...mockSupabase,
                eq: vi.fn((field: string, value: number) => {
                  if (field === "id") {
                    generationUpdates.set(value, data.accepted_count);
                  }
                  return { error: null };
                }),
              };
            }),
          };
        }
        return mockSupabase;
      });

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: command.flashcards.map((fc, index) => ({
          id: `flashcard-${index + 1}`,
          user_id: TEST_USER_ID,
          ...fc,
          interval: 0,
          repetition: 0,
          ease_factor: 2.5,
          due_date: MOCK_NOW,
          created_at: MOCK_NOW,
          updated_at: MOCK_NOW,
        })),
        error: null,
      });

      // Act
      await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert
      expect(generationUpdates.get(GENERATION_ID_1)).toBe(2);
      expect(generationUpdates.get(GENERATION_ID_2)).toBe(1);
    });
  });

  describe("Happy Path - Mixed Manual and AI Flashcards", () => {
    it("should handle mix of manual and AI flashcards", async () => {
      // Arrange
      const GENERATION_ID = 30;
      const command = {
        flashcards: [
          {
            front: "Manual card",
            back: "Manual answer",
            generation_type: "manual" as const,
            generation_id: null,
          },
          {
            front: "AI card",
            back: "AI answer",
            generation_type: "ai" as const,
            generation_id: GENERATION_ID,
          },
        ],
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "generations") {
          return {
            ...mockSupabase,
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{ id: GENERATION_ID, user_id: TEST_USER_ID }],
              error: null,
            }),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { accepted_count: 0 },
              error: null,
            }),
            update: vi.fn().mockReturnThis(),
          };
        }
        return mockSupabase;
      });

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: command.flashcards.map((fc, index) => ({
          id: `flashcard-${index + 1}`,
          user_id: TEST_USER_ID,
          ...fc,
          interval: 0,
          repetition: 0,
          ease_factor: 2.5,
          due_date: MOCK_NOW,
          created_at: MOCK_NOW,
          updated_at: MOCK_NOW,
        })),
        error: null,
      });

      // Act
      const result = await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].generation_type).toBe("manual");
      expect(result[0].generation_id).toBeNull();
      expect(result[1].generation_type).toBe("ai");
      expect(result[1].generation_id).toBe(GENERATION_ID);
    });
  });

  describe("Edge Cases - SM-2 Default Values", () => {
    it("should set correct SM-2 default values for all flashcards", async () => {
      // Arrange
      const command = {
        flashcards: [
          {
            front: "Test card",
            back: "Test answer",
            generation_type: "manual" as const,
            generation_id: null,
          },
        ],
      };

      let capturedInsertData: unknown;

      mockSupabase.insert.mockImplementation((data: unknown) => {
        capturedInsertData = data;
        return mockSupabase;
      });

      mockSupabase.select.mockResolvedValue({
        data: [
          {
            id: "flashcard-1",
            user_id: TEST_USER_ID,
            ...command.flashcards[0],
            interval: 0,
            repetition: 0,
            ease_factor: 2.5,
            due_date: MOCK_NOW,
            created_at: MOCK_NOW,
            updated_at: MOCK_NOW,
          },
        ],
        error: null,
      });

      // Act
      await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert
      expect(Array.isArray(capturedInsertData)).toBe(true);
      const insertedData = capturedInsertData as {
        interval: number;
        repetition: number;
        ease_factor: number;
        due_date: string;
      }[];
      expect(insertedData[0]).toMatchObject({
        interval: 0,
        repetition: 0,
        ease_factor: 2.5,
        due_date: MOCK_NOW,
      });
    });

    it("should set due_date to current timestamp for all flashcards", async () => {
      // Arrange
      const command = {
        flashcards: [
          {
            front: "Card 1",
            back: "Answer 1",
            generation_type: "manual" as const,
            generation_id: null,
          },
          {
            front: "Card 2",
            back: "Answer 2",
            generation_type: "manual" as const,
            generation_id: null,
          },
        ],
      };

      let capturedInsertData: unknown;

      mockSupabase.insert.mockImplementation((data: unknown) => {
        capturedInsertData = data;
        return mockSupabase;
      });

      mockSupabase.select.mockResolvedValue({
        data: command.flashcards.map((fc, index) => ({
          id: `flashcard-${index + 1}`,
          user_id: TEST_USER_ID,
          ...fc,
          interval: 0,
          repetition: 0,
          ease_factor: 2.5,
          due_date: MOCK_NOW,
          created_at: MOCK_NOW,
          updated_at: MOCK_NOW,
        })),
        error: null,
      });

      // Act
      await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert
      expect(Array.isArray(capturedInsertData)).toBe(true);
      const insertedData = capturedInsertData as { due_date: string }[];
      expect(insertedData[0].due_date).toBe(MOCK_NOW);
      expect(insertedData[1].due_date).toBe(MOCK_NOW);
    });
  });

  describe("Error Cases - Generation Validation", () => {
    it("should throw NOT_FOUND error when generation_id does not exist", async () => {
      // Arrange
      const NON_EXISTENT_GENERATION_ID = 999;
      const command = {
        flashcards: [
          {
            front: "AI card",
            back: "AI answer",
            generation_type: "ai" as const,
            generation_id: NON_EXISTENT_GENERATION_ID,
          },
        ],
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "generations") {
          return {
            ...mockSupabase,
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [], // No generations found
              error: null,
            }),
          };
        }
        return mockSupabase;
      });

      // Act & Assert
      await expect(service.createFlashcardsBatch(command, TEST_USER_ID)).rejects.toThrow(
        "One or more generation records not found"
      );

      await expect(service.createFlashcardsBatch(command, TEST_USER_ID)).rejects.toMatchObject({
        code: "NOT_FOUND",
        details: {
          missing_generation_ids: [NON_EXISTENT_GENERATION_ID],
        },
      });
    });

    it("should throw NOT_FOUND error when some generation_ids are missing", async () => {
      // Arrange
      const EXISTING_GENERATION_ID = 10;
      const MISSING_GENERATION_ID = 20;
      const command = {
        flashcards: [
          {
            front: "Card 1",
            back: "Answer 1",
            generation_type: "ai" as const,
            generation_id: EXISTING_GENERATION_ID,
          },
          {
            front: "Card 2",
            back: "Answer 2",
            generation_type: "ai" as const,
            generation_id: MISSING_GENERATION_ID,
          },
        ],
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "generations") {
          return {
            ...mockSupabase,
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{ id: EXISTING_GENERATION_ID, user_id: TEST_USER_ID }],
              error: null,
            }),
          };
        }
        return mockSupabase;
      });

      // Act & Assert
      await expect(service.createFlashcardsBatch(command, TEST_USER_ID)).rejects.toMatchObject({
        code: "NOT_FOUND",
        details: {
          missing_generation_ids: [MISSING_GENERATION_ID],
        },
      });
    });

    it("should throw FORBIDDEN error when generation belongs to another user", async () => {
      // Arrange
      const GENERATION_ID = 42;
      const command = {
        flashcards: [
          {
            front: "AI card",
            back: "AI answer",
            generation_type: "ai" as const,
            generation_id: GENERATION_ID,
          },
        ],
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "generations") {
          return {
            ...mockSupabase,
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{ id: GENERATION_ID, user_id: TEST_OTHER_USER_ID }], // Different user
              error: null,
            }),
          };
        }
        return mockSupabase;
      });

      // Act & Assert
      await expect(service.createFlashcardsBatch(command, TEST_USER_ID)).rejects.toThrow(
        "Cannot create flashcards for generations that belong to another user"
      );

      await expect(service.createFlashcardsBatch(command, TEST_USER_ID)).rejects.toMatchObject({
        code: "FORBIDDEN",
        details: {
          unauthorized_generation_ids: [GENERATION_ID],
        },
      });
    });

    it("should throw FORBIDDEN error when multiple generations belong to other users", async () => {
      // Arrange
      const GENERATION_ID_1 = 10;
      const GENERATION_ID_2 = 20;
      const command = {
        flashcards: [
          {
            front: "Card 1",
            back: "Answer 1",
            generation_type: "ai" as const,
            generation_id: GENERATION_ID_1,
          },
          {
            front: "Card 2",
            back: "Answer 2",
            generation_type: "ai" as const,
            generation_id: GENERATION_ID_2,
          },
        ],
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "generations") {
          return {
            ...mockSupabase,
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [
                { id: GENERATION_ID_1, user_id: TEST_OTHER_USER_ID },
                { id: GENERATION_ID_2, user_id: TEST_OTHER_USER_ID },
              ],
              error: null,
            }),
          };
        }
        return mockSupabase;
      });

      // Act & Assert
      await expect(service.createFlashcardsBatch(command, TEST_USER_ID)).rejects.toMatchObject({
        code: "FORBIDDEN",
        details: {
          unauthorized_generation_ids: [GENERATION_ID_1, GENERATION_ID_2],
        },
      });
    });

    it("should throw DATABASE_ERROR when generation verification query fails", async () => {
      // Arrange
      const GENERATION_ID = 42;
      const command = {
        flashcards: [
          {
            front: "AI card",
            back: "AI answer",
            generation_type: "ai" as const,
            generation_id: GENERATION_ID,
          },
        ],
      };

      const mockDbError = { code: "PGRST500", message: "Database connection failed" };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "generations") {
          return {
            ...mockSupabase,
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: null,
              error: mockDbError,
            }),
          };
        }
        return mockSupabase;
      });

      // Act & Assert
      await expect(service.createFlashcardsBatch(command, TEST_USER_ID)).rejects.toThrow(
        "Failed to verify generation records"
      );

      await expect(service.createFlashcardsBatch(command, TEST_USER_ID)).rejects.toMatchObject({
        code: "DATABASE_ERROR",
        details: mockDbError,
      });
    });
  });

  describe("Error Cases - Flashcard Insertion", () => {
    it("should throw DATABASE_ERROR when flashcard insertion fails", async () => {
      // Arrange
      const command = {
        flashcards: [
          {
            front: "Test card",
            back: "Test answer",
            generation_type: "manual" as const,
            generation_id: null,
          },
        ],
      };

      const mockDbError = { code: "23505", message: "Unique constraint violation" };

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: null,
        error: mockDbError,
      });

      // Act & Assert
      await expect(service.createFlashcardsBatch(command, TEST_USER_ID)).rejects.toThrow(
        "Failed to create flashcards in database"
      );

      await expect(service.createFlashcardsBatch(command, TEST_USER_ID)).rejects.toMatchObject({
        code: "DATABASE_ERROR",
        details: mockDbError,
      });
    });

    it("should throw DATABASE_ERROR when no flashcards are returned after insertion", async () => {
      // Arrange
      const command = {
        flashcards: [
          {
            front: "Test card",
            back: "Test answer",
            generation_type: "manual" as const,
            generation_id: null,
          },
        ],
      };

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: null, // No data returned
        error: null,
      });

      // Act & Assert
      await expect(service.createFlashcardsBatch(command, TEST_USER_ID)).rejects.toThrow("No flashcards were created");

      await expect(service.createFlashcardsBatch(command, TEST_USER_ID)).rejects.toMatchObject({
        code: "DATABASE_ERROR",
      });
    });

    it("should throw DATABASE_ERROR when empty array is returned after insertion", async () => {
      // Arrange
      const command = {
        flashcards: [
          {
            front: "Test card",
            back: "Test answer",
            generation_type: "manual" as const,
            generation_id: null,
          },
        ],
      };

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: [], // Empty array
        error: null,
      });

      // Act & Assert
      await expect(service.createFlashcardsBatch(command, TEST_USER_ID)).rejects.toThrow("No flashcards were created");
    });
  });

  describe("Error Cases - Generation Update Failures", () => {
    it("should not fail batch operation if generation fetch for update fails", async () => {
      // Arrange
      const GENERATION_ID = 42;
      const command = {
        flashcards: [
          {
            front: "AI card",
            back: "AI answer",
            generation_type: "ai" as const,
            generation_id: GENERATION_ID,
          },
        ],
      };

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
        // Mock implementation to suppress console output during tests
      });

      let fromCallCount = 0;

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "generations") {
          fromCallCount++;
          if (fromCallCount === 1) {
            // First call: verification query - should succeed
            return {
              ...mockSupabase,
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockResolvedValue({
                data: [{ id: GENERATION_ID, user_id: TEST_USER_ID }],
                error: null,
              }),
            };
          } else {
            // Second call: fetch for update - should fail
            return {
              ...mockSupabase,
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: "PGRST500", message: "Database error" },
              }),
            };
          }
        }
        return mockSupabase;
      });

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: [
          {
            id: "flashcard-1",
            user_id: TEST_USER_ID,
            ...command.flashcards[0],
            interval: 0,
            repetition: 0,
            ease_factor: 2.5,
            due_date: MOCK_NOW,
            created_at: MOCK_NOW,
            updated_at: MOCK_NOW,
          },
        ],
        error: null,
      });

      // Act
      const result = await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert - operation should succeed despite update failure
      expect(result).toHaveLength(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to fetch generation ${GENERATION_ID} for update`),
        expect.any(Object)
      );

      consoleErrorSpy.mockRestore();
    });

    it("should not fail batch operation if generation update fails", async () => {
      // Arrange
      const GENERATION_ID = 42;
      const command = {
        flashcards: [
          {
            front: "AI card",
            back: "AI answer",
            generation_type: "ai" as const,
            generation_id: GENERATION_ID,
          },
        ],
      };

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
        // Mock implementation to suppress console output during tests
      });

      let fromCallCount = 0;

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "generations") {
          fromCallCount++;
          if (fromCallCount === 1) {
            // First call: verification query - should succeed
            return {
              ...mockSupabase,
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockResolvedValue({
                data: [{ id: GENERATION_ID, user_id: TEST_USER_ID }],
                error: null,
              }),
            };
          } else if (fromCallCount === 2) {
            // Second call: fetch for update - should succeed
            return {
              ...mockSupabase,
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { accepted_count: 0 },
                error: null,
              }),
            };
          } else {
            // Third call: update - should fail
            return {
              ...mockSupabase,
              update: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({
                error: { code: "PGRST500", message: "Update failed" },
              }),
            };
          }
        }
        return mockSupabase;
      });

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: [
          {
            id: "flashcard-1",
            user_id: TEST_USER_ID,
            ...command.flashcards[0],
            interval: 0,
            repetition: 0,
            ease_factor: 2.5,
            due_date: MOCK_NOW,
            created_at: MOCK_NOW,
            updated_at: MOCK_NOW,
          },
        ],
        error: null,
      });

      // Act
      const result = await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert - operation should succeed despite update failure
      expect(result).toHaveLength(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to update accepted_count for generation ${GENERATION_ID}`),
        expect.any(Object)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Edge Cases - Empty and Large Batches", () => {
    it("should handle empty flashcards array", async () => {
      // Arrange
      const command = {
        flashcards: [],
      };

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: [],
        error: null,
      });

      // Act & Assert
      await expect(service.createFlashcardsBatch(command, TEST_USER_ID)).rejects.toThrow("No flashcards were created");
    });

    it("should handle large batch of flashcards (100 items)", async () => {
      // Arrange
      const command = {
        flashcards: Array.from({ length: 100 }, (_, i) => ({
          front: `Question ${i + 1}?`,
          back: `Answer ${i + 1}`,
          generation_type: "manual" as const,
          generation_id: null,
        })),
      };

      const mockCreatedFlashcards = command.flashcards.map((fc, index) => ({
        id: `flashcard-${index + 1}`,
        user_id: TEST_USER_ID,
        ...fc,
        interval: 0,
        repetition: 0,
        ease_factor: 2.5,
        due_date: MOCK_NOW,
        created_at: MOCK_NOW,
        updated_at: MOCK_NOW,
      }));

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: mockCreatedFlashcards,
        error: null,
      });

      // Act
      const result = await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert
      expect(result).toHaveLength(100);
    });
  });

  describe("Edge Cases - Special Characters and Content", () => {
    it("should handle flashcards with special characters", async () => {
      // Arrange
      const command = {
        flashcards: [
          {
            front: "What is <script>alert('XSS')</script>?",
            back: "A security vulnerability & attack vector",
            generation_type: "manual" as const,
            generation_id: null,
          },
        ],
      };

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: [
          {
            id: "flashcard-1",
            user_id: TEST_USER_ID,
            ...command.flashcards[0],
            interval: 0,
            repetition: 0,
            ease_factor: 2.5,
            due_date: MOCK_NOW,
            created_at: MOCK_NOW,
            updated_at: MOCK_NOW,
          },
        ],
        error: null,
      });

      // Act
      const result = await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert
      expect(result[0].front).toBe("What is <script>alert('XSS')</script>?");
      expect(result[0].back).toBe("A security vulnerability & attack vector");
    });

    it("should handle flashcards with unicode characters", async () => {
      // Arrange
      const command = {
        flashcards: [
          {
            front: "¿Qué es TypeScript? 你好",
            back: "TypeScript est un langage 🚀",
            generation_type: "manual" as const,
            generation_id: null,
          },
        ],
      };

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: [
          {
            id: "flashcard-1",
            user_id: TEST_USER_ID,
            ...command.flashcards[0],
            interval: 0,
            repetition: 0,
            ease_factor: 2.5,
            due_date: MOCK_NOW,
            created_at: MOCK_NOW,
            updated_at: MOCK_NOW,
          },
        ],
        error: null,
      });

      // Act
      const result = await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert
      expect(result[0].front).toBe("¿Qué es TypeScript? 你好");
      expect(result[0].back).toBe("TypeScript est un langage 🚀");
    });

    it("should handle flashcards with very long content", async () => {
      // Arrange
      const longText = "A".repeat(5000);
      const command = {
        flashcards: [
          {
            front: longText,
            back: longText,
            generation_type: "manual" as const,
            generation_id: null,
          },
        ],
      };

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: [
          {
            id: "flashcard-1",
            user_id: TEST_USER_ID,
            ...command.flashcards[0],
            interval: 0,
            repetition: 0,
            ease_factor: 2.5,
            due_date: MOCK_NOW,
            created_at: MOCK_NOW,
            updated_at: MOCK_NOW,
          },
        ],
        error: null,
      });

      // Act
      const result = await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert
      expect(result[0].front).toHaveLength(5000);
      expect(result[0].back).toHaveLength(5000);
    });
  });

  describe("Business Rules - Generation Counting", () => {
    it("should count flashcards per generation correctly", async () => {
      // Arrange
      const GENERATION_ID = 42;
      const command = {
        flashcards: [
          {
            front: "Card 1",
            back: "Answer 1",
            generation_type: "ai" as const,
            generation_id: GENERATION_ID,
          },
          {
            front: "Card 2",
            back: "Answer 2",
            generation_type: "ai" as const,
            generation_id: GENERATION_ID,
          },
          {
            front: "Card 3",
            back: "Answer 3",
            generation_type: "ai" as const,
            generation_id: GENERATION_ID,
          },
        ],
      };

      let capturedUpdateCount: number | null = null;

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "generations") {
          return {
            ...mockSupabase,
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{ id: GENERATION_ID, user_id: TEST_USER_ID }],
              error: null,
            }),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { accepted_count: 0 },
              error: null,
            }),
            update: vi.fn((data: { accepted_count: number }) => {
              capturedUpdateCount = data.accepted_count;
              return {
                ...mockSupabase,
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        return mockSupabase;
      });

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: command.flashcards.map((fc, index) => ({
          id: `flashcard-${index + 1}`,
          user_id: TEST_USER_ID,
          ...fc,
          interval: 0,
          repetition: 0,
          ease_factor: 2.5,
          due_date: MOCK_NOW,
          created_at: MOCK_NOW,
          updated_at: MOCK_NOW,
        })),
        error: null,
      });

      // Act
      await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert
      expect(capturedUpdateCount).toBe(3); // 0 + 3
    });

    it("should not count manual flashcards towards generation accepted_count", async () => {
      // Arrange
      const GENERATION_ID = 42;
      const command = {
        flashcards: [
          {
            front: "AI card",
            back: "AI answer",
            generation_type: "ai" as const,
            generation_id: GENERATION_ID,
          },
          {
            front: "Manual card",
            back: "Manual answer",
            generation_type: "manual" as const,
            generation_id: null,
          },
        ],
      };

      let capturedUpdateCount: number | null = null;

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "generations") {
          return {
            ...mockSupabase,
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{ id: GENERATION_ID, user_id: TEST_USER_ID }],
              error: null,
            }),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { accepted_count: 0 },
              error: null,
            }),
            update: vi.fn((data: { accepted_count: number }) => {
              capturedUpdateCount = data.accepted_count;
              return {
                ...mockSupabase,
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        return mockSupabase;
      });

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: command.flashcards.map((fc, index) => ({
          id: `flashcard-${index + 1}`,
          user_id: TEST_USER_ID,
          ...fc,
          interval: 0,
          repetition: 0,
          ease_factor: 2.5,
          due_date: MOCK_NOW,
          created_at: MOCK_NOW,
          updated_at: MOCK_NOW,
        })),
        error: null,
      });

      // Act
      await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert
      expect(capturedUpdateCount).toBe(1); // Only AI card counted
    });
  });

  describe("Edge Cases - AI Flashcards with null generation_id", () => {
    it("should not query generations table when AI flashcards have null generation_id", async () => {
      // Arrange - Edge case: AI flashcard with null generation_id (shouldn't happen but handle gracefully)
      const command = {
        flashcards: [
          {
            front: "AI card with no generation",
            back: "AI answer",
            generation_type: "ai" as const,
            generation_id: null,
          },
        ],
      };

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: [
          {
            id: "flashcard-1",
            user_id: TEST_USER_ID,
            ...command.flashcards[0],
            interval: 0,
            repetition: 0,
            ease_factor: 2.5,
            due_date: MOCK_NOW,
            created_at: MOCK_NOW,
            updated_at: MOCK_NOW,
          },
        ],
        error: null,
      });

      // Act
      await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert - verify generations table was never queried
      const fromCalls = mockSupabase.from.mock.calls as [string][];
      expect(fromCalls.every((call) => call[0] === "flashcards")).toBe(true);
    });
  });

  describe("Edge Cases - Duplicate Generation IDs", () => {
    it("should handle duplicate generation_ids in same batch efficiently", async () => {
      // Arrange - Multiple flashcards from same generation should only query once
      const GENERATION_ID = 100;
      const command = {
        flashcards: [
          {
            front: "Card 1",
            back: "Answer 1",
            generation_type: "ai" as const,
            generation_id: GENERATION_ID,
          },
          {
            front: "Card 2",
            back: "Answer 2",
            generation_type: "ai" as const,
            generation_id: GENERATION_ID,
          },
          {
            front: "Card 3",
            back: "Answer 3",
            generation_type: "ai" as const,
            generation_id: GENERATION_ID,
          },
        ],
      };

      let inCallCount = 0;

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "generations") {
          return {
            ...mockSupabase,
            select: vi.fn().mockReturnThis(),
            in: vi.fn(() => {
              inCallCount++;
              return Promise.resolve({
                data: [{ id: GENERATION_ID, user_id: TEST_USER_ID }],
                error: null,
              });
            }),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { accepted_count: 0 },
              error: null,
            }),
            update: vi.fn().mockReturnThis(),
          };
        }
        return mockSupabase;
      });

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: command.flashcards.map((fc, index) => ({
          id: `flashcard-${index + 1}`,
          user_id: TEST_USER_ID,
          ...fc,
          interval: 0,
          repetition: 0,
          ease_factor: 2.5,
          due_date: MOCK_NOW,
          created_at: MOCK_NOW,
          updated_at: MOCK_NOW,
        })),
        error: null,
      });

      // Act
      await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert - Should only query once for verification despite 3 flashcards
      expect(inCallCount).toBe(1);
    });
  });

  describe("Edge Cases - Mixed Ownership Scenarios", () => {
    it("should allow mix of user's and other users' generations if only user's are used", async () => {
      // Arrange - Only using user's own generation, even if other generations exist
      const USER_GENERATION_ID = 10;
      const command = {
        flashcards: [
          {
            front: "User's card",
            back: "User's answer",
            generation_type: "ai" as const,
            generation_id: USER_GENERATION_ID,
          },
        ],
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "generations") {
          return {
            ...mockSupabase,
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{ id: USER_GENERATION_ID, user_id: TEST_USER_ID }],
              error: null,
            }),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { accepted_count: 0 },
              error: null,
            }),
            update: vi.fn().mockReturnThis(),
          };
        }
        return mockSupabase;
      });

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: [
          {
            id: "flashcard-1",
            user_id: TEST_USER_ID,
            ...command.flashcards[0],
            interval: 0,
            repetition: 0,
            ease_factor: 2.5,
            due_date: MOCK_NOW,
            created_at: MOCK_NOW,
            updated_at: MOCK_NOW,
          },
        ],
        error: null,
      });

      // Act & Assert - Should succeed
      const result = await service.createFlashcardsBatch(command, TEST_USER_ID);
      expect(result).toHaveLength(1);
    });

    it("should throw FORBIDDEN when mix of authorized and unauthorized generations", async () => {
      // Arrange
      const USER_GENERATION_ID = 10;
      const OTHER_USER_GENERATION_ID = 20;
      const command = {
        flashcards: [
          {
            front: "User's card",
            back: "User's answer",
            generation_type: "ai" as const,
            generation_id: USER_GENERATION_ID,
          },
          {
            front: "Other user's card",
            back: "Other user's answer",
            generation_type: "ai" as const,
            generation_id: OTHER_USER_GENERATION_ID,
          },
        ],
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "generations") {
          return {
            ...mockSupabase,
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [
                { id: USER_GENERATION_ID, user_id: TEST_USER_ID },
                { id: OTHER_USER_GENERATION_ID, user_id: TEST_OTHER_USER_ID },
              ],
              error: null,
            }),
          };
        }
        return mockSupabase;
      });

      // Act & Assert
      await expect(service.createFlashcardsBatch(command, TEST_USER_ID)).rejects.toMatchObject({
        code: "FORBIDDEN",
        details: {
          unauthorized_generation_ids: [OTHER_USER_GENERATION_ID],
        },
      });
    });
  });

  describe("Business Rules - User ID Assignment", () => {
    it("should assign correct user_id to all flashcards", async () => {
      // Arrange
      const command = {
        flashcards: [
          {
            front: "Card 1",
            back: "Answer 1",
            generation_type: "manual" as const,
            generation_id: null,
          },
          {
            front: "Card 2",
            back: "Answer 2",
            generation_type: "manual" as const,
            generation_id: null,
          },
        ],
      };

      let capturedInsertData: unknown;

      mockSupabase.insert.mockImplementation((data: unknown) => {
        capturedInsertData = data;
        return mockSupabase;
      });

      mockSupabase.select.mockResolvedValue({
        data: command.flashcards.map((fc, index) => ({
          id: `flashcard-${index + 1}`,
          user_id: TEST_USER_ID,
          ...fc,
          interval: 0,
          repetition: 0,
          ease_factor: 2.5,
          due_date: MOCK_NOW,
          created_at: MOCK_NOW,
          updated_at: MOCK_NOW,
        })),
        error: null,
      });

      // Act
      await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert
      expect(Array.isArray(capturedInsertData)).toBe(true);
      const insertedData = capturedInsertData as { user_id: string }[];
      expect(insertedData[0].user_id).toBe(TEST_USER_ID);
      expect(insertedData[1].user_id).toBe(TEST_USER_ID);
    });

    it("should use provided userId parameter not generation user_id", async () => {
      // Arrange - Ensure userId parameter is used, not extracted from generation
      const GENERATION_ID = 42;
      const command = {
        flashcards: [
          {
            front: "AI card",
            back: "AI answer",
            generation_type: "ai" as const,
            generation_id: GENERATION_ID,
          },
        ],
      };

      let capturedInsertData: unknown;

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "generations") {
          return {
            ...mockSupabase,
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{ id: GENERATION_ID, user_id: TEST_USER_ID }],
              error: null,
            }),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { accepted_count: 0 },
              error: null,
            }),
            update: vi.fn().mockReturnThis(),
          };
        }
        return mockSupabase;
      });

      mockSupabase.insert.mockImplementation((data: unknown) => {
        capturedInsertData = data;
        return mockSupabase;
      });

      mockSupabase.select.mockResolvedValue({
        data: [
          {
            id: "flashcard-1",
            user_id: TEST_USER_ID,
            ...command.flashcards[0],
            interval: 0,
            repetition: 0,
            ease_factor: 2.5,
            due_date: MOCK_NOW,
            created_at: MOCK_NOW,
            updated_at: MOCK_NOW,
          },
        ],
        error: null,
      });

      // Act
      await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert
      expect(Array.isArray(capturedInsertData)).toBe(true);
      const insertedData = capturedInsertData as { user_id: string }[];
      expect(insertedData[0].user_id).toBe(TEST_USER_ID);
    });
  });

  describe("Business Rules - Generation ID Preservation", () => {
    it("should preserve generation_id for AI flashcards", async () => {
      // Arrange
      const GENERATION_ID = 99;
      const command = {
        flashcards: [
          {
            front: "AI card",
            back: "AI answer",
            generation_type: "ai" as const,
            generation_id: GENERATION_ID,
          },
        ],
      };

      let capturedInsertData: unknown;

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "generations") {
          return {
            ...mockSupabase,
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{ id: GENERATION_ID, user_id: TEST_USER_ID }],
              error: null,
            }),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { accepted_count: 0 },
              error: null,
            }),
            update: vi.fn().mockReturnThis(),
          };
        }
        return mockSupabase;
      });

      mockSupabase.insert.mockImplementation((data: unknown) => {
        capturedInsertData = data;
        return mockSupabase;
      });

      mockSupabase.select.mockResolvedValue({
        data: [
          {
            id: "flashcard-1",
            user_id: TEST_USER_ID,
            ...command.flashcards[0],
            interval: 0,
            repetition: 0,
            ease_factor: 2.5,
            due_date: MOCK_NOW,
            created_at: MOCK_NOW,
            updated_at: MOCK_NOW,
          },
        ],
        error: null,
      });

      // Act
      await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert
      expect(Array.isArray(capturedInsertData)).toBe(true);
      const insertedData = capturedInsertData as { generation_id: number | null; generation_type: string }[];
      expect(insertedData[0].generation_id).toBe(GENERATION_ID);
      expect(insertedData[0].generation_type).toBe("ai");
    });

    it("should preserve null generation_id for manual flashcards", async () => {
      // Arrange
      const command = {
        flashcards: [
          {
            front: "Manual card",
            back: "Manual answer",
            generation_type: "manual" as const,
            generation_id: null,
          },
        ],
      };

      let capturedInsertData: unknown;

      mockSupabase.insert.mockImplementation((data: unknown) => {
        capturedInsertData = data;
        return mockSupabase;
      });

      mockSupabase.select.mockResolvedValue({
        data: [
          {
            id: "flashcard-1",
            user_id: TEST_USER_ID,
            ...command.flashcards[0],
            interval: 0,
            repetition: 0,
            ease_factor: 2.5,
            due_date: MOCK_NOW,
            created_at: MOCK_NOW,
            updated_at: MOCK_NOW,
          },
        ],
        error: null,
      });

      // Act
      await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert
      expect(Array.isArray(capturedInsertData)).toBe(true);
      const insertedData = capturedInsertData as { generation_id: number | null; generation_type: string }[];
      expect(insertedData[0].generation_id).toBeNull();
      expect(insertedData[0].generation_type).toBe("manual");
    });
  });

  describe("Business Rules - Content Preservation", () => {
    it("should preserve exact front and back content without modification", async () => {
      // Arrange
      const command = {
        flashcards: [
          {
            front: "  Leading and trailing spaces  ",
            back: "\nNewlines\nPreserved\n",
            generation_type: "manual" as const,
            generation_id: null,
          },
        ],
      };

      let capturedInsertData: unknown;

      mockSupabase.insert.mockImplementation((data: unknown) => {
        capturedInsertData = data;
        return mockSupabase;
      });

      mockSupabase.select.mockResolvedValue({
        data: [
          {
            id: "flashcard-1",
            user_id: TEST_USER_ID,
            ...command.flashcards[0],
            interval: 0,
            repetition: 0,
            ease_factor: 2.5,
            due_date: MOCK_NOW,
            created_at: MOCK_NOW,
            updated_at: MOCK_NOW,
          },
        ],
        error: null,
      });

      // Act
      await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert
      expect(Array.isArray(capturedInsertData)).toBe(true);
      const insertedData = capturedInsertData as { front: string; back: string }[];
      expect(insertedData[0].front).toBe("  Leading and trailing spaces  ");
      expect(insertedData[0].back).toBe("\nNewlines\nPreserved\n");
    });

    it("should handle empty strings for front and back", async () => {
      // Arrange - Edge case: empty content (validation should happen at API layer)
      const command = {
        flashcards: [
          {
            front: "",
            back: "",
            generation_type: "manual" as const,
            generation_id: null,
          },
        ],
      };

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: [
          {
            id: "flashcard-1",
            user_id: TEST_USER_ID,
            ...command.flashcards[0],
            interval: 0,
            repetition: 0,
            ease_factor: 2.5,
            due_date: MOCK_NOW,
            created_at: MOCK_NOW,
            updated_at: MOCK_NOW,
          },
        ],
        error: null,
      });

      // Act
      const result = await service.createFlashcardsBatch(command, TEST_USER_ID);

      // Assert - Service layer doesn't validate, just processes
      expect(result[0].front).toBe("");
      expect(result[0].back).toBe("");
    });
  });
});

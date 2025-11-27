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

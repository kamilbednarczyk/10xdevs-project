import type { FlashcardProposalDTO } from "../../types";

/**
 * Mock AI Service for Development
 * Returns sample flashcard proposals without calling external API
 *
 * This service simulates AI-generated flashcards for rapid development
 * and testing without requiring API keys or external service configuration.
 */
export class MockAIService {
  /**
   * Generate mock flashcard proposals from text
   *
   * @param text - The input text (used to determine number of cards)
   * @returns Array of sample flashcard proposals
   */
  async generateFlashcards(text: string): Promise<FlashcardProposalDTO[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Generate 5-10 cards based on text length
    const textLength = text.length;
    const cardCount = Math.min(10, Math.max(5, Math.floor(textLength / 1000)));

    const sampleProposals: FlashcardProposalDTO[] = [
      {
        front: "What is Astro?",
        back: "Astro is a modern web framework for building fast, content-focused websites with less JavaScript.",
      },
      {
        front: "What is the main benefit of spaced repetition?",
        back: "Spaced repetition optimizes learning by reviewing information at increasing intervals, improving long-term retention.",
      },
      {
        front: "What does TypeScript add to JavaScript?",
        back: "TypeScript adds static type checking to JavaScript, helping catch errors during development.",
      },
      {
        front: "What is the purpose of Supabase?",
        back: "Supabase is an open-source Firebase alternative providing authentication, database, and storage services.",
      },
      {
        front: "What is the SM-2 algorithm?",
        back: "SM-2 is a spaced repetition algorithm that calculates optimal review intervals based on recall quality.",
      },
      {
        front: "What is a flashcard generation?",
        back: "A flashcard generation is an AI-powered session that creates multiple flashcard proposals from input text.",
      },
      {
        front: "What is the difference between 'manual' and 'ai' generation types?",
        back: "Manual flashcards are created directly by users, while AI flashcards are generated automatically from text.",
      },
      {
        front: "What is the purpose of the 'due_date' field?",
        back: "The due_date field determines when a flashcard should be reviewed next based on the spaced repetition algorithm.",
      },
      {
        front: "What does 'ease_factor' represent?",
        back: "Ease_factor is a multiplier that adjusts review intervals based on how easily you recall the information.",
      },
      {
        front: "What is the acceptance rate in generations?",
        back: "Acceptance rate is the percentage of AI-generated proposals that the user chose to save as flashcards.",
      },
    ];

    // Return the appropriate number of cards
    return sampleProposals.slice(0, cardCount);
  }
}

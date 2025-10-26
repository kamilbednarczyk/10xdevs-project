import type { FlashcardProposalDTO } from "../../types";

/**
 * OpenRouter API Configuration
 */
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-3.5-sonnet"; // Using a reliable model for structured output

/**
 * System prompt for flashcard generation
 * Instructs the AI to generate high-quality flashcards from the provided text
 */
const SYSTEM_PROMPT = `You are an expert educational content creator specializing in creating effective flashcards for spaced repetition learning.

Your task is to analyze the provided text and generate high-quality flashcards that:
1. Focus on key concepts, definitions, and important facts
2. Use clear, concise language
3. Follow the question-answer format (front: question, back: answer)
4. Avoid ambiguity - each card should test one specific piece of knowledge
5. Create between 5-15 flashcards depending on the content richness

Return ONLY a valid JSON array of flashcard objects. Each object must have exactly two properties:
- "front": the question or prompt (string)
- "back": the answer or explanation (string)

Example format:
[
  {
    "front": "What is the capital of France?",
    "back": "Paris"
  },
  {
    "front": "What year did World War II end?",
    "back": "1945"
  }
]

Do not include any additional text, explanations, or markdown formatting - only the JSON array.`;

/**
 * Response structure from OpenRouter API
 */
interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

/**
 * Error thrown when OpenRouter API returns an error
 */
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

/**
 * OpenRouter Service
 * Handles communication with the OpenRouter API for AI-powered flashcard generation
 */
export class OpenRouterService {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("OpenRouter API key is required");
    }
    this.apiKey = apiKey;
  }

  /**
   * Generate flashcard proposals from text using AI
   *
   * @param text - The input text to generate flashcards from
   * @returns Array of flashcard proposals
   * @throws OpenRouterError if the API call fails or returns invalid data
   */
  async generateFlashcards(text: string): Promise<FlashcardProposalDTO[]> {
    try {
      // Make API request to OpenRouter
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://10xdevs-flashcards.app", // Optional: for OpenRouter analytics
          "X-Title": "10xDevs Flashcards", // Optional: for OpenRouter analytics
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: text,
            },
          ],
          temperature: 0.7, // Balanced creativity and consistency
          max_tokens: 2000, // Sufficient for 15 flashcards
        }),
      });

      // Handle non-200 responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new OpenRouterError(`OpenRouter API returned status ${response.status}`, response.status, errorData);
      }

      // Parse response
      const data = (await response.json()) as OpenRouterResponse;

      // Extract content from response
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new OpenRouterError("No content in OpenRouter response", undefined, data);
      }

      // Parse JSON from content
      let proposals: FlashcardProposalDTO[];
      try {
        proposals = JSON.parse(content) as FlashcardProposalDTO[];
      } catch (parseError) {
        throw new OpenRouterError("Failed to parse AI response as JSON", undefined, { content, parseError });
      }

      // Validate the structure
      if (!Array.isArray(proposals)) {
        throw new OpenRouterError("AI response is not an array", undefined, { proposals });
      }

      if (proposals.length === 0) {
        throw new OpenRouterError("AI generated no flashcards", undefined, { proposals });
      }

      // Validate each proposal has required fields
      for (const proposal of proposals) {
        if (!proposal.front || !proposal.back) {
          throw new OpenRouterError("Invalid flashcard proposal structure", undefined, { proposal });
        }
        if (typeof proposal.front !== "string" || typeof proposal.back !== "string") {
          throw new OpenRouterError("Flashcard front and back must be strings", undefined, { proposal });
        }
      }

      return proposals;
    } catch (error) {
      // Re-throw OpenRouterError as-is
      if (error instanceof OpenRouterError) {
        throw error;
      }

      // Wrap other errors
      throw new OpenRouterError("Unexpected error calling OpenRouter API", undefined, error);
    }
  }
}

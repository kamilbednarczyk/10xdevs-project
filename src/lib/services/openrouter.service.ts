import { logger } from "@/lib/logger";
import type { ChatCompletionOptions, ChatCompletionResponse, FlashcardProposalDTO } from "../../types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";
const DEFAULT_REFERER = "https://10xdevs-flashcards.app";
const DEFAULT_TITLE = "10xDevs Flashcards";
const MAX_RETRIES = 2;
const INITIAL_RETRY_DELAY_MS = 500;
const RETRIABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

const FLASHCARD_SYSTEM_PROMPT = `You are an expert educational content creator specializing in creating effective flashcards for spaced repetition learning.

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

export interface OpenRouterServiceConfig {
  apiKey?: string;
  referer?: string;
  title?: string;
  maxRetries?: number;
  initialRetryDelayMs?: number;
  fetchFn?: typeof fetch;
}

export class OpenRouterApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "OpenRouterApiError";
  }
}

export class OpenRouterService {
  private readonly apiUrl = OPENROUTER_API_URL;
  private readonly apiKey: string;
  private readonly referer: string;
  private readonly title: string;
  private readonly maxRetries: number;
  private readonly initialRetryDelayMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(config: OpenRouterServiceConfig = {}) {
    const resolvedKey = config.apiKey ?? import.meta.env.OPENROUTER_API_KEY;
    if (!resolvedKey) {
      logger.error("[OpenRouterService] Missing OPENROUTER_API_KEY environment variable.");
      throw new Error("OpenRouterService is not configured. Provide OPENROUTER_API_KEY.");
    }

    const fetchFn = config.fetchFn ?? globalThis.fetch;
    if (typeof fetchFn !== "function") {
      throw new Error("Fetch implementation is required for OpenRouterService.");
    }

    this.apiKey = resolvedKey;
    this.referer = config.referer ?? DEFAULT_REFERER;
    this.title = config.title ?? DEFAULT_TITLE;
    this.maxRetries = Math.max(0, config.maxRetries ?? MAX_RETRIES);
    this.initialRetryDelayMs = Math.max(100, config.initialRetryDelayMs ?? INITIAL_RETRY_DELAY_MS);
    this.fetchImpl = fetchFn;
  }

  public async getChatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    this.assertValidOptions(options);
    const payload = { ...options, stream: false };

    try {
      const response = await this.makeRequest(payload);
      return response as ChatCompletionResponse;
    } catch (error) {
      logger.error("[OpenRouterService] getChatCompletion failed:", error);
      if (error instanceof OpenRouterApiError) {
        throw error;
      }
      throw new OpenRouterApiError(500, "Unknown OpenRouter service error.", error);
    }
  }

  public async generateFlashcards(text: string): Promise<FlashcardProposalDTO[]> {
    if (!text || !text.trim()) {
      throw new OpenRouterApiError(400, "Input text is required to generate flashcards.");
    }

    const completion = await this.getChatCompletion({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: FLASHCARD_SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = completion.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new OpenRouterApiError(502, "OpenRouter response did not include content.", completion);
    }

    return this.parseFlashcardProposals(content);
  }

  private assertValidOptions(options: ChatCompletionOptions): void {
    if (!options || typeof options !== "object") {
      throw new OpenRouterApiError(400, "Chat completion options must be provided.");
    }

    if (!options.model || typeof options.model !== "string") {
      throw new OpenRouterApiError(400, "Chat completion requires a model name.");
    }

    if (!Array.isArray(options.messages) || options.messages.length === 0) {
      throw new OpenRouterApiError(400, "Chat completion requires at least one message.");
    }

    const hasInvalidMessage = options.messages.some(
      (message) => !message || typeof message.content !== "string" || typeof message.role !== "string"
    );
    if (hasInvalidMessage) {
      throw new OpenRouterApiError(400, "Each message must include a role and textual content.");
    }
  }

  private async makeRequest(body: Record<string, unknown>): Promise<ChatCompletionResponse> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.fetchImpl(this.apiUrl, {
          method: "POST",
          headers: this.buildHeaders(),
          body: JSON.stringify(body),
        });

        const rawBody = await response.text();
        const parsedBody = rawBody ? this.safeJsonParse(rawBody) : undefined;

        if (!response.ok) {
          const error = new OpenRouterApiError(
            response.status,
            `OpenRouter API error: ${response.status} ${response.statusText}`,
            parsedBody ?? rawBody
          );

          logger.error(
            `[OpenRouterService] API error (status: ${response.status}) on attempt ${attempt + 1}`,
            parsedBody ?? rawBody
          );

          if (this.shouldRetry(response.status, attempt)) {
            await this.delay(this.getRetryDelay(attempt));
            continue;
          }

          throw error;
        }

        if (!parsedBody || typeof parsedBody !== "object") {
          throw new OpenRouterApiError(500, "Service returned an empty or invalid payload.", rawBody);
        }

        return parsedBody as ChatCompletionResponse;
      } catch (error) {
        if (error instanceof OpenRouterApiError && this.shouldRetry(error.status, attempt)) {
          await this.delay(this.getRetryDelay(attempt));
          continue;
        }

        if (!(error instanceof OpenRouterApiError)) {
          logger.error(`[OpenRouterService] Network error on attempt ${attempt + 1} of ${this.maxRetries + 1}`, error);
          if (attempt < this.maxRetries) {
            await this.delay(this.getRetryDelay(attempt));
            continue;
          }
          throw new OpenRouterApiError(500, "Network error while calling OpenRouter API.", error);
        }

        throw error;
      }
    }

    throw new OpenRouterApiError(500, "Failed to communicate with OpenRouter API after multiple attempts.");
  }

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": this.referer,
      "X-Title": this.title,
    };
  }

  private shouldRetry(status: number | undefined, attempt: number): boolean {
    if (status === undefined) {
      return attempt < this.maxRetries;
    }
    return attempt < this.maxRetries && RETRIABLE_STATUS_CODES.has(status);
  }

  private getRetryDelay(attempt: number): number {
    return this.initialRetryDelayMs * Math.pow(2, attempt);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private safeJsonParse(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  }

  private parseFlashcardProposals(rawContent: string): FlashcardProposalDTO[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch (error) {
      throw new OpenRouterApiError(500, "Failed to parse AI response as JSON array.", {
        rawContent,
        error,
      });
    }

    if (!Array.isArray(parsed)) {
      throw new OpenRouterApiError(500, "AI response must be a JSON array.", parsed);
    }

    if (parsed.length === 0) {
      throw new OpenRouterApiError(502, "Service returned an empty flashcard list.", parsed);
    }

    parsed.forEach((item, index) => {
      if (!item || typeof item !== "object") {
        throw new OpenRouterApiError(500, `Flashcard at index ${index} is not an object.`, item);
      }

      const { front, back } = item as Record<string, unknown>;
      if (typeof front !== "string" || typeof back !== "string" || !front.trim() || !back.trim()) {
        throw new OpenRouterApiError(500, `Flashcard at index ${index} is missing valid front/back.`, item);
      }
    });

    return parsed as FlashcardProposalDTO[];
  }
}

export const openRouterService = new OpenRouterService();

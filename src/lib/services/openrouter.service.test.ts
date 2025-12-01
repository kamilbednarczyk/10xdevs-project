import { afterEach, describe, expect, it, vi } from "vitest";

import { OpenRouterService } from "./openrouter.service";

const originalFetch = globalThis.fetch;
const clearRuntimeEnv = () => {
  delete (globalThis as typeof globalThis & { __APP_RUNTIME_ENV__?: unknown }).__APP_RUNTIME_ENV__;
};

describe("OpenRouterService", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearRuntimeEnv();
    vi.restoreAllMocks();
  });

  it("binds global fetch when no custom fetch is provided", async () => {
    const mockResponsePayload = {
      id: "mock-id",
      choices: [
        {
          message: {
            content: JSON.stringify([{ front: "Front", back: "Back" }]),
          },
        },
      ],
    };

    const fakeFetch = vi.fn(function (this: unknown, ...args: Parameters<typeof fetch>) {
      expect(this).toBe(globalThis);
      const [input, init] = args;
      expect(input).toBe("https://openrouter.ai/api/v1/chat/completions");
      expect(init?.method).toBe("POST");
      return Promise.resolve(
        new Response(JSON.stringify(mockResponsePayload), {
          headers: { "Content-Type": "application/json" },
        })
      );
    }) as unknown as typeof fetch;

    globalThis.fetch = fakeFetch;

    const service = new OpenRouterService({ apiKey: "test-key" });
    const proposals = await service.generateFlashcards("Some study text");

    expect(proposals).toEqual([{ front: "Front", back: "Back" }]);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});

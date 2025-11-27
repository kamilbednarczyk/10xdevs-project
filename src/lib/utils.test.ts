import { describe, expect, it } from "vitest";
import { cn, getUnknownErrorMessage, readApiErrorMessage } from "@/lib/utils";

describe("cn", () => {
  it("merges tailwind class names while removing duplicates", () => {
    expect(cn("px-2", "text-sm", "px-4")).toBe("text-sm px-4");
  });
});

describe("readApiErrorMessage", () => {
  it("returns the payload when response body is a string", async () => {
    const response = new Response(JSON.stringify("Problem occurred"));

    await expect(readApiErrorMessage(response)).resolves.toBe("Problem occurred");
  });

  it("prefers message keys before error list entries", async () => {
    const response = new Response(
      JSON.stringify({
        message: "Save failed",
        errors: [{ message: "Should not be used" }],
      })
    );

    await expect(readApiErrorMessage(response)).resolves.toBe("Save failed");
  });

  it("falls back to the first error entry when no message is present", async () => {
    const response = new Response(
      JSON.stringify({
        errors: [{ message: "E1" }, { message: "E2" }],
      })
    );

    await expect(readApiErrorMessage(response)).resolves.toBe("E1");
  });

  it("returns null when the body cannot be parsed", async () => {
    const malformedResponse = new Response("not-json");

    await expect(readApiErrorMessage(malformedResponse)).resolves.toBeNull();
  });
});

describe("getUnknownErrorMessage", () => {
  it("returns the error message when the error is an Error instance", () => {
    expect(getUnknownErrorMessage(new Error("Boom"), "fallback")).toBe("Boom");
  });

  it("returns trimmed string errors over fallback", () => {
    expect(getUnknownErrorMessage("   custom message  ", "fallback")).toBe("   custom message  ");
  });

  it("returns the fallback when nothing useful is provided", () => {
    expect(getUnknownErrorMessage(undefined, "fallback")).toBe("fallback");
  });
});

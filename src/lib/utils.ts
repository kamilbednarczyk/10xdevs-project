import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ApiErrorPayload =
  | {
      message?: string;
      error?: string;
      errors?: { message?: string }[];
    }
  | string
  | null
  | undefined;

export async function readApiErrorMessage(response: Response | undefined): Promise<string | null> {
  if (!response) {
    return null;
  }

  try {
    const payload = (await response.json()) as ApiErrorPayload;
    if (!payload) {
      return null;
    }

    if (typeof payload === "string") {
      return payload;
    }

    if (payload.message) {
      return payload.message;
    }

    if (payload.error) {
      return payload.error;
    }

    const firstFieldError = payload.errors?.find((entry) => Boolean(entry?.message));

    return firstFieldError?.message ?? null;
  } catch {
    return null;
  }
}

export function getUnknownErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return fallback;
}

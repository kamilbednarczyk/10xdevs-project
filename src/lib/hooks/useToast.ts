import { useCallback } from "react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

export interface ToastMessage extends ToastOptions {
  id: string;
}

export const TOAST_SHOW_EVENT = "app:toast:show";
export const TOAST_DISMISS_EVENT = "app:toast:dismiss";

const createToastId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function useToast() {
  const showToast = useCallback((options: ToastOptions) => {
    const id = createToastId();

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent<ToastMessage>(TOAST_SHOW_EVENT, {
          detail: {
            id,
            title: options.title,
            description: options.description,
            variant: options.variant ?? "info",
            duration: options.duration,
          },
        })
      );
    }

    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new CustomEvent<{ id: string }>(TOAST_DISMISS_EVENT, {
        detail: { id },
      })
    );
  }, []);

  return {
    showToast,
    dismissToast,
  };
}

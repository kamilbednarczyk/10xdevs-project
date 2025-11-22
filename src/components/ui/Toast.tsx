import { cn } from "@/lib/utils";

import type { ToastMessage } from "@/lib/hooks/useToast";

interface ToastViewportProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const VARIANT_STYLES: Record<NonNullable<ToastMessage["variant"]>, { container: string; indicator: string }> = {
  success: {
    container: "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100",
    indicator: "bg-emerald-500",
  },
  error: {
    container: "border-destructive/40 bg-destructive/10 text-destructive",
    indicator: "bg-destructive",
  },
  info: {
    container: "border-primary/30 bg-primary/10 text-primary-foreground/80",
    indicator: "bg-primary",
  },
};

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-3 px-4 sm:items-end sm:px-6 md:bottom-6 md:right-6 md:left-auto">
      {toasts.map((toast) => {
        const variant = toast.variant ?? "info";
        const styles = VARIANT_STYLES[variant];

        return (
          <div
            key={toast.id}
            role="status"
            aria-live={variant === "error" ? "assertive" : "polite"}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-sm transition-all",
              styles.container
            )}
          >
            <span className={cn("mt-1 size-2.5 rounded-full", styles.indicator)} aria-hidden />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description ? <p className="text-sm/relaxed text-foreground/80">{toast.description}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rounded-full border border-current/40 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-foreground/70 transition hover:text-foreground"
            >
              Zamknij
            </button>
          </div>
        );
      })}
    </div>
  );
}

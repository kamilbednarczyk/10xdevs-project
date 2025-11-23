interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = "Ładowanie danych..." }: LoadingSpinnerProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-muted-foreground/40 px-6 py-16 text-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="h-12 w-12 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
        aria-hidden
      />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  );
}

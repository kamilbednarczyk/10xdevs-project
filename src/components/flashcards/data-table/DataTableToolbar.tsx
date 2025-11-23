export interface DataTableToolbarProps {
  total: number;
  isLoading: boolean;
}

export function DataTableToolbar({ total, isLoading }: DataTableToolbarProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-border/40 pb-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">Podsumowanie</p>
        <p className="mt-1 text-base text-foreground">
          Łącznie <span className="font-semibold">{total}</span> fiszek w kolekcji
        </p>
      </div>
      <p>{isLoading ? "Odświeżanie danych..." : "Dane aktualne."}</p>
    </div>
  );
}




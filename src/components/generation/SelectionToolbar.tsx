import { Button } from "@/components/ui/button";

interface SelectionToolbarProps {
  totalCount: number;
  selectedCount: number;
  isSaving: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

export function SelectionToolbar({
  totalCount,
  selectedCount,
  isSaving,
  onSelectAll,
  onClearSelection,
}: SelectionToolbarProps) {
  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
      <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
        Zaznaczone:{" "}
        <span className="font-semibold text-foreground">
          {selectedCount}/{totalCount}
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" disabled={isSaving} onClick={onSelectAll}>
          Zaznacz poprawne
        </Button>
        <Button variant="ghost" size="sm" disabled={isSaving || selectedCount === 0} onClick={onClearSelection}>
          Wyczyść wybór
        </Button>
      </div>
    </div>
  );
}

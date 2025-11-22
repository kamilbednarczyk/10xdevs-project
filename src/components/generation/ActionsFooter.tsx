import { Fragment } from "react";

import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";

interface ActionsFooterProps {
  totalCount: number;
  selectedCount: number;
  canSave: boolean;
  isSaving: boolean;
  onSave: () => void;
}

export function ActionsFooter({ totalCount, selectedCount, canSave, isSaving, onSave }: ActionsFooterProps) {
  const hasProposals = totalCount > 0;

  return (
    <CardFooter className="flex flex-col gap-4 rounded-b-2xl border-t border-border/60 bg-muted/10 px-6 py-5 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
      <div>
        {hasProposals ? (
          <Fragment>
            <p className="font-semibold text-foreground">
              Zaznaczono {selectedCount}/{totalCount} fiszek
            </p>
            <p>
              Upewnij się, że każda z nich ma poprawnie uzupełnione pola —{" "}
              <span className="font-medium text-foreground">błędy blokują zapis.</span>
            </p>
          </Fragment>
        ) : (
          <Fragment>
            <p className="font-semibold text-foreground">Brak zaznaczonych fiszek</p>
            <p>Wygeneruj i wybierz propozycje, aby aktywować zapis.</p>
          </Fragment>
        )}
      </div>
      <div className="w-full md:w-auto">
        <Button className="w-full md:min-w-48" disabled={!canSave || isSaving} onClick={onSave}>
          {isSaving ? "Zapisywanie..." : "Zapisz zaznaczone"}
        </Button>
      </div>
    </CardFooter>
  );
}

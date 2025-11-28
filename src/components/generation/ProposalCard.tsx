import { useId, useMemo } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

import { type FlashcardProposalViewModel, MAX_PROPOSAL_BACK_LENGTH, MAX_PROPOSAL_FRONT_LENGTH } from "./types";

interface ProposalCardProps {
  proposal: FlashcardProposalViewModel;
  onUpdate: (id: string, updates: Partial<FlashcardProposalViewModel>) => void;
  isDisabled?: boolean;
}

export function ProposalCard({ proposal, onUpdate, isDisabled = false }: ProposalCardProps) {
  const frontCharacters = proposal.front.length;
  const backCharacters = proposal.back.length;
  const frontErrorId = useId();
  const backErrorId = useId();

  const ariaLabel = useMemo(
    () => `Propozycja fiszki: ${proposal.front.slice(0, 32) || "Nowa fiszka"}`,
    [proposal.front]
  );

  return (
    <article
      aria-label={ariaLabel}
      data-testid="proposal-card"
      className="rounded-2xl border border-border/60 bg-card/80 px-5 py-4 shadow-sm transition hover:shadow-lg focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 md:px-6 md:py-5"
    >
      <div className="flex flex-col gap-5 md:grid md:grid-cols-[auto,minmax(0,1fr)] md:items-start md:gap-6">
        <Checkbox
          aria-label="Zaznacz fiszkę do zapisania"
          data-testid="proposal-checkbox"
          checked={proposal.isSelected}
          onChange={(event) => onUpdate(proposal.id, { isSelected: event.target.checked })}
          disabled={isDisabled}
          className="mt-2 shrink-0"
        />
        <div className="flex w-full flex-col gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Przód</span>
              <span>
                {frontCharacters}/{MAX_PROPOSAL_FRONT_LENGTH}
              </span>
            </div>
            <Input
              value={proposal.front}
              data-testid="proposal-front-input"
              onChange={(event) => onUpdate(proposal.id, { front: event.target.value })}
              placeholder="Pytanie, hasło lub pojęcie..."
              maxLength={MAX_PROPOSAL_FRONT_LENGTH}
              aria-invalid={Boolean(proposal.errors.front)}
              aria-describedby={proposal.errors.front ? frontErrorId : undefined}
              disabled={isDisabled}
            />
            {proposal.errors.front ? (
              <p id={frontErrorId} className="text-xs font-medium text-destructive" aria-live="assertive">
                {proposal.errors.front}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Tył</span>
              <span>
                {backCharacters}/{MAX_PROPOSAL_BACK_LENGTH}
              </span>
            </div>
            <Input
              value={proposal.back}
              data-testid="proposal-back-input"
              onChange={(event) => onUpdate(proposal.id, { back: event.target.value })}
              placeholder="Odpowiedź lub wyjaśnienie..."
              maxLength={MAX_PROPOSAL_BACK_LENGTH}
              aria-invalid={Boolean(proposal.errors.back)}
              aria-describedby={proposal.errors.back ? backErrorId : undefined}
              disabled={isDisabled}
            />
            {proposal.errors.back ? (
              <p id={backErrorId} className="text-xs font-medium text-destructive" aria-live="assertive">
                {proposal.errors.back}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

import { memo } from "react";

import { ProposalCard } from "./ProposalCard";
import type { FlashcardProposalViewModel } from "./types";

interface ProposalsListProps {
  proposals: FlashcardProposalViewModel[];
  onUpdateProposal: (id: string, updates: Partial<FlashcardProposalViewModel>) => void;
  isDisabled?: boolean;
}

function ProposalsListComponent({ proposals, onUpdateProposal, isDisabled = false }: ProposalsListProps) {
  if (proposals.length === 0) {
    return null;
  }

  return proposals.length ? (
    <div className="space-y-5">
      {proposals.map((proposal) => (
        <ProposalCard key={proposal.id} proposal={proposal} onUpdate={onUpdateProposal} isDisabled={isDisabled} />
      ))}
    </div>
  ) : null;
}

export const ProposalsList = memo(ProposalsListComponent);

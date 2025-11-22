export type GenerateFlashcardsStatus = "idle" | "loading" | "proposalsReady" | "saving" | "success";

export interface FlashcardProposalViewModel {
  id: string;
  front: string;
  back: string;
  isSelected: boolean;
  errors: {
    front?: string;
    back?: string;
  };
}

export interface GenerateFlashcardsViewModel {
  sourceText: string;
  status: GenerateFlashcardsStatus;
  proposals: FlashcardProposalViewModel[];
  generationId: number | null;
  error: string | null;
}

export const MIN_SOURCE_TEXT_LENGTH = 1000;
export const MAX_SOURCE_TEXT_LENGTH = 10000;
export const MAX_PROPOSAL_FRONT_LENGTH = 200;
export const MAX_PROPOSAL_BACK_LENGTH = 500;

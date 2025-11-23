import type { CreateFlashcardCommand, FlashcardResponseDTO } from "@/types";

import { FlashcardFormDialog } from "./FlashcardFormDialog";

export interface CreateFlashcardDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: CreateFlashcardCommand) => Promise<FlashcardResponseDTO | null>;
  isSubmitting?: boolean;
  onSuccess?: (flashcard: FlashcardResponseDTO) => void;
}

export function CreateFlashcardDialog({
  isOpen,
  onOpenChange,
  onCreate,
  isSubmitting,
  onSuccess,
}: CreateFlashcardDialogProps) {
  return (
    <FlashcardFormDialog
      mode="create"
      isOpen={isOpen}
      isSubmitting={isSubmitting}
      onOpenChange={onOpenChange}
      onSubmit={async ({ front, back }) => {
        const payload: CreateFlashcardCommand = {
          front,
          back,
          generation_type: "manual",
        };

        const created = await onCreate(payload);
        if (created) {
          onSuccess?.(created);
        }
        return Boolean(created);
      }}
    />
  );
}

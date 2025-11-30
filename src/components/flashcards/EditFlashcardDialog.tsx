import type { FlashcardResponseDTO, UpdateFlashcardCommand } from "@/types";

import { FlashcardFormDialog } from "./FlashcardFormDialog";

export interface EditFlashcardDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  flashcard: FlashcardResponseDTO | null;
  onUpdate: (id: string, payload: UpdateFlashcardCommand) => Promise<boolean>;
  isSubmitting?: boolean;
}

export function EditFlashcardDialog({
  isOpen,
  onOpenChange,
  flashcard,
  onUpdate,
  isSubmitting,
}: EditFlashcardDialogProps) {
  return (
    <FlashcardFormDialog
      mode="edit"
      isOpen={isOpen}
      isSubmitting={isSubmitting}
      initialValues={{
        front: flashcard?.front ?? "",
        back: flashcard?.back ?? "",
      }}
      onOpenChange={onOpenChange}
      onSubmit={async ({ front, back }) => {
        if (!flashcard) {
          return false;
        }

        return onUpdate(flashcard.id, { front, back });
      }}
    />
  );
}

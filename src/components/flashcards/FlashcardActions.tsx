import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { FlashcardResponseDTO, UpdateFlashcardCommand } from "@/types";

import { DeleteFlashcardDialog } from "./DeleteFlashcardDialog";
import { EditFlashcardDialog } from "./EditFlashcardDialog";

export interface FlashcardActionsProps {
  flashcard: FlashcardResponseDTO;
  onDelete: (id: string) => void;
  onUpdate: (id: string, payload: UpdateFlashcardCommand) => Promise<boolean>;
  isDeleting?: boolean;
  isUpdating?: boolean;
}

export function FlashcardActions({ flashcard, onDelete, onUpdate, isDeleting, isUpdating }: FlashcardActionsProps) {
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);

  const handleDelete = () => {
    onDelete(flashcard.id);
    setConfirmOpen(false);
  };

  return (
    <>
      <div className="flex items-center gap-1" data-testid="flashcard-actions">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Edytuj fiszkę"
          className="text-muted-foreground hover:text-primary"
          onClick={() => setEditOpen(true)}
          disabled={isUpdating || isDeleting}
          data-testid="flashcard-edit-button"
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Usuń fiszkę"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => setConfirmOpen(true)}
          disabled={isDeleting || isUpdating}
          data-testid="flashcard-delete-button"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <EditFlashcardDialog
        isOpen={isEditOpen}
        onOpenChange={setEditOpen}
        flashcard={flashcard}
        isSubmitting={isUpdating}
        onUpdate={onUpdate}
      />

      <DeleteFlashcardDialog
        isOpen={isConfirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleDelete}
        flashcardFront={flashcard.front}
        isDeleting={isDeleting}
      />
    </>
  );
}

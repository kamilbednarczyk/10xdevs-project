import { Fragment } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type { FlashcardResponseDTO, PaginationDTO, UpdateFlashcardCommand } from "@/types";

import { FlashcardCard } from "./FlashcardCard";
import { DataTablePagination } from "./data-table/DataTablePagination";

export interface FlashcardsListProps {
  data: FlashcardResponseDTO[];
  pagination: PaginationDTO | null;
  isLoading: boolean;
  deletingIds: Record<string, boolean>;
  updatingIds: Record<string, boolean>;
  onDelete: (id: string) => void;
  onUpdate: (id: string, payload: UpdateFlashcardCommand) => Promise<boolean>;
  onPageChange: (page: number) => void;
}
const SkeletonCard = () => (
  <div className="rounded-2xl border border-border/60 bg-card p-6">
    <Skeleton className="h-5 w-1/3" />
    <Skeleton className="mt-4 h-12 w-full" />
    <Skeleton className="mt-3 h-4 w-2/3" />
  </div>
);

export function FlashcardsList({
  data,
  pagination,
  isLoading,
  deletingIds,
  updatingIds,
  onDelete,
  onUpdate,
  onPageChange,
}: FlashcardsListProps) {
  const shouldShowSkeletons = isLoading && data.length === 0;

  return (
    <div className="space-y-5" data-testid="flashcards-list">
      {shouldShowSkeletons
        ? Array.from({ length: 3 }).map((_, index) => <SkeletonCard key={`skeleton-${index}`} />)
        : data.map((flashcard) => (
            <Fragment key={flashcard.id}>
              <FlashcardCard
                flashcard={flashcard}
                onDelete={onDelete}
                onUpdate={onUpdate}
                isDeleting={Boolean(deletingIds[flashcard.id])}
                isUpdating={Boolean(updatingIds[flashcard.id])}
              />
            </Fragment>
          ))}

      {pagination ? (
        <DataTablePagination
          pagination={pagination}
          isLoading={isLoading}
          onPageChange={onPageChange}
          className="pt-2"
        />
      ) : null}
    </div>
  );
}

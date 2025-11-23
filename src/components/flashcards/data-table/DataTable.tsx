import { Card } from "@/components/ui/card";
import type { FlashcardResponseDTO, PaginationDTO, UpdateFlashcardCommand } from "@/types";

import { DataTableContent } from "./DataTableContent";
import { DataTablePagination } from "./DataTablePagination";
import { DataTableToolbar } from "./DataTableToolbar";

export interface FlashcardsTableProps {
  data: FlashcardResponseDTO[];
  pagination: PaginationDTO | null;
  isLoading: boolean;
  deletingIds: Record<string, boolean>;
  updatingIds: Record<string, boolean>;
  onDelete: (id: string) => void;
  onUpdate: (id: string, payload: UpdateFlashcardCommand) => Promise<boolean>;
  onPageChange: (page: number) => void;
}

export function FlashcardsTable({
  data,
  pagination,
  isLoading,
  deletingIds,
  updatingIds,
  onDelete,
  onUpdate,
  onPageChange,
}: FlashcardsTableProps) {
  return (
    <Card className="border-border/60 bg-card p-6 shadow-sm">
      <DataTableToolbar total={pagination?.total ?? data.length} isLoading={isLoading} />
      <DataTableContent
        data={data}
        isLoading={isLoading}
        deletingIds={deletingIds}
        updatingIds={updatingIds}
        onDelete={onDelete}
        onUpdate={onUpdate}
      />
      <DataTablePagination pagination={pagination} isLoading={isLoading} onPageChange={onPageChange} className="mt-4" />
    </Card>
  );
}




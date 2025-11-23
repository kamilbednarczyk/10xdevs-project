import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PaginationDTO } from "@/types";

export interface DataTablePaginationProps {
  pagination: PaginationDTO | null;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  className?: string;
}

export function DataTablePagination({ pagination, isLoading, onPageChange, className }: DataTablePaginationProps) {
  if (!pagination) {
    return null;
  }

  const { page, total_pages: totalPages, total, limit } = pagination;
  const isFirstPage = page <= 1;
  const isLastPage = totalPages === 0 ? true : page >= totalPages;

  const handlePrev = () => {
    if (!isFirstPage) {
      onPageChange(page - 1);
    }
  };

  const handleNext = () => {
    if (!isLastPage) {
      onPageChange(page + 1);
    }
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  return (
    <div className={cn("flex flex-col gap-3 border-t border-border/30 pt-4 text-sm text-muted-foreground", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          Strona <span className="font-semibold text-foreground">{page}</span> z{" "}
          <span className="font-semibold text-foreground">{Math.max(totalPages, 1)}</span>
        </div>
        <div>
          Wiersze {rangeStart}-{rangeEnd} z <span className="font-semibold text-foreground">{total}</span>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handlePrev} disabled={isFirstPage || isLoading}>
          Poprzednia
        </Button>
        <Button variant="outline" size="sm" onClick={handleNext} disabled={isLastPage || isLoading}>
          Następna
        </Button>
      </div>
    </div>
  );
}




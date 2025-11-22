import { useCallback } from "react";

import { ErrorMessage } from "@/components/ui/ErrorMessage";

import { DashboardCard } from "./DashboardCard";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { useDueFlashcards } from "@/lib/hooks/useDueFlashcards";

export function DashboardClient() {
  const { data, isLoading, error } = useDueFlashcards();

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  if (isLoading) {
    return (
      <div className="flex w-full justify-center py-12">
        <DashboardSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex w-full justify-center py-12">
        <ErrorMessage
          title="Nie udało się załadować panelu"
          description="Wystąpił błąd podczas pobierania fiszek. Odśwież stronę i spróbuj ponownie."
          retryLabel="Odśwież"
          onRetry={handleReload}
        />
      </div>
    );
  }

  return (
    <div className="flex w-full justify-center py-12">
      <DashboardCard data={data} />
    </div>
  );
}

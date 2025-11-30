import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function FlashcardsLoadingPlaceholder() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl md:col-span-2" />
    </div>
  );
}

interface FlashcardsEmptyStateProps {
  onCreate: () => void;
}

export function FlashcardsEmptyState({ onCreate }: FlashcardsEmptyStateProps) {
  return (
    <Card className="border-dashed border-muted-foreground/40 bg-background/60 text-center shadow-none">
      <CardHeader>
        <CardTitle>Nie masz jeszcze żadnych fiszek</CardTitle>
        <CardDescription>
          Dodaj pierwszą fiszkę ręcznie lub wróć do generatora AI, aby zapełnić swoją kolekcję.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onCreate}>Dodaj pierwszą fiszkę</Button>
      </CardContent>
    </Card>
  );
}

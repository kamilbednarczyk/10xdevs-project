import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ErrorMessageProps {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({
  title = "Coś poszło nie tak",
  description = "Nie udało się pobrać danych. Spróbuj ponownie za chwilę.",
  retryLabel = "Spróbuj ponownie",
  onRetry,
  className,
}: ErrorMessageProps) {
  const handleRetry = useCallback(() => {
    if (!onRetry) {
      return;
    }

    onRetry();
  }, [onRetry]);

  return (
    <Card role="alert" aria-live="assertive" className={cn("w-full max-w-xl border-destructive/30", className)}>
      <CardHeader>
        <CardTitle className="text-destructive">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {onRetry ? (
        <CardContent>
          <Button variant="outline" onClick={handleRetry}>
            {retryLabel}
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}

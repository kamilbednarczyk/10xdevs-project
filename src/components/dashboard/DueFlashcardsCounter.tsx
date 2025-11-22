interface DueFlashcardsCounterProps {
  count: number;
}

export function DueFlashcardsCounter({ count }: DueFlashcardsCounterProps) {
  if (count <= 0) {
    return (
      <p className="text-base text-muted-foreground">
        Nie masz dziś zaplanowanych fiszek. Skorzystaj z chwili odpoczynku!
      </p>
    );
  }

  return (
    <p className="text-base font-medium text-foreground">
      Masz {count} {count === 1 ? "fiszkę" : "fiszek"} do powtórki.
    </p>
  );
}

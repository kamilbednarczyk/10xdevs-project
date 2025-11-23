import { Button } from "@/components/ui/button";
import type { SubmitReviewCommand } from "@/types";

interface ReviewControlsProps {
  onReview: (quality: SubmitReviewCommand["quality"]) => void | Promise<void>;
  isDisabled?: boolean;
}

const reviewOptions: {
  label: string;
  quality: SubmitReviewCommand["quality"];
  variant: "destructive" | "secondary" | "default";
  description: string;
}[] = [
  {
    label: "Nie pamiętam",
    quality: 1,
    variant: "destructive",
    description: "Jestem na początku nauki tej karty",
  },
  {
    label: "Pamiętam z trudem",
    quality: 3,
    variant: "secondary",
    description: "Odpowiedź wymagała wysiłku",
  },
  {
    label: "Pamiętam dobrze",
    quality: 5,
    variant: "default",
    description: "Pewna i szybka odpowiedź",
  },
];

export function ReviewControls({ onReview, isDisabled }: ReviewControlsProps) {
  return (
    <div className="grid w-full gap-4 md:grid-cols-3">
      {reviewOptions.map((option) => (
        <Button
          key={option.quality}
          type="button"
          variant={option.variant}
          size="lg"
          disabled={isDisabled}
          className="h-auto flex-col gap-1 py-4 text-base font-semibold"
          onClick={() => onReview(option.quality)}
        >
          {option.label}
          <span className="text-xs font-normal tracking-tight text-muted-foreground">{option.description}</span>
        </Button>
      ))}
    </div>
  );
}

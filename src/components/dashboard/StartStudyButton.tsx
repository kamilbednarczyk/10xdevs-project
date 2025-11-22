import { useCallback } from "react";

import { Button } from "@/components/ui/button";

interface StartStudyButtonProps {
  count: number;
}

export function StartStudyButton({ count }: StartStudyButtonProps) {
  const hasDueFlashcards = count > 0;

  const handleClick = useCallback(() => {
    if (!hasDueFlashcards) {
      return;
    }

    window.location.assign("/study");
  }, [hasDueFlashcards]);

  return (
    <Button onClick={handleClick} disabled={!hasDueFlashcards} className="w-full justify-center md:w-auto">
      Rozpocznij naukę
    </Button>
  );
}

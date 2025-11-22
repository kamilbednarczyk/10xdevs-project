import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import type { DashboardViewModel } from "./types";
import { DueFlashcardsCounter } from "./DueFlashcardsCounter";
import { StartStudyButton } from "./StartStudyButton";

interface DashboardCardProps {
  data: DashboardViewModel;
}

export function DashboardCard({ data }: DashboardCardProps) {
  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Stan nauki</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <DueFlashcardsCounter count={data.dueFlashcardsCount} />
        </div>
      </CardContent>
      <CardFooter>
        <StartStudyButton count={data.dueFlashcardsCount} />
      </CardFooter>
    </Card>
  );
}

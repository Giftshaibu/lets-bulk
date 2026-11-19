import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { TrainingChanges } from "@/features/training-changes";
import { InitialLoads, LoadOptions } from "@/features/settings-panel";
import { ArrowLeft } from "lucide-react";
export const Route = createFileRoute("/train/adjust")({ component: Page });
function Page() {
  return (
    <AppShell title="Adjust plan" subtitle="Optional changes, separate from your workout">
      <Link to="/train" className="mb-4 inline-flex min-h-11 items-center gap-2 font-bold">
        <ArrowLeft className="h-5 w-5" />
        Back to Train
      </Link>
      <p className="mb-4 text-sm">
        Use this screen to propose a plan change or enter the loads available at your gym. To learn
        an exercise or log sets, open Your workouts on Train.
      </p>
      <TrainingChanges />
      <InitialLoads />
      <LoadOptions />
    </AppShell>
  );
}

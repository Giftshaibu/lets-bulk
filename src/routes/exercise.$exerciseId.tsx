import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { useAppData } from "@/features/app-data";
import { ExerciseContent } from "@/features/exercise-guide";
import { WorkoutLogger } from "@/features/workout-logger";
export const Route = createFileRoute("/exercise/$exerciseId")({
  validateSearch: z.object({ workout: z.string().optional() }),
  component: Page,
});
function Page() {
  const { exerciseId } = Route.useParams(),
    { workout } = Route.useSearch(),
    { data } = useAppData();
  const exercise = data.exerciseLibrary.find((e) => e.id === exerciseId),
    w = data.workoutLibrary?.find((w) => w.id === workout),
    planned = w?.exercises.find((e) => e.id === exerciseId);
  if (
    data.session?.status === "in_progress" &&
    data.workout.exercises.some((e) => e.id === exerciseId)
  )
    return (
      <WorkoutLogger key={`${data.session.id}:${exerciseId}`} initialExerciseId={exerciseId} />
    );
  return (
    <main className="mx-auto flex h-dvh max-w-2xl flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b-2 bg-card p-4">
        {workout ? (
          <Link
            to="/workout/$workoutId"
            params={{ workoutId: workout }}
            aria-label="Back to workout"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        ) : (
          <Link
            to="/train"
            aria-label="Back to Train"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        )}
        <h1 className="text-xl font-black">{exercise?.name ?? "Exercise unavailable"}</h1>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {planned && (
          <p className="mb-4 rounded-2xl bg-[#FFF6E8] p-4 font-black">
            {planned.targetSets} sets · {planned.targetReps} reps · rest {planned.restSeconds}s
          </p>
        )}
        <ExerciseContent id={exerciseId} />
      </div>
      {w && (
        <footer className="shrink-0 border-t-2 bg-card p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <Link
            to="/workout/$workoutId"
            params={{ workoutId: w.id }}
            className="press block rounded-2xl border-2 border-b-4 border-primary-shadow bg-primary p-4 text-center font-black text-white"
          >
            Open workout to start logging
          </Link>
        </footer>
      )}
    </main>
  );
}

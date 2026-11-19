import { WorkoutLogger } from "@/features/workout-logger";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, ChunkyButton } from "@/components/kit";
import { useAppData } from "@/features/app-data";
import { WorkoutMascot } from "@/features/mascot-feedback";
export const Route = createFileRoute("/train/active")({
  head: () => ({
    meta: [
      { title: "Active workout — Chiuli Training Companion" },
      {
        name: "description",
        content: "Log every set with weight, reps and RIR, rest between sets and finish strong.",
      },
      { property: "og:title", content: "Active workout — Chiuli" },
      { property: "og:description", content: "Set-by-set logging with a built-in rest timer." },
    ],
  }),
  component: ActiveWorkout,
});

function ActiveWorkout() {
  const { data, act, pending } = useAppData();
  if (!data.workout.exercises.length)
    return (
      <div className="mx-auto max-w-lg p-5">
        <Card>
          <h1 className="text-xl font-bold">Rest day</h1>
          <Link to="/train" className="underline">
            Back to training
          </Link>
        </Card>
      </div>
    );
  if (!data.session || data.session.status === "abandoned")
    return (
      <div className="mx-auto max-w-lg p-5">
        <Card>
          <h1 className="mb-3 text-xl font-bold">{data.workout.title}</h1>
          <WorkoutMascot />
          <p className="mb-3">
            Your sets will be saved as you log them. Enter a comfortable starting load for each
            exercise.
          </p>
          <ChunkyButton
            disabled={pending}
            onClick={() => void act("/api/workout-sessions", { templateId: data.workout.id })}
          >
            Start workout
          </ChunkyButton>
          <Link to="/train" className="ml-3 underline">
            Back
          </Link>
        </Card>
      </div>
    );
  return <WorkoutLogger key={data.session.id} />;
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useAppData, api } from "@/features/app-data";
import { ExerciseThumbnail } from "@/features/exercise-guide";
import { BottomSheet } from "@/components/bottom-sheet";
import { ChunkyButton } from "@/components/kit";
import type { workoutLibrary } from "@/lib/services/dashboard.service";
export const Route = createFileRoute("/workout/$workoutId")({ component: Page });
function Page() {
  const { workoutId } = Route.useParams(),
    { data, act, pending } = useAppData(),
    navigate = useNavigate();
  const [confirm, setConfirm] = useState(false),
    [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["workout-detail", data.rawProfile?.user_id, workoutId],
    queryFn: () => api<ReturnType<typeof workoutLibrary>[number]>(`/api/workouts/${workoutId}`),
  });
  const w = query.data ?? data.workoutLibrary?.find((w) => w.id === workoutId);
  async function start(allowUnscheduled: boolean) {
    setError("");
    if (await act("/api/workout-sessions", { templateId: workoutId, allowUnscheduled })) {
      setConfirm(false);
      void navigate({ to: "/train/active" });
    } else
      setError(
        "Could not start this workout. Check equipment and your current plan, then try again.",
      );
  }
  const running = data.session?.status === "in_progress",
    scheduled = w?.dayOfWeek === new Date(`${data.date}T12:00:00Z`).getUTCDay();
  return (
    <main className="mx-auto flex h-dvh max-w-2xl flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b-2 bg-card p-4">
        <Link
          to="/train"
          aria-label="Back to Train"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-black">{w?.title ?? "Your workout"}</h1>
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {!w ? (
          <p role="status">
            {query.isError
              ? "This workout is unavailable. Return to Train and choose a current workout."
              : "Loading workout…"}
          </p>
        ) : (
          <>
            <p className="rounded-2xl bg-[#FFF6E8] p-4 text-sm font-bold">
              {
                ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
                  w.dayOfWeek
                ]
              }{" "}
              · {w.estimatedMinutes} min · {w.exercises.length} exercises. Tap an exercise to see
              how it’s done.
            </p>
            {w.exercises.map((e) => {
              const ex = data.exerciseLibrary.find((x) => x.id === e.id);
              return (
                <Link
                  key={e.id}
                  to="/exercise/$exerciseId"
                  params={{ exerciseId: e.id }}
                  search={{ workout: workoutId }}
                  className="press flex items-center gap-3 rounded-3xl border-2 border-b-4 border-[#FFD699] bg-card p-3"
                >
                  <ExerciseThumbnail slug={ex?.slug ?? ""} name={e.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-black">{e.name}</span>
                    <span className="my-1 block text-sm font-bold">
                      {e.targetSets} sets · {e.targetReps} reps
                    </span>
                    <span className="text-xs font-bold text-primary">Demo & form cues</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-primary" />
                </Link>
              );
            })}
            {!w.equipmentAvailable && (
              <p role="alert" className="rounded-2xl bg-danger-soft p-4 font-bold">
                Some equipment is unavailable. Update your equipment or review compatible
                replacements in Adjust plan.
              </p>
            )}
            <Link
              to="/train/adjust"
              className="inline-flex min-h-11 items-center font-bold text-primary"
            >
              Adjust plan & gym loads
            </Link>
            {error && (
              <p role="alert" className="font-bold">
                {error}
              </p>
            )}
          </>
        )}
      </div>
      {w && (
        <footer className="shrink-0 border-t-2 bg-card p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          {running ? (
            <Link to="/train/active">
              <ChunkyButton full>Resume active workout</ChunkyButton>
            </Link>
          ) : w.sessionStatus === "completed" ? (
            <p className="text-center font-black text-success">
              Completed today · your sets are saved
            </p>
          ) : (
            <ChunkyButton
              type="button"
              full
              disabled={pending || !w.equipmentAvailable || !w.current || !w.exercises.length}
              onClick={() => (scheduled ? void start(false) : setConfirm(true))}
            >
              {pending ? "Starting…" : scheduled ? "Start workout" : "Start one-off session"}
            </ChunkyButton>
          )}
        </footer>
      )}
      <BottomSheet title="Train today?" open={confirm} onOpenChange={setConfirm}>
        <p className="mb-4 font-bold">
          Start {w?.title} today as a one-off session? Your normal weekly schedule stays unchanged.
        </p>
        {error && (
          <p role="alert" className="mb-3 font-bold">
            {error}
          </p>
        )}
        <ChunkyButton type="button" full disabled={pending} onClick={() => void start(true)}>
          {pending ? "Starting…" : "Start one-off session"}
        </ChunkyButton>
      </BottomSheet>
    </main>
  );
}

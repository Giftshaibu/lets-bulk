import { createFileRoute, Link } from "@tanstack/react-router";
import { Dumbbell, ChevronRight, CalendarDays, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, ChunkyButton, Pill } from "@/components/kit";
import { useAppData } from "@/features/app-data";
import { WorkoutMascot } from "@/features/mascot-feedback";
export const Route = createFileRoute("/train/")({ component: TrainPage });
function TrainPage() {
  const { data } = useAppData(),
    { workout } = data;
  const library = data.workoutLibrary ?? [],
    day = new Date(`${data.date}T12:00:00Z`).getUTCDay();
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const next = [...library]
    .filter((w) => w.current)
    .sort((a, b) => ((a.dayOfWeek - day + 7) % 7 || 7) - ((b.dayOfWeek - day + 7) % 7 || 7))[0];
  const missing = data.trainingStatus === "missing_program" && !workout.id;
  return (
    <AppShell
      title="Train"
      subtitle={`${data.date} · ${data.rawProfile?.timezone ?? "Africa/Blantyre"}`}
    >
      <div className="grid gap-4">
        <Card tone="primary">
          <p className="mb-2 text-xs font-black uppercase tracking-wide">Today</p>
          <WorkoutMascot />
          <div className="flex items-start justify-between gap-3">
            <h2 className="min-w-0 text-2xl font-black">
              {missing ? "Your training plan needs attention" : workout.title}
            </h2>
            {!missing && <Pill>{workout.estimatedMinutes} min</Pill>}
          </div>
          <p className="my-3 text-sm font-bold">
            {missing
              ? "We couldn’t find a current workout plan. Review your training settings to repair your schedule."
              : data.session?.status === "in_progress"
                ? "Your saved session is ready to resume."
                : !workout.id
                  ? `No workout is scheduled for ${names[day]}. Recover today, or choose a one-off session below. Your weekly plan stays the same.`
                  : data.session?.status === "completed"
                    ? "Today’s session is complete. Your sets are saved."
                    : "Your saved training plan for today."}
          </p>
          {missing ? (
            <Link to="/settings">
              <ChunkyButton full>Review training settings</ChunkyButton>
            </Link>
          ) : workout.id ? (
            <Link to="/workout/$workoutId" params={{ workoutId: workout.id }}>
              <ChunkyButton full>
                {data.session?.status === "in_progress" ? "Resume workout" : "View workout"}
                <ChevronRight className="h-5 w-5" />
              </ChunkyButton>
            </Link>
          ) : null}
        </Card>
        {next && (
          <Card>
            <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              Next scheduled session
            </p>
            <Link
              to="/workout/$workoutId"
              params={{ workoutId: next.id }}
              className="flex min-h-12 items-center justify-between gap-3 font-black"
            >
              <span>
                {next.title} · {names[next.dayOfWeek]}
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-primary" />
            </Link>
          </Card>
        )}
        <section aria-label="Your workouts">
          <h2 className="mb-3 text-xl font-black">Your workouts</h2>
          <div className="grid gap-3">
            {library.map((w) => (
              <Link
                key={w.id}
                to="/workout/$workoutId"
                params={{ workoutId: w.id }}
                className="press flex min-h-24 items-center gap-3 rounded-3xl border-2 border-b-4 border-[#FFD699] bg-[#FFF6E8] p-4"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
                  <Dumbbell className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-black">{w.title}</span>
                  <span className="block text-sm font-bold">
                    {names[w.dayOfWeek]} · {w.exercises.length} exercises · {w.estimatedMinutes} min
                  </span>
                  <span className="text-xs font-bold text-primary">
                    View demonstrations and session
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0" />
              </Link>
            ))}
          </div>
        </section>
        <Link
          to="/train/adjust"
          className="press flex min-h-16 items-center gap-3 rounded-2xl border-2 border-b-4 border-[#E3CBB5] bg-[#FAF3EC] p-4 font-black"
        >
          <SlidersHorizontal className="h-6 w-6 shrink-0" />
          <span className="flex-1">Adjust plan & gym loads</span>
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>
    </AppShell>
  );
}

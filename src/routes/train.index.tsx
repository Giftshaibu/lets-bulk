import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BigStat, Card, ChunkyButton, Pill, SectionTitle } from "@/components/kit";
import { useAppData } from "@/features/app-data";
import { LoadOptions, InitialLoads } from "@/features/tracking-forms";

export const Route = createFileRoute("/train/")({
  head: () => ({
    meta: [
      { title: "Train — Gift Bulk Training Companion" },
      {
        name: "description",
        content:
          "See today's workout, your week schedule and recent strength gains, then start training.",
      },
      { property: "og:title", content: "Train — Gift Bulk Training Companion" },
      {
        property: "og:description",
        content: "Today's session, week plan and recent lift progress.",
      },
    ],
  }),
  component: TrainPage,
});

function TrainPage() {
  const { data } = useAppData();
  const { workout, schedule, lifts } = data;

  return (
    <AppShell title="Train" subtitle={workout.dayLabel}>
      <div className="flex flex-col gap-4">
        <Card tone="primary">
          <SectionTitle>Today's session</SectionTitle>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[24px] leading-tight font-extrabold">{workout.title}</div>
              <div className="text-[14px] font-bold text-ink-soft">{workout.focus}</div>
            </div>
            <Pill tone="primary">{workout.estimatedMinutes} min</Pill>
          </div>

          <ul className="mt-4 flex flex-col gap-2">
            {workout.exercises.map((e) => (
              <li
                key={e.id}
                className="rounded-2xl border-2 border-b-4 border-border bg-card px-3 py-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-extrabold">{e.name}</span>
                  <span className="text-[14px] font-extrabold text-muted-foreground">
                    {e.targetSets} × {e.targetReps}
                  </span>
                </div>
                <div className="mt-0.5 text-[12px] font-bold text-muted-foreground">
                  Last time: {e.lastTime} · rest {e.restSeconds}s
                </div>
                <p className="mt-2 text-sm font-bold">{e.nextTarget}</p>
              </li>
            ))}
          </ul>

          {workout.exercises.length > 0 && data.session?.status !== "completed" && (
            <Link to="/train/active" className="mt-4 block">
              <ChunkyButton full>
                {data.session?.status === "in_progress" ? "Resume workout" : "Start workout"}
              </ChunkyButton>
            </Link>
          )}
          {data.session?.status === "completed" && (
            <p className="mt-3 font-bold">Workout completed and saved.</p>
          )}
          <InitialLoads />
          <LoadOptions />
        </Card>

        <Card>
          <SectionTitle>This week</SectionTitle>
          <div className="grid grid-cols-7 gap-1.5">
            {schedule.map((d) => (
              <div
                key={d.day}
                className={`flex flex-col items-center gap-1 rounded-xl border-2 border-b-4 px-1 py-2 text-center ${
                  d.state === "done"
                    ? "border-success bg-success-soft"
                    : d.state === "today"
                      ? "border-primary bg-primary-soft"
                      : d.state === "rest"
                        ? "border-border bg-muted"
                        : "border-border bg-card"
                }`}
              >
                <span className="text-[10px] font-extrabold text-muted-foreground">{d.day}</span>
                <span className="text-[10px] leading-tight font-extrabold">{d.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>Recent strength</SectionTitle>
          <div className="flex flex-col gap-2">
            {lifts.map((l) => (
              <div
                key={l.id}
                className={`flex items-center justify-between rounded-2xl border-2 border-b-4 px-4 py-3 ${
                  l.pr ? "border-special bg-special-soft" : "border-border bg-card"
                }`}
              >
                <div>
                  <div className="text-[15px] font-extrabold">{l.name}</div>
                  <div className="text-[12px] font-bold text-muted-foreground">
                    +{(l.currentKg - l.startKg).toFixed(1)} kg since week 1
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {l.pr && <Trophy className="h-5 w-5 text-special-ink" strokeWidth={2.6} />}
                  <BigStat value={l.currentKg} suffix="kg" label="Top set" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

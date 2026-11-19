import { units, massFromKg, massToKg, massLabel, massText } from "@/lib/domain/units";
import { TargetExplanation } from "@/features/target-explanation";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  Dumbbell,
  Scale,
  Utensils,
  Moon,
  Zap,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Bar, BigStat, Card, ChunkyButton, Pill, SectionTitle } from "@/components/kit";
import { useAppData } from "@/features/app-data";
import { DailyForms } from "@/features/tracking-forms";
import { MacroTiles, NutritionMascot, XpSummary } from "@/features/quest-ui";
import { Mascot } from "@/components/mascot";
import { StreakMascot } from "@/features/mascot-feedback";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — Chiuli Training Companion" },
      {
        name: "description",
        content:
          "Your daily bulking dashboard: calories, protein, today's workout, recovery and weight trend in one place.",
      },
      { property: "og:title", content: "Today — Chiuli Training Companion" },
      {
        property: "og:description",
        content: "Daily calories, protein, training and recovery at a glance.",
      },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const { data } = useAppData();
  const {
    targets,
    meals,
    eaten,
    workout,
    recovery,
    todayWeight: weight,
    recommendation: rec,
  } = data;
  const mass = units(data.preferences).mass;
  const series = data.weight.series;
  const nextMeal = meals.find((m) => !m.logged);
  const today = new Date(`${data.date}T12:00:00+02:00`).toLocaleDateString("en-GB", {
    timeZone: "Africa/Blantyre",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const icons = [Scale, Utensils, Dumbbell, Moon, Zap];
  const tasks = data.tasks.map((t, i) => ({ ...t, icon: icons[i]! }));
  const doneCount = data.completion.completed;

  return (
    <AppShell title="Today" subtitle={today}>
      <div className="flex flex-col gap-4">
        <StreakMascot />
        <Card>
          <div className="flex items-end justify-between">
            <BigStat
              value={`${doneCount}/${data.completion.required}`}
              label="Today’s quests"
              tone="primary"
            />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Mascot
                expression={
                  data.completion.dayCompleted ? "happy" : doneCount ? "confident" : "thinking"
                }
                variant="face"
                className="h-8 w-8"
                interactive
              />
              <Pill tone={data.completion.dayCompleted ? "success" : "primary"}>
                {data.completion.dayCompleted ? "Crushed it" : "In progress"}
              </Pill>
            </div>
          </div>
          <XpSummary />
          <Bar className="mt-3" value={doneCount} max={data.completion.required} />
          <div
            role="list"
            aria-label="Quest checklist"
            className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5"
          >
            {tasks.map((t) => (
              <div
                key={t.label}
                role="listitem"
                title={t.required ? "Required today" : "Optional today"}
                className={`flex min-w-0 min-h-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-b-4 px-1 py-2 ${
                  t.done ? "border-success bg-success-soft" : "border-border bg-card"
                }`}
              >
                {t.done ? (
                  <Check className="h-5 w-5 text-success" strokeWidth={3} />
                ) : (
                  <t.icon className="h-5 w-5 text-faint" strokeWidth={2.6} />
                )}
                <span className="w-full break-words text-center text-[10px] font-extrabold tracking-wide whitespace-normal text-ink-soft uppercase">
                  {t.label}
                </span>
                {!t.required && (
                  <span className="w-full break-words text-center text-[9px] font-bold text-muted-foreground">
                    Optional
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Next action */}
        <Card tone="primary">
          <SectionTitle>Next action</SectionTitle>
          {!weight.logged && data.completionPolicy.weight ? (
            <NextAction
              title="Step on the scale"
              body="A consistent weigh-in builds your trend. First log of the day earns 50 XP."
              cta="Log weight (+50 XP)"
              to="/progress"
            />
          ) : nextMeal ? (
            <NextAction
              title={`${nextMeal.title} — ${nextMeal.targetKcal} kcal`}
              body={`Due around ${nextMeal.time}. Hit this and you're on pace.`}
              cta="Log meal"
              to="/food"
            />
          ) : (
            <NextAction
              title={workout.title}
              body={`${workout.exercises.length} exercises · about ${workout.estimatedMinutes} min`}
              cta="Start workout"
              to="/train"
            />
          )}
        </Card>

        {/* Nutrition */}
        <Card>
          <SectionTitle
            action={
              <div className="flex items-center gap-2">
                <NutritionMascot />
                <Link
                  to="/food"
                  className="inline-flex min-h-10 items-center gap-1 rounded-full bg-primary/10 px-3 text-[13px] font-extrabold text-primary uppercase"
                >
                  Food <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            }
          >
            Nutrition
          </SectionTitle>
          <div className="flex items-end justify-between">
            <BigStat value={eaten.kcal.toLocaleString()} label="Calories eaten" />
            <div className="text-right">
              <div className="text-[18px] font-extrabold text-muted-foreground">
                {Math.max(targets.kcal - eaten.kcal, 0).toLocaleString()}
              </div>
              <div className="text-[11px] font-extrabold tracking-wide text-muted-foreground uppercase">
                Left
              </div>
            </div>
          </div>
          <Bar className="mt-3" value={eaten.kcal} max={targets.kcal} />
          <TargetExplanation />
          <MacroTiles />
        </Card>

        {/* Workout */}
        <Card>
          <SectionTitle>Today's training</SectionTitle>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[20px] font-extrabold">
                {data.trainingStatus === "missing_program"
                  ? "Review your training plan"
                  : workout.title}
              </div>
              <div className="text-[14px] font-bold text-muted-foreground">{workout.focus}</div>
            </div>
            <Pill tone="primary">{workout.estimatedMinutes} min</Pill>
          </div>
          <ul className="mt-3 flex flex-col gap-1.5">
            {workout.exercises.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-[14px] font-bold"
              >
                <span>{e.name}</span>
                <span className="text-muted-foreground">
                  {e.targetSets} × {e.targetReps}
                </span>
              </li>
            ))}
          </ul>
          <Link to="/train" className="mt-4 block">
            <ChunkyButton full>
              {data.session?.status === "in_progress"
                ? "Resume workout"
                : workout.id
                  ? "View workout"
                  : "Browse workouts"}
            </ChunkyButton>
          </Link>
        </Card>

        <DailyForms />
        {/* Recovery */}
        <Card>
          <SectionTitle>Recovery</SectionTitle>
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
            <div className="rounded-xl border-2 border-b-4 border-info bg-info-soft p-3">
              <BigStat value={recovery.sleepHours} suffix="h" label="Sleep" />
            </div>
            <div className="rounded-xl border-2 border-b-4 border-success bg-success-soft p-3">
              <BigStat value={recovery.soreness} label="Soreness" tone="success" />
            </div>
            <div className="rounded-xl border-2 border-b-4 border-reward bg-reward-soft p-3">
              <div className="flex flex-wrap gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Zap
                    key={i}
                    className={`h-5 w-5 ${i <= recovery.energy ? "text-reward-ink" : "text-faint"}`}
                    strokeWidth={2.8}
                  />
                ))}
              </div>
              <div className="mt-2 text-[12px] font-extrabold tracking-[0.1em] text-muted-foreground uppercase">
                Energy
              </div>
            </div>
          </div>
        </Card>

        {/* Weight trend */}
        <Card>
          <SectionTitle
            action={
              <Link
                to="/progress"
                className="inline-flex min-h-10 items-center gap-1 rounded-full bg-primary/10 px-3 text-[13px] font-extrabold text-primary uppercase"
              >
                Details <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            }
          >
            Weight trend
          </SectionTitle>
          <div className="flex items-end justify-between">
            <BigStat
              value={series.at(-1) ? Number(massFromKg(series.at(-1)!.kg, mass).toFixed(1)) : "—"}
              suffix={mass}
              label="Latest"
            />
            <Pill tone="success">{massLabel(data.weight.gained, mass)}</Pill>
          </div>
          {!series.length ? (
            <div className="mt-3 flex items-center gap-3">
              <Mascot expression="thinking" variant="face" className="h-10 w-10" interactive />
              <p className="text-sm font-bold">
                Your first weigh-in starts the story. Log once to begin.
              </p>
            </div>
          ) : (
            <Sparkline points={series.map((p) => p.kg)} />
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function NextAction({
  title,
  body,
  cta,
  to,
}: {
  title: string;
  body: string;
  cta: string;
  to: "/food" | "/train" | "/progress";
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-[20px] leading-tight font-extrabold">{title}</div>
        <Mascot expression="confident" className="h-20 w-20" interactive hero />
      </div>
      <p className="mt-1 text-[14px] font-bold text-ink-soft">{body}</p>
      <Link to={to} className="mt-4 block">
        <ChunkyButton full>
          {cta} <ArrowRight className="h-5 w-5" strokeWidth={3} />
        </ChunkyButton>
      </Link>
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
  if (!points.length) return <p className="mt-3 text-sm">Log your weight to begin your trend.</p>;
  const min = Math.min(...points) - 0.4;
  const max = Math.max(...points) + 0.4;
  const w = 300;
  const h = 70;
  const d = points
    .map((p, i) => {
      const x = (i / Math.max(points.length - 1, 1)) * w;
      const y = h - ((p - min) / (max - min)) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      role="img"
      aria-label="Weight history"
      viewBox={`0 0 ${w} ${h}`}
      className="mt-3 h-[70px] w-full"
      preserveAspectRatio="none"
    >
      <path d={d} fill="none" stroke="var(--primary)" strokeWidth={4} strokeLinecap="round" />
    </svg>
  );
}

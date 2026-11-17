import { ExerciseGuide } from "@/features/exercise-guide";
import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, ChevronLeft, Minus, Plus, Timer, Trophy, X } from "lucide-react";
import { BigStat, Card, ChunkyButton, Pill, SectionTitle } from "@/components/kit";
import { useAppData } from "@/features/app-data";
import type { SetEntry } from "@/lib/data/types";

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
function WorkoutLogger() {
  const navigate = useNavigate();
  const { data, act, pending } = useAppData();
  const workout = data.workout;
  const [exercises, setExercises] = useState(() =>
    workout.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) })),
  );
  const [index, setIndex] = useState(0);
  const [rest, setRest] = useState<number | null>(null);
  const finished = data.session?.status === "completed";

  const exercise = exercises[index]!;
  const totalSets = exercises.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);

  useEffect(() => {
    if (rest === null) return;
    if (rest <= 0) {
      setRest(null);
      return;
    }
    const t = setTimeout(() => setRest((r) => (r === null ? null : r - 1)), 1000);
    return () => clearTimeout(t);
  }, [rest]);

  function updateSet(setId: string, patch: Partial<SetEntry>) {
    setExercises((prev) =>
      prev.map((e, i) =>
        i === index
          ? { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }
          : e,
      ),
    );
  }

  async function completeSet(set: SetEntry) {
    const setNumber = exercise.sets.findIndex((s) => s.id === set.id) + 1;
    if (
      await act("/api/sets", {
        sessionId: data.session!.id,
        exerciseId: exercise.id,
        setNumber,
        weight: set.weight,
        reps: set.reps,
        rir: set.rir,
        done: true,
      })
    ) {
      updateSet(set.id, { done: true });
      setRest(exercise.restSeconds);
    }
  }
  async function resetSet(set: SetEntry) {
    const setNumber = exercise.sets.findIndex((s) => s.id === set.id) + 1;
    const saved = data.workout.exercises.find((e) => e.id === exercise.id)?.sets[setNumber - 1];
    if (saved && (await act(`/api/sets/${saved.id}`, undefined, "DELETE")))
      updateSet(set.id, { done: false });
  }

  const exerciseDone = exercise.sets.every((s) => s.done);

  if (finished) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[640px] flex-col justify-center gap-4 px-4 py-8">
        <Card tone="success" className="text-center">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2 border-b-4 border-success bg-card">
            <Trophy className="h-10 w-10 text-success" strokeWidth={2.6} />
          </div>
          <h1 className="text-[30px] font-extrabold">Workout complete</h1>
          <p className="mt-1 text-[15px] font-bold text-ink-soft">
            {workout.title} — logged and banked.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-card p-3">
              <BigStat value={doneSets} label="Sets" tone="success" />
            </div>
            <div className="rounded-xl bg-card p-3">
              <BigStat
                value={Math.round(data.sessionSummary?.volume ?? 0).toLocaleString()}
                suffix="kg"
                label="Volume"
              />
            </div>
            <div className="rounded-xl bg-card p-3">
              <BigStat
                value={Math.round((data.session?.duration_seconds ?? 0) / 60)}
                suffix="m"
                label="Time"
              />
            </div>
          </div>
        </Card>
        <Link to="/">
          <ChunkyButton full tone="success">
            Back to today
          </ChunkyButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-40">
      <header className="sticky top-0 z-30 border-b-2 border-border bg-card px-4 py-3">
        <div className="mx-auto flex max-w-[640px] items-center gap-3">
          <button
            aria-label="Leave workout"
            onClick={() => navigate({ to: "/train" })}
            className="rounded-xl border-2 border-border p-2"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={3} />
          </button>
          <div className="flex-1">
            <div className="text-[14px] font-extrabold">{workout.title}</div>
            <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${(doneSets / totalSets) * 100}%` }}
              />
            </div>
          </div>
          <span className="text-[14px] font-extrabold text-muted-foreground">
            {doneSets}/{totalSets}
          </span>
        </div>
      </header>

      <main className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 py-4">
        <Card tone={exerciseDone ? "success" : "default"}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[12px] font-extrabold tracking-[0.12em] text-muted-foreground uppercase">
                Exercise {index + 1} of {exercises.length}
              </div>
              <h1 className="text-[24px] leading-tight font-extrabold">{exercise.name}</h1>
              <ExerciseGuide id={exercise.id} />
              <p className="mt-2 text-sm">
                RIR means reps in reserve: how many more good repetitions you could have done. RIR 2
                means about two left. Stop before your form breaks.
              </p>
              <div className="text-[13px] font-bold text-muted-foreground">
                {exercise.muscle} · target {exercise.targetSets} × {exercise.targetReps} · last{" "}
                {exercise.lastTime}
              </div>
            </div>
            {exerciseDone && <Check className="h-7 w-7 text-success" strokeWidth={3} />}
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          {exercise.sets.map((set, i) => (
            <Card key={set.id} tone={set.done ? "success" : "default"}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-extrabold tracking-[0.12em] text-muted-foreground uppercase">
                  Set {i + 1}
                </span>
                {set.done ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone="success">
                      {set.weight}kg × {set.reps}
                    </Pill>
                    <button
                      disabled={pending}
                      className="min-h-11 text-sm font-bold underline"
                      onClick={() => void resetSet(set)}
                    >
                      Edit / remove saved set
                    </button>
                  </div>
                ) : (
                  <Pill>RIR {set.rir}</Pill>
                )}
              </div>

              {!set.done && (
                <>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Stepper
                      label="Weight"
                      value={set.weight}
                      suffix="kg"
                      step={2.5}
                      onChange={(v) => updateSet(set.id, { weight: Math.max(0, v) })}
                    />
                    <Stepper
                      label="Reps"
                      value={set.reps}
                      step={1}
                      onChange={(v) => updateSet(set.id, { reps: Math.max(0, v) })}
                    />
                    <Stepper
                      label="RIR"
                      value={set.rir}
                      step={1}
                      onChange={(v) => updateSet(set.id, { rir: Math.min(5, Math.max(0, v)) })}
                    />
                  </div>
                  <ChunkyButton
                    disabled={pending}
                    full
                    className="mt-3"
                    onClick={() => void completeSet(set)}
                  >
                    <Check className="h-5 w-5" strokeWidth={3} /> Complete set
                  </ChunkyButton>
                </>
              )}
            </Card>
          ))}
        </div>

        {exerciseDone && (
          <ChunkyButton
            full
            tone="success"
            disabled={pending}
            onClick={() => {
              if (index + 1 < exercises.length) {
                setIndex(index + 1);
                setRest(null);
              } else {
                void act(`/api/workout-sessions/${data.session!.id}/complete`, {});
              }
            }}
          >
            {index + 1 < exercises.length ? "Next exercise" : "Finish workout"}
          </ChunkyButton>
        )}

        <button
          disabled={pending}
          className="min-h-11 text-sm font-bold underline"
          onClick={async () => {
            if (await act(`/api/workout-sessions/${data.session!.id}/abandon`, {}))
              void navigate({ to: "/train" });
          }}
        >
          End without completing
        </button>
        <SectionTitle>Up next</SectionTitle>
        <div className="flex flex-col gap-2">
          {exercises.map((e, i) => (
            <button
              key={e.id}
              onClick={() => setIndex(i)}
              className={`flex items-center justify-between rounded-2xl border-2 border-b-4 px-4 py-3 text-left ${
                i === index ? "border-primary bg-primary-soft" : "border-border bg-card"
              }`}
            >
              <span className="text-[14px] font-extrabold">{e.name}</span>
              <span className="text-[13px] font-extrabold text-muted-foreground">
                {e.sets.filter((s) => s.done).length}/{e.sets.length}
              </span>
            </button>
          ))}
        </div>
      </main>

      {rest !== null && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-info bg-info-soft px-4 py-3">
          <div className="mx-auto flex max-w-[640px] items-center gap-3">
            <Timer className="h-6 w-6 text-info-shadow" strokeWidth={2.8} />
            <div className="flex-1">
              <div className="text-[12px] font-extrabold tracking-[0.12em] text-info-shadow uppercase">
                Rest
              </div>
              <div className="text-[26px] leading-none font-extrabold text-info-shadow">
                {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}
              </div>
            </div>
            <ChunkyButton size="sm" tone="info" onClick={() => setRest((r) => (r ?? 0) + 30)}>
              +30s
            </ChunkyButton>
            <button
              aria-label="Skip rest"
              onClick={() => setRest(null)}
              className="rounded-xl border-2 border-info bg-card p-2.5"
            >
              <X className="h-5 w-5 text-info-shadow" strokeWidth={3} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
  step,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-border bg-muted p-2 text-center">
      <div className="text-[11px] font-extrabold tracking-[0.1em] text-muted-foreground uppercase">
        {label}
      </div>
      <div className="my-1 text-[22px] leading-none font-extrabold">
        <input
          aria-label={label}
          className="w-20 bg-transparent text-center outline-none"
          type="number"
          min={0}
          step={step === 1 ? 1 : "any"}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix ? <span className="text-[13px]">{suffix}</span> : null}
      </div>
      <div className="flex gap-1.5">
        <button
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(value - step)}
          className="press flex min-h-[40px] flex-1 items-center justify-center rounded-xl border-2 border-b-4 border-border bg-card"
        >
          <Minus className="h-4 w-4" strokeWidth={3} />
        </button>
        <button
          aria-label={`Increase ${label}`}
          onClick={() => onChange(value + step)}
          className="press flex min-h-[40px] flex-1 items-center justify-center rounded-xl border-2 border-b-4 border-border bg-card"
        >
          <Plus className="h-4 w-4" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}

import type { Snapshot } from "../repositories/app.repository";
import { average, exerciseVolume, estimatedStrength, totalReps } from "../domain/engines";
import { getCurrentWeekRange } from "../domain/dates";
export function exerciseHistory(
  s: Snapshot,
  plan: Snapshot["planned"][number],
  until: string,
  excludeSession?: string,
) {
  const ids = new Set(
    s.planned
      .filter((p) => p.lineage_id === plan.lineage_id && p.exercise_id === plan.exercise_id)
      .map((p) => p.workout_template_id),
  );
  return s.sessions
    .filter(
      (ss) =>
        ss.status === "completed" &&
        ss.session_date <= until &&
        ss.id !== excludeSession &&
        ids.has(ss.workout_template_id),
    )
    .sort(
      (a, b) =>
        a.session_date.localeCompare(b.session_date) || a.started_at.localeCompare(b.started_at),
    )
    .slice(-6)
    .map((ss) =>
      s.sets.filter((es) => es.workout_session_id === ss.id && es.exercise_id === plan.exercise_id),
    );
}
export function trainingAnalytics(s: Snapshot, today: string) {
  const completed = s.sessions.filter(
    (ss) => ss.status === "completed" && ss.session_date <= today,
  );
  const bySessionExercise = new Map<string, Snapshot["sets"]>();
  for (const set of s.sets) {
    if (!set.is_completed || set.is_warmup) continue;
    const key = `${set.workout_session_id}:${set.exercise_id}`,
      rows = bySessionExercise.get(key) ?? [];
    rows.push(set);
    bySessionExercise.set(key, rows);
  }
  const week = getCurrentWeekRange(today),
    muscles = new Map<
      string,
      { muscle: string; sets: number; reps: number; volume: number; rir: number[] }
    >();
  const performance = s.exercises.flatMap((e) => {
    const history = completed.flatMap((ss) => {
      const sets = bySessionExercise.get(`${ss.id}:${e.id}`) ?? [];
      if (!sets.length) return [];
      const rir = average(sets.flatMap((es) => (es.rir === null ? [] : [es.rir])));
      if (ss.session_date >= week.start) {
        const muscle = muscles.get(e.primary_muscle) ?? {
          muscle: e.primary_muscle,
          sets: 0,
          reps: 0,
          volume: 0,
          rir: [],
        };
        muscle.sets += sets.length;
        muscle.reps += totalReps(sets);
        muscle.volume += exerciseVolume(sets);
        muscle.rir.push(...sets.flatMap((es) => (es.rir === null ? [] : [es.rir])));
        muscles.set(e.primary_muscle, muscle);
      }
      return [
        {
          sessionId: ss.id,
          date: ss.session_date,
          topWeight: Math.max(...sets.map((es) => es.weight_kg)),
          totalReps: totalReps(sets),
          volume: exerciseVolume(sets),
          averageRir: rir,
          estimated1RM: Math.max(
            0,
            ...sets.map((es) => estimatedStrength(es.weight_kg, es.reps) ?? 0),
          ),
        },
      ];
    });
    if (!history.length) return [];
    const recent = history.at(-1)!,
      previous = history.at(-2);
    return [
      {
        exerciseId: e.id,
        name: e.name,
        history,
        recent,
        rirChange:
          recent.averageRir !== null &&
          previous?.averageRir !== null &&
          previous?.averageRir !== undefined
            ? recent.averageRir - previous.averageRir
            : null,
      },
    ];
  });
  return {
    week,
    weeklyMuscles: [...muscles.values()].map((m) => ({
      ...m,
      averageRir: average(m.rir),
      rir: undefined,
    })),
    performance,
  };
}
export function exerciseLoadConfig(s: Snapshot, exercise: Snapshot["exercises"][number]) {
  const specific = s.loads.filter((l) => l.exercise_id === exercise.id),
    options = specific.length
      ? specific
      : s.loads.filter((l) => !l.exercise_id && l.equipment_type === exercise.equipment);
  return {
    options,
    increment: specific.length
      ? Math.min(...specific.map((l) => l.increment_kg))
      : (exercise.progression_increment_kg ?? 2.5),
  };
}

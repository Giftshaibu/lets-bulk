import { round } from "./numbers";
export type WorkingSet = {
  weight_kg: number;
  reps: number;
  rir: number | null;
  is_completed: boolean;
  is_warmup?: boolean;
};
export const workingSets = (sets: WorkingSet[]) =>
  sets.filter((s) => s.is_completed && !s.is_warmup);
export const exerciseVolume = (sets: WorkingSet[]) =>
  workingSets(sets).reduce((n, s) => n + s.weight_kg * s.reps, 0);
export const totalReps = (sets: WorkingSet[]) => workingSets(sets).reduce((n, s) => n + s.reps, 0);
export const estimatedStrength = (weight: number, reps: number) =>
  reps > 0 && reps <= 12 ? weight * (1 + reps / 30) : null;
export type LoadOption = { increment_kg: number; minimum_kg: number; maximum_kg: number };
export function getNextUsableLoad(current: number, desired: number, options: LoadOption[]) {
  const loads = options
    .map((o) => {
      const steps = Math.max(
        0,
        Math.ceil((current + desired - o.minimum_kg - 1e-8) / o.increment_kg),
      );
      return round(o.minimum_kg + steps * o.increment_kg, 3);
    })
    .filter((load, i) => load > current && load <= options[i]!.maximum_kg);
  return loads.length ? Math.min(...loads) : null;
}
export function evaluateProgression(
  history: WorkingSet[][],
  plan: {
    sets: number;
    rep_min: number;
    rep_max: number;
    target_rir: number | null;
    planned_weight_kg: number;
  },
  options: LoadOption[],
) {
  const sets = workingSets(history.at(-1) ?? []);
  const comparable = history.filter(
    (h) =>
      workingSets(h).length === plan.sets &&
      workingSets(h).every((s) => s.weight_kg === plan.planned_weight_kg),
  );
  if (
    comparable.length < 2 ||
    sets.length !== plan.sets ||
    sets.some(
      (s) => s.weight_kg !== plan.planned_weight_kg || s.reps < plan.rep_min || s.rir === null,
    )
  )
    return { type: "collect_data", nextLoad: null, totalReps: totalReps(sets) };
  const eligible = sets.every((s) => s.reps >= plan.rep_max && s.rir! >= (plan.target_rir ?? 2));
  const nextLoad = eligible ? getNextUsableLoad(plan.planned_weight_kg, 2.5, options) : null;
  return {
    type: nextLoad !== null ? "load" : "reps",
    nextLoad,
    totalReps: totalReps(sets),
    plateau: detectPlateau(comparable),
  };
}
export function detectPlateau(history: WorkingSet[][]) {
  if (history.length < 3) return false;
  const last = history.slice(-3);
  const baseline = totalReps(last[0]!);
  return (
    last.every(
      (h) =>
        workingSets(h).length === workingSets(last[0]!).length &&
        workingSets(h).every((s, i) => s.weight_kg === workingSets(last[0]!)[i]!.weight_kg),
    ) && last.every((h) => totalReps(h) <= baseline)
  );
}

export function nextSessionTarget(
  history: WorkingSet[][],
  plan: {
    sets: number;
    rep_min: number;
    rep_max: number;
    target_rir: number | null;
    planned_weight_kg: number;
  },
  options: LoadOption[],
) {
  const previous = workingSets(history.at(-1) ?? []);
  if (!previous.length)
    return `Confirm a starting load; aim for ${plan.sets} × ${plan.rep_min}–${plan.rep_max}.`;
  const decision = evaluateProgression(history, plan, options);
  if (decision.nextLoad !== null)
    return `Ready for review: ${decision.nextLoad} kg. Keep the current plan until accepted.`;
  if (previous.every((s) => s.reps >= plan.rep_max))
    return "Keep the current load; review progression and your usable gym loads.";
  return `Keep ${plan.planned_weight_kg} kg; aim to beat ${totalReps(previous)} total working reps with controlled technique.`;
}

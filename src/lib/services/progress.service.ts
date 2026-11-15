import type { Snapshot } from "../repositories/app.repository";
import { calibrateMaintenance, weightProjection } from "../domain/calibration";
import { calculateWeightTrend } from "../domain/weight";
import { addDays } from "../domain/dates";
import { average } from "../domain/numbers";
export function progressAnalysis(s: Snapshot, today: string) {
  const intake = Array.from({ length: 28 }, (_, i) => addDays(today, -1 - i)).flatMap((date) => {
    const logs = new Set(s.logs.filter((l) => l.date === date).map((l) => l.id)),
      items = s.items.filter((i) => logs.has(i.nutrition_log_id));
    const target = [...s.targets]
      .reverse()
      .find((t) => t.effective_from <= date && (!t.effective_to || t.effective_to >= date));
    return items.length && target
      ? [
          {
            date,
            calories: items.reduce((n, i) => n + i.calories, 0),
            target: target.calories_target,
          },
        ]
      : [];
  });
  const trend = calculateWeightTrend(s.weights, today),
    latest = [...s.weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.weight_kg ?? null;
  const weeks = Array.from({ length: 4 }, (_, i) => {
    const end = addDays(today, -i * 7),
      start = addDays(end, -6),
      logs = s.weights.filter((w) => w.date >= start && w.date <= end);
    return { start, end, count: logs.length, average: average(logs.map((w) => w.weight_kg)) };
  }).reverse();
  return {
    maintenance: calibrateMaintenance(s.weights, intake, today),
    projections: weightProjection(latest, trend.change),
    weeklyAverages: weeks,
    projectionReason:
      trend.change === null
        ? "At least three weigh-ins per comparison week are needed."
        : "If the recent observed weekly change continued; this is not a promised result or a target rate.",
  };
}

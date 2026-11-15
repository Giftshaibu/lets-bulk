import { addDays } from "./dates";
import { average, clamp, round } from "./numbers";
import { RULES } from "./config";
export type WeightLog = { date: string; weight_kg: number };
export function calculateWeeklyAverage(weights: WeightLog[], start: string, end: string) {
  const unique = new Map(
    weights.filter((w) => w.date >= start && w.date <= end).map((w) => [w.date, w.weight_kg]),
  );
  return { count: unique.size, average: average([...unique.values()]) };
}
export function calculateWeightTrend(weights: WeightLog[], end: string) {
  const current = calculateWeeklyAverage(weights, addDays(end, -6), end);
  const previous = calculateWeeklyAverage(weights, addDays(end, -13), addDays(end, -7));
  const enough = current.count >= RULES.minWeighIns && previous.count >= RULES.minWeighIns;
  const change = enough ? current.average! - previous.average! : null;
  return {
    current,
    previous,
    change,
    percent: change !== null ? (change / previous.average!) * 100 : null,
    status:
      change === null
        ? "insufficient_data"
        : change < RULES.gainMin
          ? "below_target"
          : change > RULES.gainMax
            ? "above_target"
            : "on_target",
  };
}
export function projectWeight(current: number, weeklyChange: number | null, weeks: number) {
  return weeklyChange === null ? null : round(current + weeklyChange * weeks);
}
export function estimateMaintenance(
  intake: number,
  weeklyChange: number,
  days: number,
  completeness: number,
) {
  return days < 21 || completeness < 0.85
    ? null
    : {
        calories: Math.round(intake - (weeklyChange * 7700) / 7),
        confidence: clamp(completeness * Math.min(days / 28, 1)),
      };
}

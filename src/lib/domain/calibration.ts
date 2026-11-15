import { addDays, daysBetween } from "./dates";
import { average, clamp, round } from "./numbers";
import type { WeightLog } from "./weight";
import { RULES } from "./config";
export function calibrateMaintenance(
  weights: WeightLog[],
  intake: { date: string; calories: number; target: number }[],
  today: string,
) {
  // Use completed days only; today's partial intake must not bias maintenance.
  const end = addDays(today, -1),
    start = addDays(end, -27);
  const observed = [
    ...new Map(
      weights.filter((w) => w.date >= start && w.date <= end).map((w) => [w.date, w]),
    ).values(),
  ];
  const nutrition = [
    ...new Map(
      intake
        .filter((n) => n.date >= start && n.date <= end && n.calories >= n.target * 0.8)
        .map((n) => [n.date, n]),
    ).values(),
  ];
  const dates = observed.map((w) => w.date).sort();
  const days = dates.length ? daysBetween(dates[0]!, dates.at(-1)!) + 1 : 0;
  if (
    nutrition.length < RULES.maintenanceMinDays ||
    observed.length < RULES.maintenanceMinWeighIns ||
    days < RULES.maintenanceMinDays ||
    !dates.length ||
    daysBetween(dates.at(-1)!, end) > 3
  )
    return {
      available: false as const,
      reason:
        "Needs 21 substantially logged food days, 10 weigh-ins and at least 21 days of observations.",
      calories: null,
      confidence: 0,
    };
  const points = observed.map((w) => ({ x: daysBetween(start, w.date), y: w.weight_kg })),
    meanX = average(points.map((p) => p.x))!,
    meanY = average(points.map((p) => p.y))!;
  const spread = points.reduce((n, p) => n + (p.x - meanX) ** 2, 0);
  if (!spread)
    return {
      available: false as const,
      reason: "Spread weigh-ins across the observation period.",
      calories: null,
      confidence: 0,
    };
  const slope = points.reduce((n, p) => n + (p.x - meanX) * (p.y - meanY), 0) / spread,
    calories = Math.round(average(nutrition.map((n) => n.calories))! - slope * 7700);
  const residual = average(points.map((p) => Math.abs(p.y - (meanY + slope * (p.x - meanX)))))!;
  const confidence = clamp(
    (nutrition.length / 28) * Math.min(observed.length / 14, 1) * clamp(1 - residual / 2),
  );
  if (calories < 500 || calories > 10000 || confidence < 0.5)
    return {
      available: false as const,
      reason: "The observed data is too variable for a useful maintenance estimate.",
      calories: null,
      confidence,
    };
  return {
    available: true as const,
    reason:
      "Approximation from substantially logged intake and observed weight change; not a measured metabolic rate.",
    calories,
    confidence,
    weeklyChange: round(slope * 7, 2),
    observationDays: days,
  };
}
export function weightProjection(current: number | null, weeklyChange: number | null) {
  return [4, 8, 12].map((weeks) => ({
    weeks,
    kg: current === null || weeklyChange === null ? null : round(current + weeklyChange * weeks, 1),
  }));
}

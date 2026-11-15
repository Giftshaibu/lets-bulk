import { daysBetween, addDays } from "./dates";
import { calculateWeeklyAverage, calculateWeightTrend, type WeightLog } from "./weight";
export function weightSummary(weights: WeightLog[], today: string) {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const trend = calculateWeightTrend(weights, today);
  return {
    gained: sorted.length > 1 ? sorted.at(-1)!.weight_kg - sorted[0]!.weight_kg : 0,
    perWeek: trend.change,
    status: trend.status,
    series: sorted.map((w) => ({
      date: w.date,
      kg: w.weight_kg,
      trend: calculateWeeklyAverage(weights, addDays(w.date, -6), w.date).average ?? w.weight_kg,
    })),
    days: sorted.length ? daysBetween(sorted[0]!.date, today) : 0,
  };
}

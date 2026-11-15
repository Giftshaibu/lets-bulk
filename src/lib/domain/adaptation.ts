import { addDays } from "./dates";
import { clamp, average } from "./numbers";
import { RULES } from "./config";
import { calculateCalorieAdherence, calculateProteinAdherence } from "./nutrition";
import { calculateWeightTrend, type WeightLog } from "./weight";
export function calculateCompleteness(
  counts: {
    weight: number;
    nutrition: number;
    recovery: number;
    workouts: number;
    expectedWorkouts: number;
  },
  days = 14,
) {
  return (
    (clamp(counts.weight / days) +
      clamp(counts.nutrition / days) +
      clamp(counts.recovery / days) +
      (counts.expectedWorkouts ? clamp(counts.workouts / counts.expectedWorkouts) : 1)) /
    4
  );
}
export type WeekInput = {
  weights: WeightLog[];
  end: string;
  nutrition: {
    date: string;
    calories: number;
    protein: number;
    targetCalories: number;
    targetProtein: number;
  }[];
  recovery: { date: string; score: number }[];
  workouts: number;
  expectedWorkouts: number;
};
export function analyseWeek(input: WeekInput) {
  const start = addDays(input.end, -13);
  const weights = input.weights.filter((w) => w.date >= start && w.date <= input.end);
  const nutrition = input.nutrition.filter((n) => n.date >= start && n.date <= input.end);
  const recovery = input.recovery.filter((r) => r.date >= start && r.date <= input.end);
  const completeness = calculateCompleteness({
    weight: weights.length,
    nutrition: nutrition.length,
    recovery: recovery.length,
    workouts: input.workouts,
    expectedWorkouts: input.expectedWorkouts,
  });
  // Include missing days as zero adherence: partial history must not inflate compliance.
  const calorieAdherence =
    nutrition.reduce((a, n) => a + calculateCalorieAdherence(n.calories, n.targetCalories), 0) / 14;
  const proteinAdherence =
    nutrition.reduce((a, n) => a + calculateProteinAdherence(n.protein, n.targetProtein), 0) / 14;
  const recoveryScore = average(recovery.map((r) => r.score));
  const trend = calculateWeightTrend(weights, input.end);
  const confidence = clamp(
    completeness * Math.min(weights.length / 10, 1) * Math.min(nutrition.length / 12, 1),
  );
  const workoutAdherence = input.expectedWorkouts
    ? clamp(input.workouts / input.expectedWorkouts)
    : 1;
  const blocks: string[] = [];
  if (confidence < RULES.minCompleteness)
    blocks.push("Collect at least two consistent weeks of weight, food and recovery logs.");
  if (trend.change === null) blocks.push("Log at least three weigh-ins in each comparison week.");
  if (calorieAdherence < RULES.minAdherence || proteinAdherence < RULES.minAdherence)
    blocks.push("Improve calorie and protein adherence before increasing targets.");
  if (workoutAdherence < RULES.minWorkoutAdherence)
    blocks.push("Complete and log more of your scheduled workouts.");
  let type = "keep_current_plan",
    reason = "Keep collecting consistent logs before changing your plan.",
    delta = 0;
  if (confidence >= RULES.minCompleteness && trend.change !== null) {
    if (calorieAdherence < RULES.minAdherence || proteinAdherence < RULES.minAdherence)
      reason = "Improve nutrition adherence before changing your targets.";
    else if (recoveryScore === null || recoveryScore < 50) {
      type = "recovery_action";
      reason =
        "Recovery needs attention. Keep nutrition stable and evaluate sleep and training stress.";
    } else if (workoutAdherence < RULES.minWorkoutAdherence)
      reason = "Improve workout adherence before changing the plan.";
    else if (trend.status === "below_target" || trend.status === "above_target") {
      type = "nutrition_adjustment";
      delta = trend.status === "below_target" ? RULES.calorieStep : -RULES.calorieStep;
      reason = "Consistent intake and weekly averages support a small calorie adjustment.";
    } else reason = "Weight is within the configured gain range. Keep your current nutrition plan.";
  }
  return {
    completeness,
    confidence,
    calorieAdherence,
    proteinAdherence,
    workoutAdherence,
    blocks,
    recoveryScore,
    trend,
    type,
    reason,
    delta,
  };
}

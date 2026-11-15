import type { Snapshot, Db } from "../repositories/app.repository";
import type { Json } from "../db/database.types";
import { addDays, getPreviousWeekRange } from "../domain/dates";
import { analyseWeek, evaluateProgression, foodCost } from "../domain/engines";
import { result } from "./errors";
export function buildReview(s: Snapshot, today: string) {
  const period = getPreviousWeekRange(today),
    start = addDays(period.end, -13);
  const days = Array.from({ length: 14 }, (_, i) => addDays(start, i));
  const active = s.targets.find((t) => t.effective_to === null)!;
  const nutrition = days.flatMap((date) => {
    const logs = s.logs.filter((l) => l.date === date);
    const items = s.items.filter((i) => logs.some((l) => l.id === i.nutrition_log_id));
    if (!items.length) return [];
    const target = [...s.targets]
      .reverse()
      .find((t) => t.effective_from <= date && (!t.effective_to || t.effective_to >= date));
    if (!target) return [];
    return [
      {
        date,
        calories: items.reduce((a, i) => a + i.calories, 0),
        protein: items.reduce((a, i) => a + i.protein_g, 0),
        targetCalories: target.calories_target,
        targetProtein: target.protein_target_g,
      },
    ];
  });
  const currentProgram = s.programs.find((p) => p.effective_to === null);
  const expected = days.reduce((count, date) => {
    const program = [...s.programs]
      .reverse()
      .find((p) => p.effective_from <= date && (!p.effective_to || p.effective_to >= date));
    const weekIds = s.weeks.filter((w) => w.training_program_id === program?.id).map((w) => w.id);
    return (
      count +
      s.templates.filter(
        (t) =>
          weekIds.includes(t.program_week_id) &&
          t.day_of_week === new Date(`${date}T12:00:00Z`).getUTCDay(),
      ).length
    );
  }, 0);
  const completed = s.sessions.filter(
    (ss) => ss.status === "completed" && ss.session_date >= start && ss.session_date <= period.end,
  );
  const analysis = analyseWeek({
    weights: s.weights,
    end: period.end,
    nutrition,
    recovery: s.recovery.map((r) => ({ date: r.date, score: r.recovery_score })),
    workouts: completed.length,
    expectedWorkouts: expected,
  });
  const recommendations: {
    type: string;
    title: string;
    reason: string;
    currentValue?: number;
    recommendedValue?: number;
    unit?: string;
    payload?: Record<string, string>;
  }[] = [
    {
      type: analysis.type,
      title: analysis.delta
        ? `${analysis.delta > 0 ? "Add" : "Reduce"} ${Math.abs(analysis.delta)} kcal per day`
        : analysis.type === "recovery_action"
          ? "Review your recovery"
          : "Keep your current plan",
      reason: analysis.reason,
      ...(analysis.delta && active
        ? {
            currentValue: active.calories_target,
            recommendedValue: Math.max(500, active.calories_target + analysis.delta),
            unit: "kcal",
            payload: { targetId: active.id },
          }
        : {}),
    },
  ];
  if (
    analysis.confidence >= 0.7 &&
    analysis.calorieAdherence >= 0.9 &&
    analysis.proteinAdherence >= 0.9 &&
    (analysis.recoveryScore ?? 0) >= 75 &&
    analysis.trend.status === "on_target"
  ) {
    const weeks = s.weeks
        .filter((w) => w.training_program_id === currentProgram?.id)
        .map((w) => w.id),
      templates = s.templates.filter((t) => weeks.includes(t.program_week_id)).map((t) => t.id);
    for (const plan of s.planned.filter((p) => templates.includes(p.workout_template_id))) {
      const exercise = s.exercises.find((e) => e.id === plan.exercise_id)!;
      const history = s.sessions
        .filter(
          (ss) =>
            ss.status === "completed" &&
            ss.workout_template_id === plan.workout_template_id &&
            ss.session_date <= period.end,
        )
        .slice(-4)
        .map((ss) =>
          s.sets.filter(
            (es) => es.workout_session_id === ss.id && es.exercise_id === plan.exercise_id,
          ),
        );
      const options = s.loads.filter(
        (l) =>
          l.exercise_id === exercise.id ||
          (!l.exercise_id && l.equipment_type === exercise.equipment),
      );
      const progression = evaluateProgression(history, plan, options);
      if (progression.type === "load" && progression.nextLoad !== null) {
        recommendations.push({
          type: "exercise_load_progression",
          title: `${exercise.name}: try ${progression.nextLoad} kg`,
          reason:
            "All working sets reached the top of the rep range with the target RIR. This load matches your saved equipment options.",
          currentValue: plan.planned_weight_kg,
          recommendedValue: progression.nextLoad,
          unit: "kg",
          payload: { programId: currentProgram!.id, templateExerciseId: plan.id },
        });
        break;
      }
      if (progression.plateau) {
        recommendations.push({
          type: "recovery_action",
          title: `Review ${exercise.name} plateau`,
          reason:
            "Three comparable sessions show no rep improvement. Review recovery, technique and adherence before changing training stress.",
        });
        break;
      }
    }
  }
  return { period, analysis, recommendations };
}
export async function saveReview(db: Db, s: Snapshot, today: string) {
  const { period, analysis, recommendations } = buildReview(s, today);
  return result(
    db.rpc("save_review", {
      p_start: period.start,
      p_end: period.end,
      p_analysis: analysis as unknown as Json,
      p_recommendations: recommendations as unknown as Json,
    }),
  );
}
export function budgetSuggestions(s: Snapshot) {
  const prices = s.prices.filter(
    (p, i, all) => all.findIndex((q) => q.food_id === p.food_id) === i,
  );
  return prices
    .flatMap((p) => {
      const f = s.foods.find((f) => f.id === p.food_id);
      return f ? [{ food: f, price: p, cost: foodCost(p.price_mwk, p.quantity, f) }] : [];
    })
    .sort((a, b) => (a.cost.per25gProtein ?? Infinity) - (b.cost.per25gProtein ?? Infinity));
}
export function budgetSummary(s: Snapshot, today: string) {
  const latest = s.prices.filter(
    (p, i, all) => all.findIndex((q) => q.food_id === p.food_id) === i,
  );
  const priceMap = new Map(latest.map((p) => [p.food_id, p.price_mwk / p.quantity]));
  const totals = (start: string, end: string) => {
    const ids = new Set(s.logs.filter((l) => l.date >= start && l.date <= end).map((l) => l.id));
    const items = s.items.filter((i) => ids.has(i.nutrition_log_id));
    return {
      knownCost: Math.round(
        items.reduce((n, i) => n + (priceMap.get(i.food_id) ?? 0) * i.grams, 0),
      ),
      missingPrices: items.filter((i) => !priceMap.has(i.food_id)).length,
    };
  };
  const daily = totals(today, today),
    weekly = totals(addDays(today, -6), today);
  const loggedDays = new Set(
    s.logs
      .filter(
        (l) =>
          l.date >= addDays(today, -6) &&
          l.date <= today &&
          s.items.some((i) => i.nutrition_log_id === l.id),
      )
      .map((l) => l.date),
  ).size;
  return {
    currency: "MWK",
    daily,
    weekly,
    estimatedMonthlyCost:
      loggedDays && weekly.missingPrices === 0
        ? Math.round((weekly.knownCost / loggedDays) * 30)
        : null,
    loggedDays,
  };
}
export function substitutions(s: Snapshot, foodId: string, grams: number) {
  const original = s.foods.find((f) => f.id === foodId);
  if (!original?.calories_per_100g || original.protein_per_100g === null) return [];
  const prices = budgetSuggestions(s),
    diet = s.preferences?.diet_type;
  const targetProtein = (original.protein_per_100g * grams) / 100,
    targetCalories = (original.calories_per_100g * grams) / 100;
  return s.foods
    .filter((f) => {
      if (
        f.id === foodId ||
        !f.calories_per_100g ||
        f.protein_per_100g === null ||
        f.availability === "unavailable"
      )
        return false;
      const animal = ["meat", "fish"].includes(f.category),
        egg = /egg|mazira/i.test(f.name);
      if (diet === "vegan" && (animal || egg || f.category === "dairy")) return false;
      if (diet === "vegetarian" && animal) return false;
      return true;
    })
    .flatMap((f) => {
      const amount =
        targetProtein >= 10 && f.protein_per_100g! > 0
          ? (targetProtein / f.protein_per_100g!) * 100
          : (targetCalories / f.calories_per_100g!) * 100;
      if (amount < 5 || amount > 1000) return [];
      const calories = (f.calories_per_100g! * amount) / 100,
        protein = (f.protein_per_100g! * amount) / 100,
        p = prices.find((p) => p.food.id === f.id);
      return [
        {
          food: f,
          grams: Math.round(amount),
          calories: Math.round(calories),
          protein: Math.round(protein),
          cost: p ? Math.round((p.price.price_mwk / p.price.quantity) * amount) : null,
          proteinGap: Math.abs(protein - targetProtein) / Math.max(targetProtein, 1),
          calorieGap: Math.abs(calories - targetCalories) / Math.max(targetCalories, 1),
        },
      ];
    })
    .sort(
      (a, b) =>
        a.proteinGap - b.proteinGap ||
        a.calorieGap - b.calorieGap ||
        Number(b.food.common_in_malawi) - Number(a.food.common_in_malawi) ||
        (a.cost ?? Infinity) - (b.cost ?? Infinity),
    );
}

import { describe, it, expect } from "vitest";
import { addDays } from "../src/lib/domain/dates";
import { calibrateMaintenance, weightProjection } from "../src/lib/domain/calibration";
import { evaluateProgression } from "../src/lib/domain/training";
import { calculateDailyCompletion } from "../src/lib/domain/streaks";
import { settings, completionPolicySchema } from "../src/lib/validation/schemas";
import {
  exerciseHistory,
  trainingAnalytics,
  exerciseLoadConfig,
} from "../src/lib/services/training.service";
import { budgetSummary, buildReview } from "../src/lib/services/review.service";
import { substituteCandidates, requestedChange } from "../src/lib/services/recommendation.service";
import type { Snapshot } from "../src/lib/repositories/app.repository";
const today = "2026-11-15";
function fixture(overrides: Record<string, unknown> = {}): Snapshot {
  return {
    profile: null,
    preferences: { diet_type: "omnivore" },
    targets: [],
    foods: [],
    prices: [],
    meals: [],
    mealItems: [],
    logs: [],
    items: [],
    programs: [
      { id: "pg", version: 1, effective_from: "2026-01-01", effective_to: null, phase: "base" },
    ],
    weeks: [{ id: "w", training_program_id: "pg" }],
    templates: [
      {
        id: "old",
        name: "Upper A",
        program_week_id: "w",
        day_of_week: 0,
        sort_order: 0,
        lineage_id: "workout-stream",
      },
      {
        id: "new",
        name: "Upper A",
        program_week_id: "w",
        day_of_week: 0,
        sort_order: 1,
        lineage_id: "workout-stream",
      },
    ],
    planned: [
      {
        id: "p-old",
        workout_template_id: "old",
        exercise_id: "ex",
        lineage_id: "stream",
        sets: 3,
        rep_min: 8,
        rep_max: 12,
        target_rir: 2,
        planned_weight_kg: 40,
      },
      {
        id: "p-new",
        workout_template_id: "new",
        exercise_id: "ex",
        lineage_id: "stream",
        sets: 3,
        rep_min: 8,
        rep_max: 12,
        target_rir: 2,
        planned_weight_kg: 40,
      },
    ],
    exercises: [
      {
        id: "ex",
        name: "Bench",
        equipment: "barbell",
        primary_muscle: "Chest",
        progression_increment_kg: 2.5,
      },
    ],
    sessions: [],
    sets: [],
    weights: [],
    recovery: [],
    water: [],
    measurements: [],
    photos: [],
    checkins: [],
    reviews: [],
    recommendations: [],
    loads: [],
    equipment: [
      { equipment_type: "bodyweight", is_available: true },
      { equipment_type: "barbell", is_available: true },
    ],
    ...overrides,
  } as unknown as Snapshot;
}
describe("expanded domain and service behavior", () => {
  it("does not add load while comparable performance is declining", () => {
    const s = fixture(),
      sets = (reps: number) =>
        Array.from({ length: 3 }, () => ({ weight_kg: 40, reps, rir: 2, is_completed: true }));
    const result = evaluateProgression([sets(15), sets(12)], s.planned[0]!, [
      { minimum_kg: 0, maximum_kg: 100, increment_kg: 2.5 },
    ]);
    expect(result.nextLoad).toBeNull();
    expect(result.declining).toBe(true);
  });

  it("uses confirmed exercise increments and prioritizes specific load options", () => {
    const s = fixture({
      loads: [
        {
          exercise_id: null,
          equipment_type: "barbell",
          increment_kg: 2.5,
          minimum_kg: 20,
          maximum_kg: 200,
        },
        {
          exercise_id: "ex",
          equipment_type: "barbell",
          increment_kg: 1,
          minimum_kg: 20,
          maximum_kg: 100,
        },
      ],
    });
    const c = exerciseLoadConfig(s, s.exercises[0]!);
    expect(c.increment).toBe(1);
    expect(c.options).toHaveLength(1);
    const sets = Array.from({ length: 3 }, () => ({
      weight_kg: 40,
      reps: 12,
      rir: 2,
      is_completed: true,
    }));
    expect(
      evaluateProgression(
        [sets, sets],
        { ...s.planned[0]!, progression_increment_kg: c.increment },
        c.options,
      ).nextLoad,
    ).toBe(41);
  });
  it("retains history across versions while a new movement lineage starts fresh", () => {
    const s = fixture({
      sessions: [
        {
          id: "s1",
          status: "completed",
          workout_template_id: "old",
          session_date: "2026-11-10",
          started_at: "2026-11-10T10:00:00Z",
        },
        {
          id: "s2",
          status: "completed",
          workout_template_id: "new",
          session_date: "2026-11-12",
          started_at: "2026-11-12T10:00:00Z",
        },
      ],
      sets: [
        { workout_session_id: "s1", exercise_id: "ex", reps: 10 },
        { workout_session_id: "s2", exercise_id: "ex", reps: 11 },
      ],
    });
    expect(exerciseHistory(s, s.planned[1]!, today)).toHaveLength(2);
    expect(exerciseHistory(s, { ...s.planned[1]!, lineage_id: "replacement" }, today)).toHaveLength(
      0,
    );
  });
  it("aggregates actual primary-muscle working volume and ignores warmups", () => {
    const s = fixture({
      sessions: [{ id: "s", status: "completed", session_date: "2026-11-10" }],
      sets: [
        {
          exercise_id: "ex",
          workout_session_id: "s",
          weight_kg: 40,
          reps: 10,
          rir: 2,
          is_completed: true,
        },
        {
          exercise_id: "ex",
          workout_session_id: "s",
          weight_kg: 40,
          reps: 12,
          rir: 1,
          is_completed: true,
        },
        {
          exercise_id: "ex",
          workout_session_id: "s",
          weight_kg: 100,
          reps: 100,
          rir: 0,
          is_completed: true,
          is_warmup: true,
        },
      ],
    });
    const a = trainingAnalytics(s, today);
    expect(a.weeklyMuscles[0]).toMatchObject({ sets: 2, reps: 22, volume: 880, averageRir: 1.5 });
    expect(a.performance[0]?.recent.estimated1RM).toBe(56);
  });
  it("calibrates only from sufficiently spread, substantially logged observations", () => {
    const dates = Array.from({ length: 28 }, (_, i) => addDays(today, -i - 1)),
      weights = dates.map((date) => ({ date, weight_kg: 60 })),
      intake = dates.map((date) => ({ date, calories: 2500, target: 2500 }));
    expect(calibrateMaintenance(weights, intake, today)).toMatchObject({
      available: true,
      calories: 2500,
    });
    expect(calibrateMaintenance(weights, intake.slice(0, 20), today).available).toBe(false);
    expect(calibrateMaintenance(weights.slice(0, 10), intake, today).available).toBe(false);
    expect(
      calibrateMaintenance(
        weights,
        intake.map((n) => ({ ...n, calories: 500 })),
        today,
      ).available,
    ).toBe(false);
  });
  it("leaves projections and completion unavailable instead of inventing data", () => {
    expect(weightProjection(null, null).every((p) => p.kg === null)).toBe(true);
    expect(weightProjection(60, 0.2)[0]?.kg).toBe(60.8);
    expect(
      calculateDailyCompletion(
        { weight: false, nutrition: false, workout: false, recovery: false, water: false },
        { weight: false, nutrition: false, workout: false, recovery: false, water: false },
      ),
    ).toMatchObject({ percentage: 0, dayCompleted: false });
  });
  it("validates flexible schedules and non-empty daily requirements", () => {
    const base = {
      first_name: "Gift",
      water_target_ml: 2500,
      diet_type: "omnivore",
      budget_mode: "budget",
    };
    expect(settings.safeParse({ ...base, days: [1] }).success).toBe(true);
    expect(settings.safeParse({ ...base, days: [0, 1, 2, 3, 4, 5, 6] }).success).toBe(true);
    expect(settings.safeParse({ ...base, days: [1, 1] }).success).toBe(false);
    expect(settings.safeParse({ ...base, days: [] }).success).toBe(false);
    expect(settings.safeParse({ ...base, days: [1], target_date: "2026-02-30" }).success).toBe(
      false,
    );
    expect(
      completionPolicySchema.safeParse({
        weight: false,
        nutrition: false,
        workout: true,
        recovery: false,
        water: false,
      }).success,
    ).toBe(false);
  });
  it("proposes only distinct, muscle-matched, available substitutes", () => {
    const s = fixture({
      exercises: [
        { id: "ex", name: "Bench", primary_muscle: "Chest", equipment: "barbell" },
        { id: "pushup", name: "Push-up", primary_muscle: "Chest", equipment: "bodyweight" },
        { id: "squat", name: "Squat", primary_muscle: "Quads", equipment: "bodyweight" },
        { id: "machine", name: "Press", primary_muscle: "Chest", equipment: "machine" },
      ],
    });
    expect(substituteCandidates(s, s.planned[1]!).map((e) => e.id)).toEqual(["pushup"]);
    expect(() =>
      requestedChange(s, today, {
        id: "request",
        type: "substitution",
        planId: "p-new",
        replacementId: "squat",
      }),
    ).toThrow();
    expect(
      requestedChange(s, today, {
        id: "request",
        type: "substitution",
        planId: "p-new",
        replacementId: "pushup",
      }).type,
    ).toBe("exercise_substitution");
  });
  it("withholds monthly budgets until there are enough priced, substantial days", () => {
    const dates = Array.from({ length: 7 }, (_, i) => addDays(today, -i));
    const s = fixture({
      targets: [{ effective_from: "2026-01-01", effective_to: null, calories_target: 2500 }],
      prices: [{ food_id: "f", price_mwk: 1000, quantity: 1000 }],
      logs: dates.map((date) => ({ id: date, date })),
      items: dates.map((date) => ({
        nutrition_log_id: date,
        food_id: "f",
        grams: 500,
        calories: 2500,
      })),
    });
    expect(budgetSummary(s, today).estimatedMonthlyCost).toBe(15000);
    expect(
      budgetSummary({ ...s, items: s.items.slice(0, 4) }, today).estimatedMonthlyCost,
    ).toBeNull();
    expect(budgetSummary({ ...s, prices: [] }, today).weekly.missingPrices).toBe(7);
  });
  it("recommends a deload for repeated poor recovery only with enough history", () => {
    const end = "2026-11-08",
      dates = Array.from({ length: 14 }, (_, i) => addDays(end, i - 13));
    const s = fixture({
      templates: [{ id: "new", program_week_id: "w", day_of_week: 0 }],
      weights: dates.map((date, i) => ({ date, weight_kg: i < 7 ? 60 : 60.2 })),
      targets: [
        {
          id: "target",
          effective_from: "2026-01-01",
          effective_to: null,
          calories_target: 2500,
          protein_target_g: 120,
        },
      ],
      logs: dates.map((date) => ({ id: date, date })),
      items: dates.map((date) => ({ nutrition_log_id: date, calories: 2500, protein_g: 120 })),
      recovery: dates.map((date) => ({ date, recovery_score: 30 })),
      sessions: [
        { id: "s1", status: "completed", session_date: "2026-11-01" },
        { id: "s2", status: "completed", session_date: "2026-11-08" },
      ],
    });
    expect(buildReview(s, today).recommendations.some((r) => r.type === "deload")).toBe(true);
    expect(
      buildReview({ ...s, weights: [] }, today).recommendations.some((r) => r.type === "deload"),
    ).toBe(false);
  });
});

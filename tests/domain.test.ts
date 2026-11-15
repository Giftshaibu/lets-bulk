import { describe, it, expect } from "vitest";
import {
  addDays,
  getLocalDate,
  getCurrentWeekRange,
  startOfLocalDay,
} from "../src/lib/domain/dates";
import {
  analyseWeek,
  calculateCalorieAdherence,
  calculateProteinAdherence,
  calculateWeeklyAverage,
  calculateWeightTrend,
  calculateRecoveryScore,
  evaluateProgression,
  getNextUsableLoad,
  detectPlateau,
  calculateCompleteness,
  calculateDailyCompletion,
  calculateStreak,
  foodCost,
} from "../src/lib/domain/engines";
import * as validation from "../src/lib/validation/schemas";
const sets = (reps: number[], weight = 40, rir = 2) =>
  reps.map((reps) => ({ weight_kg: weight, reps, rir, is_completed: true }));
const plan = { sets: 3, rep_min: 8, rep_max: 12, target_rir: 2, planned_weight_kg: 40 };
const options = [{ increment_kg: 2.5, minimum_kg: 20, maximum_kg: 100 }];
describe("deterministic domain rules", () => {
  it("uses Blantyre date boundaries and Monday weeks", () => {
    expect(getLocalDate(new Date("2026-11-15T22:30:00Z"))).toBe("2026-11-16");
    expect(getCurrentWeekRange("2026-11-15")).toEqual({ start: "2026-11-09", end: "2026-11-15" });
    expect(startOfLocalDay("2026-11-16").toISOString()).toBe("2026-11-15T22:00:00.000Z");
  });
  it("measures adherence without rewarding overeating", () => {
    expect(calculateCalorieAdherence(2000, 2000)).toBe(1);
    expect(calculateCalorieAdherence(4000, 2000)).toBe(0);
    expect(calculateProteinAdherence(50, 100)).toBe(0.5);
    expect(calculateProteinAdherence(200, 100)).toBe(1);
  });
  it("averages dates and refuses to infer a weekly trend from a single weigh-in", () => {
    expect(
      calculateWeeklyAverage(
        [
          { date: "2026-11-01", weight_kg: 60 },
          { date: "2026-11-02", weight_kg: 62 },
        ],
        "2026-11-01",
        "2026-11-07",
      ).average,
    ).toBe(61);
    expect(calculateWeightTrend([{ date: "2026-11-01", weight_kg: 60 }], "2026-11-01").status).toBe(
      "insufficient_data",
    );
  });
  it("scores recovery monotonically", () => {
    expect(
      calculateRecoveryScore({ sleep_hours: 8, energy: 5, soreness: 1, stress: 1 }).score,
    ).toBe(100);
    expect(
      calculateRecoveryScore({ sleep_hours: 0, energy: 1, soreness: 5, stress: 5 }).status,
    ).toBe("poor");
  });
  it("requires comparable complete sessions, all reps and RIR before load progression", () => {
    expect(evaluateProgression([sets([12, 12, 12])], plan, options).type).toBe("collect_data");
    expect(evaluateProgression([sets([10, 10, 9]), sets([10, 10, 9])], plan, options).type).toBe(
      "reps",
    );
    expect(
      evaluateProgression([sets([12, 12, 12]), sets([12, 12, 12])], plan, options).nextLoad,
    ).toBe(42.5);
    expect(
      evaluateProgression([sets([12, 12, 12]), sets([12, 12, 12], 40, 0)], plan, options).nextLoad,
    ).toBeNull();
    expect(
      evaluateProgression([sets([12, 12, 12]), sets([12, 12, 12])], plan, []).nextLoad,
    ).toBeNull();
  });
  it("rounds to actual load options and respects ceilings", () => {
    expect(getNextUsableLoad(22, 2.5, [{ increment_kg: 4, minimum_kg: 2, maximum_kg: 30 }])).toBe(
      26,
    );
    expect(getNextUsableLoad(100, 2.5, options)).toBeNull();
  });
  it("detects comparable plateaus and excludes warmups", () => {
    expect(detectPlateau([sets([10, 10, 9]), sets([10, 10, 9]), sets([10, 10, 9])])).toBe(true);
    expect(detectPlateau([sets([10]), sets([10], 42.5), sets([10], 45)])).toBe(false);
  });
  it("handles rest days, incomplete days, and streak gaps", () => {
    expect(
      calculateDailyCompletion({
        weight: true,
        nutrition: true,
        workout: true,
        recovery: true,
        water: false,
      }).dayCompleted,
    ).toBe(false);
    expect(calculateStreak(["2026-11-12", "2026-11-13", "2026-11-14"], "2026-11-15").current).toBe(
      3,
    );
    expect(calculateStreak(["2026-11-12", "2026-11-14"], "2026-11-16").current).toBe(0);
    expect(calculateStreak(["2026-11-14", "2026-11-14"], "2026-11-15").longest).toBe(1);
  });
  it("does not invent food costs without nutrients", () => {
    expect(
      foodCost(1000, 100, { calories_per_100g: null, protein_per_100g: null }).per25gProtein,
    ).toBeNull();
    expect(
      foodCost(1000, 500, { calories_per_100g: 100, protein_per_100g: 10 }).per25gProtein,
    ).toBe(500);
  });
  it("validates dates and bodyweight sets", () => {
    expect(validation.date.safeParse("2026-02-30").success).toBe(false);
    expect(
      validation.setEntry.safeParse({
        sessionId: crypto.randomUUID(),
        exerciseId: crypto.randomUUID(),
        setNumber: 1,
        weight: 0,
        reps: 12,
        rir: 2,
        done: true,
      }).success,
    ).toBe(true);
  });
  it("keeps plans stable without data and adjusts only with complete adherent history", () => {
    const end = "2026-11-14",
      days = Array.from({ length: 14 }, (_, i) => addDays(end, i - 13));
    const base = {
      end,
      weights: days.map((date, i) => ({ date, weight_kg: i < 7 ? 60 : 60.1 })),
      nutrition: days.map((date) => ({
        date,
        calories: 2500,
        protein: 120,
        targetCalories: 2500,
        targetProtein: 120,
      })),
      recovery: days.map((date) => ({ date, score: 90 })),
      workouts: 8,
      expectedWorkouts: 8,
    };
    expect(analyseWeek({ ...base, weights: [], nutrition: [] }).delta).toBe(0);
    expect(analyseWeek(base).delta).toBe(150);
    expect(
      analyseWeek({ ...base, nutrition: base.nutrition.map((n) => ({ ...n, calories: 1500 })) })
        .delta,
    ).toBe(0);
    expect(
      analyseWeek({ ...base, recovery: base.recovery.map((r) => ({ ...r, score: 30 })) }).type,
    ).toBe("recovery_action");
  });
});

import { describe, it, expect } from "vitest";
import { estimatePlan, guidedSetup } from "../src/lib/domain/onboarding";
import { calculateStreak } from "../src/lib/domain/streaks";
const base = {
  name: "Fixture",
  weight: 60,
  height: 170,
  goal: 65,
  months: 8,
  age: null,
  sex: "skip" as const,
  activity: "light" as const,
  days: [1, 3, 5],
  equipment: ["bodyweight" as const],
  foods: [],
  budget: "balanced" as const,
  weeklyBudget: null,
};
describe("beginner setup", () => {
  it("offers a bounded rough estimate without age or sex", () => {
    const p = estimatePlan(base);
    expect(p.rough).toBe(true);
    expect(p.targets.kcal).toBe(2050);
    expect(p.targets.protein).toBe(108);
  });
  it("never raises calories to catch up with a deadline", () => {
    expect(estimatePlan({ ...base, months: 1 }).targets).toEqual(
      estimatePlan({ ...base, months: 12 }).targets,
    );
  });
  it("rejects invalid schedules and non-gaining goals", () => {
    expect(guidedSetup.safeParse({ ...base, days: [1, 1, 2] }).success).toBe(false);
    expect(guidedSetup.safeParse({ ...base, goal: 59 }).success).toBe(false);
  });
  it("keeps a streak until the next local day, ignores duplicates and breaks after a missed day", () => {
    expect(calculateStreak(["2026-11-13", "2026-11-14", "2026-11-14"], "2026-11-15").current).toBe(
      2,
    );
    expect(calculateStreak(["2026-11-13"], "2026-11-15").current).toBe(0);
  });
});

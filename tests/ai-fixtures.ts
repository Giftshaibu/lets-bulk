import type { Snapshot, Db } from "../src/lib/repositories/app.repository";
import { vi } from "vitest";
export const owner = "00000000-0000-4000-8000-000000000001",
  id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export function snapshot(): Snapshot {
  const tables = [
    "targets",
    "foods",
    "prices",
    "meals",
    "mealItems",
    "logs",
    "items",
    "programs",
    "weeks",
    "templates",
    "planned",
    "exercises",
    "sessions",
    "sets",
    "weights",
    "recovery",
    "water",
    "measurements",
    "photos",
    "checkins",
    "reviews",
    "recommendations",
    "loads",
    "equipment",
    "loggingDays",
  ];
  return {
    ...Object.fromEntries(tables.map((t) => [t, []])),
    profile: {
      user_id: owner,
      first_name: "Fixture",
      height_cm: 170,
      starting_weight_kg: 60,
      goal_weight_kg: 65,
      start_date: "2026-01-01",
      target_date: "2026-12-31",
      training_experience: "beginner",
      water_target_ml: 2500,
    },
    preferences: { diet_type: "omnivore", budget_mode: "balanced" },
    targets: [
      {
        id: id(20),
        version: 1,
        effective_from: "2026-01-01",
        effective_to: null,
        calories_target: 2500,
        protein_target_g: 110,
        carbs_target_g: 340,
        fat_target_g: 65,
      },
    ],
    foods: [
      food(101, "Egg, whole, cooked, hard-boiled", "other", 155, 12.6, 50),
      food(102, "Rice, cooked", "staple", 130, 2.7, 150),
      food(103, "Bread, whole-wheat", "staple", 252, 12.5, 32),
      food(104, "Wheat flour", "staple", 360, 10, 100),
      {
        ...food(105, "Beer", "beverage", 43, 0.46, 29.7),
        alcohol_g_per_100g: 3.9,
        serving_volume_ml: 29.5735295625,
      },
    ],
    exercises: [
      {
        id: id(401),
        name: "Bodyweight Squat",
        slug: "bodyweight-squat",
        primary_muscle: "Quads",
        secondary_muscles: [],
        instructions: [
          "Stand with feet shoulder-width apart.",
          "Bend your knees and hips in a controlled squat.",
          "Press through your feet to stand.",
        ],
        common_mistakes: ["Rushing the movement."],
        required_equipment: ["bodyweight"],
        is_active: true,
      },
    ],
    recommendations: [
      {
        id: id(501),
        type: "increase_calories",
        title: "Add energy",
        reason: "Your recorded gain was below the saved range.",
        current_value: 2500,
        recommended_value: 2650,
        unit: "kcal",
        status: "pending",
        request_id: null,
        weekly_analysis_id: id(601),
        source_period_end: "2026-11-15",
      },
    ],
    reviews: [
      {
        id: id(601),
        period_start: "2026-11-09",
        period_end: "2026-11-15",
        raw_analysis: { calorieAdherence: 0.9, proteinAdherence: 0.9 },
        confidence: 0.8,
        data_completeness: 0.8,
      },
    ],
  } as unknown as Snapshot;
}
function food(
  n: number,
  name: string,
  category: string,
  kcal: number,
  protein: number,
  serving: number,
) {
  return {
    id: id(n),
    name,
    local_name: null,
    category,
    preparation_state: "as described",
    calories_per_100g: kcal,
    protein_per_100g: protein,
    carbs_per_100g: 20,
    fat_per_100g: 5,
    serving_name:
      category === "other"
        ? "1 large"
        : category === "staple" && name.startsWith("Bread")
          ? "1 slice"
          : "1 cup",
    serving_grams: serving,
    serving_volume_ml: null,
    alcohol_g_per_100g: 0,
    source: "Fixture",
    availability: "common",
    is_active: true,
  };
}
export function mockDb(state: unknown = { state: "reserved", id: id(701) }) {
  const rpc = vi.fn((name: string) => {
    const p = Promise.resolve({ data: name === "ai_begin" ? state : null, error: null });
    return Object.assign(p, { abortSignal: () => p });
  });
  return { db: { rpc } as unknown as Db, rpc };
}

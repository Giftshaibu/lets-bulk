import { z } from "zod";
import { equipmentChoices } from "../domain/equipment";
import { getLocalDate } from "../domain/dates";
export const id = z.string().uuid();
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (d) =>
      !isNaN(Date.parse(d)) &&
      new Date(`${d}T12:00:00Z`).toISOString().slice(0, 10) === d &&
      d <= getLocalDate(),
    "Choose a valid date up to today",
  );
const positive = z.number().finite().positive();
export const targets = z.object({
  kcal: z.number().int().min(500).max(10000),
  protein: z.number().int().min(1).max(500),
  carbs: z.number().int().min(0).max(1500),
  fat: z.number().int().min(1).max(500),
});
export const profile = z.object({
  name: z.string().trim().min(1).max(80),
  height: positive.min(50).max(260),
  weight: positive.min(20).max(500),
  goal: positive.min(20).max(500),
});
export const onboarding = z.object({
  profile,
  targets,
  equipment: z
    .array(z.enum(["bodyweight", "barbell", "dumbbell", "cable", "machine", "pullup_bar"]))
    .min(1),
});
export const weight = z.object({ date, weight_kg: positive.min(20).max(500) });
export const recovery = z.object({
  date,
  sleep_hours: z.number().min(0).max(24),
  energy: z.number().int().min(1).max(5),
  soreness: z.number().int().min(1).max(5),
  stress: z.number().int().min(1).max(5),
});
export const water = z.object({ id, date, amount_ml: z.number().int().min(1).max(10000) });
export const logFood = z.object({
  id,
  date,
  slot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  foodId: id,
  grams: positive.max(10000),
});
export const food = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.enum([
    "staple",
    "legume",
    "meat",
    "fish",
    "dairy",
    "vegetable",
    "fruit",
    "fat",
    "snack",
    "other",
  ]),
  preparation_state: z.string().trim().min(1).max(100),
  calories_per_100g: z.number().min(0).max(1000),
  protein_per_100g: z.number().min(0).max(100),
  carbs_per_100g: z.number().min(0).max(100),
  fat_per_100g: z.number().min(0).max(100),
  source_reference: z.string().trim().min(1).max(500),
  common_in_malawi: z.boolean().default(true),
});
export const price = z.object({
  food_id: id,
  price_mwk: positive.max(1e8),
  quantity: positive.max(1e6),
  unit: z.literal("g"),
  place: z.string().trim().max(120).default(""),
});
export const setEntry = z.object({
  sessionId: id,
  exerciseId: id,
  setNumber: z.number().int().min(1).max(20),
  weight: z.number().min(0).max(1000),
  reps: z.number().int().min(0).max(1000),
  rir: z.number().int().min(0).max(5),
  done: z.boolean(),
});
export const measurements = z
  .object({
    date,
    waist_cm: positive.max(300).optional(),
    chest_cm: positive.max(300).optional(),
    arm_cm: positive.max(150).optional(),
    thigh_cm: positive.max(200).optional(),
  })
  .refine((v) => Object.keys(v).length > 1, "Enter at least one measurement");
export const photo = z.object({
  date,
  view: z.enum(["front", "side", "back"]),
  storage_path: z.string().min(1).max(300),
});
export const load = z
  .object({
    equipment_type: z.enum(["bodyweight", "barbell", "dumbbell", "cable", "machine", "pullup_bar"]),
    exercise_id: id.nullable().default(null),
    increment_kg: positive.max(100),
    minimum_kg: z.number().min(0).max(1000),
    maximum_kg: positive.max(2000),
  })
  .refine((v) => v.maximum_kg > v.minimum_kg, "Maximum must exceed minimum");
export const meal = z.object({
  name: z.string().trim().min(1).max(100),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  items: z
    .array(z.object({ food_id: id, grams: positive.max(10000) }))
    .min(1)
    .max(30),
});
export const completionPolicySchema = z
  .object({
    weight: z.boolean(),
    nutrition: z.boolean(),
    workout: z.boolean(),
    recovery: z.boolean(),
    water: z.boolean(),
  })
  .refine(
    (v) => v.weight || v.nutrition || v.recovery || v.water,
    "Keep at least one daily logging requirement",
  );
const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (d) => !isNaN(Date.parse(d)) && new Date(`${d}T12:00:00Z`).toISOString().slice(0, 10) === d,
    "Choose a valid date",
  );
export const changeRequest = z.object({
  id,
  type: z.enum(["volume", "deload", "substitution", "restore"]),
  planId: id.optional(),
  replacementId: id.optional(),
  direction: z.union([z.literal(-1), z.literal(1)]).optional(),
});
export const settings = z.object({
  height_cm: positive.min(50).max(260).optional(),
  goal_weight_kg: positive.min(20).max(500).optional(),
  target_date: calendarDate.nullable().optional(),
  training_experience: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  equipment: z
    .array(z.enum(equipmentChoices))
    .min(1)
    .refine(
      (v) => new Set(v).size === v.length && v.includes("bodyweight"),
      "Include bodyweight and do not duplicate equipment",
    )
    .optional(),
  completion_policy: completionPolicySchema.optional(),
  first_name: z.string().trim().min(1).max(80),
  water_target_ml: z.number().int().min(500).max(10000),
  diet_type: z.enum(["omnivore", "vegetarian", "vegan"]),
  budget_mode: z.enum(["balanced", "budget"]),
  days: z
    .array(z.number().int().min(0).max(6))
    .min(1)
    .max(7)
    .refine((v) => new Set(v).size === v.length, "Choose different training days"),
});

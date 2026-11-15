import { z } from "zod";
import { equipmentChoices } from "./equipment";
export const guidedSetup = z
  .object({
    name: z.string().trim().min(1).max(80),
    weight: z.number().min(20).max(500),
    height: z.number().min(100).max(260),
    goal: z.number().min(20).max(500),
    months: z.number().int().min(1).max(60),
    age: z.number().int().min(18).max(100).nullable(),
    sex: z.enum(["female", "male", "skip"]),
    activity: z.enum(["light", "moderate", "active"]),
    days: z
      .array(z.number().int().min(0).max(6))
      .min(3)
      .max(5)
      .refine((v) => new Set(v).size === v.length),
    equipment: z.array(z.enum(equipmentChoices)).min(1),
    foods: z.array(z.string().max(80)).max(40),
    budget: z.enum(["budget", "balanced"]),
    weeklyBudget: z.number().positive().max(100000000).nullable(),
  })
  .refine((v) => v.goal > v.weight, {
    message: "Choose a goal above your starting weight",
    path: ["goal"],
  });
export type GuidedSetup = z.infer<typeof guidedSetup>;
export function estimatePlan(v: GuidedSetup) {
  // Mifflin–St Jeor for adults when inputs are supplied; 30 kcal/kg otherwise.
  const precise = v.age !== null && v.sex !== "skip";
  const maintenance = precise
    ? (10 * v.weight + 6.25 * v.height - 5 * v.age! + (v.sex === "male" ? 5 : -161)) *
      { light: 1.4, moderate: 1.6, active: 1.8 }[v.activity]
    : v.weight * { light: 30, moderate: 33, active: 36 }[v.activity];
  const kcal = Math.round(Math.max(1200, Math.min(10000, maintenance + 250)) / 50) * 50;
  const protein = Math.round(v.weight * 1.8),
    fat = Math.round((kcal * 0.25) / 9);
  return {
    targets: {
      kcal,
      protein,
      fat,
      carbs: Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4)),
    },
    rough: !precise,
    weeklyGoal: Math.round(((v.goal - v.weight) / (v.months * 4.348)) * 100) / 100,
    explanation: `${precise ? "Your measurements, age and activity" : "Your weight and activity"} give an estimated starting energy need. We added a modest 250 kcal for gradual gain. Protein starts at 1.8 g per kg. Your logs will guide later changes; the deadline never increases your calories automatically.`,
  };
}

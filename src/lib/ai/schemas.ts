import { z } from "zod";
const text = z.string().trim().min(1).max(600);
export const slotSchema = z.enum(["breakfast", "lunch", "snack", "dinner"]);
export const outputs = {
  explainRecommendation: z
    .object({
      decision: z.string().min(1).max(100),
      summary: text,
      why: text,
      practicalNextStep: text,
    })
    .strict(),
  parseFoodLog: z
    .object({
      items: z
        .array(
          z
            .object({
              query: z.string().trim().min(1).max(80),
              sourceText: z.string().min(1).max(1000),
              quantity: z.number().positive().max(10000).nullable(),
              unit: z.enum(["g", "kg", "ml", "cup", "piece", "tablespoon", "teaspoon"]).nullable(),
              mealType: slotSchema.nullable(),
              confidence: z.number().min(0).max(1),
            })
            .strict(),
        )
        .max(12),
      clarificationNeeded: z.boolean(),
      clarificationQuestion: z.string().max(300).optional(),
    })
    .strict(),
  suggestMeals: z
    .object({
      suggestions: z
        .array(
          z
            .object({
              candidateId: z.string().regex(/^meal-\d+$/),
              foodIds: z.array(z.string().uuid()).min(1).max(3),
              title: z.string().min(1).max(80),
              explanation: text,
            })
            .strict(),
        )
        .min(1)
        .max(3),
    })
    .strict(),
  explainExercise: z
    .object({
      simpleExplanation: text,
      steps: z.array(z.string().min(1).max(400)).min(1).max(5),
      commonMistakes: z.array(z.string().min(1).max(300)).max(3),
      beginnerTip: text,
    })
    .strict(),
  summarizeWeek: z
    .object({
      headline: z.string().min(1).max(140),
      summary: text,
      wins: z.array(z.string().min(1).max(200)).max(3),
      focusNextWeek: text,
    })
    .strict(),
};
export type Task = keyof typeof outputs;
export type Output<T extends Task> = z.infer<(typeof outputs)[T]>;
export const taskSchema = z.enum([
  "explainRecommendation",
  "parseFoodLog",
  "suggestMeals",
  "explainExercise",
  "summarizeWeek",
]);
export const requestSchemas = {
  "explain-recommendation": z.object({ recommendationId: z.string().uuid() }).strict(),
  "parse-food-log": z
    .object({
      text: z.string().trim().min(1).max(1000),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .strict(),
  "meal-suggestions": z
    .object({ mealType: slotSchema, availableFoodIds: z.array(z.string().uuid()).min(1).max(50) })
    .strict(),
  "explain-exercise": z.object({ exerciseId: z.string().uuid() }).strict(),
  "weekly-summary": z.object({ reviewId: z.string().uuid() }).strict(),
};

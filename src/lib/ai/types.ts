import type { Output, Task } from "./schemas";
export type Facts = Record<string, unknown>;
export type ExplainRecommendationInput = Facts & {
  decision: string;
  currentValue: number | null;
  recommendedValue: number | null;
};
export type ParseFoodLogInput = { text: string };
export type MealCandidate = {
  id: string;
  foodIds: string[];
  items: { foodId: string; name: string; grams: number }[];
  kcal: number;
  protein: number;
  cost: number | null;
};
export type MealSuggestionInput = {
  candidates: MealCandidate[];
  mealType: string;
  remaining: { kcal: number; protein: number };
  budgetMode: string;
};
export type ExerciseExplanationInput = Facts & {
  name: string;
  instructions: string[];
  commonMistakes: string[];
};
export type WeeklySummaryInput = Facts & {
  period: { start: string; end: string };
  recommendation: unknown;
};
export type Inputs = {
  explainRecommendation: ExplainRecommendationInput;
  parseFoodLog: ParseFoodLogInput;
  suggestMeals: MealSuggestionInput;
  explainExercise: ExerciseExplanationInput;
  summarizeWeek: WeeklySummaryInput;
};
export type AIErrorCode =
  | "AI_NOT_CONFIGURED"
  | "AI_DISABLED"
  | "AI_MODEL_UNAVAILABLE"
  | "AI_REQUEST_FAILED"
  | "AI_INVALID_RESPONSE"
  | "AI_RATE_LIMITED"
  | "AI_TIMEOUT"
  | "AI_OUTPUT_REJECTED"
  | "AI_IN_PROGRESS";
export class AIError extends Error {
  constructor(readonly code: AIErrorCode) {
    super(code);
  }
}
export type AIResult<T> = { source: "ai" | "cache" | "fallback"; reason?: AIErrorCode; result: T };
export type ProviderOutputs = { [T in Task]: Output<T> };

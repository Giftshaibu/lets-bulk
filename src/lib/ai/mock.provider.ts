import type { CoachingAIProvider } from "./provider";
import type { Inputs, ProviderOutputs } from "./types";
import { fallback } from "./fallback";
export class MockCoachingAIProvider implements CoachingAIProvider {
  constructor(
    private readonly overrides: Partial<{
      [T in keyof Inputs]: (v: Inputs[T]) => ProviderOutputs[T] | Promise<ProviderOutputs[T]>;
    }> = {},
  ) {}
  explainRecommendation = async (v: Inputs["explainRecommendation"]) =>
    this.overrides.explainRecommendation?.(v) ?? fallback("explainRecommendation", v);
  parseFoodLog = async (v: Inputs["parseFoodLog"]) =>
    this.overrides.parseFoodLog?.(v) ?? fallback("parseFoodLog", v);
  suggestMeals = async (v: Inputs["suggestMeals"]) =>
    this.overrides.suggestMeals?.(v) ?? fallback("suggestMeals", v);
  explainExercise = async (v: Inputs["explainExercise"]) =>
    this.overrides.explainExercise?.(v) ?? fallback("explainExercise", v);
  summarizeWeek = async (v: Inputs["summarizeWeek"]) =>
    this.overrides.summarizeWeek?.(v) ?? fallback("summarizeWeek", v);
}

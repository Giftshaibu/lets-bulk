import type { Inputs, ProviderOutputs } from "./types";
export interface CoachingAIProvider {
  explainRecommendation(
    input: Inputs["explainRecommendation"],
  ): Promise<ProviderOutputs["explainRecommendation"]>;
  parseFoodLog(input: Inputs["parseFoodLog"]): Promise<ProviderOutputs["parseFoodLog"]>;
  suggestMeals(input: Inputs["suggestMeals"]): Promise<ProviderOutputs["suggestMeals"]>;
  explainExercise(input: Inputs["explainExercise"]): Promise<ProviderOutputs["explainExercise"]>;
  summarizeWeek(input: Inputs["summarizeWeek"]): Promise<ProviderOutputs["summarizeWeek"]>;
}

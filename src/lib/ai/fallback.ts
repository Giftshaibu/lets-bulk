import type { Task, Output } from "./schemas";
import type { Inputs } from "./types";
export function fallback<T extends Task>(task: T, input: Inputs[T]): Output<T> {
  switch (task) {
    case "explainRecommendation": {
      const v = input as Inputs["explainRecommendation"];
      return {
        decision: v.decision,
        summary: String(v["title"] ?? "Your saved recommendation"),
        why: String(v["reason"] ?? "Keep following your saved plan."),
        practicalNextStep:
          "Review the saved values and choose Apply or Keep current. Nothing changes automatically.",
      } as Output<T>;
    }
    case "parseFoodLog":
      return {
        items: [],
        clarificationNeeded: true,
        clarificationQuestion:
          "Couldn't interpret that automatically. Search foods manually instead.",
      } as Output<T>;
    case "suggestMeals": {
      const v = input as Inputs["suggestMeals"];
      return {
        suggestions: v.candidates.slice(0, 3).map((c) => ({
          candidateId: c.id,
          foodIds: c.foodIds,
          title: c.items
            .map((i) => i.name)
            .join(" + ")
            .slice(0, 80),
          explanation:
            "A food combination from your confirmed available foods. Review the calculated amounts, nutrition and prices.",
        })),
      } as Output<T>;
    }
    case "explainExercise": {
      const v = input as Inputs["explainExercise"];
      return {
        simpleExplanation: v.name,
        steps: v.instructions.length
          ? v.instructions.slice(0, 5)
          : [
              "No verified instructions are stored for this exercise. Seek guidance before attempting it.",
            ],
        commonMistakes: v.commonMistakes.slice(0, 3),
        beginnerTip:
          "Use a comfortable load and controlled movement. Keep the original guidance below.",
      } as Output<T>;
    }
    case "summarizeWeek":
      return {
        headline: "Your completed week",
        summary: "Your recorded metrics and saved recommendation remain available below.",
        wins: [],
        focusNextWeek:
          "Keep recording what you do. Review the existing recommendation before choosing a change.",
      } as Output<T>;
  }
  throw new Error("Unknown AI task");
}

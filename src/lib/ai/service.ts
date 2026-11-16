import { z } from "zod";
import type { Db, Snapshot } from "../repositories/app.repository";
import { AppError, result } from "../services/errors";
import { aggregate } from "../services/dashboard.service";
import { addDays } from "../domain/dates";
import { average } from "../domain/numbers";
import { matchesFoodQuery } from "../domain/food-catalog";
import { calculateCalorieAdherence, calculateProteinAdherence } from "../domain/nutrition";
import { rankMeals } from "./meal-ranking";
import { requestSchemas, type Task, type Output } from "./schemas";
import { fallback } from "./fallback";
import { contextHash, validateOutput, containsPrivateCredentials } from "./guardrails";
import { PROMPT_VERSIONS } from "./prompts";
import { getAIRuntime, type AIRuntime } from "./runtime";
import { AIError, type Inputs, type AIResult, type AIErrorCode } from "./types";
const beginSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("cached"), output: z.unknown() }),
  z.object({ state: z.literal("reserved"), id: z.string().uuid() }),
  z.object({ state: z.literal("limited") }),
  z.object({ state: z.literal("pending") }),
]);
export async function generate<T extends Task>(
  task: T,
  input: Inputs[T],
  db: Db,
  runtime: AIRuntime,
  sourceId?: string,
): Promise<AIResult<Output<T>>> {
  const start = Date.now(),
    requestId = crypto.randomUUID();
  let id: string | undefined;
  const log = (source: string, code?: string) =>
    console.info("ai_action", {
      task,
      model: runtime.model,
      latencyMs: Date.now() - start,
      requestId,
      source,
      ...(code ? { code } : {}),
    });
  const failed = (code: AIErrorCode): AIResult<Output<T>> => {
    log("fallback", code);
    return { source: "fallback", reason: code, result: fallback(task, input) };
  };
  if (!runtime.provider) return failed(runtime.unavailable ?? "AI_NOT_CONFIGURED");
  try {
    const hash = await contextHash({ sourceId: sourceId ?? null, facts: input }),
      reservation = beginSchema.parse(
        await result(
          db
            .rpc("ai_begin", {
              p_task: task,
              p_hash: hash,
              p_model: runtime.model,
              p_version: PROMPT_VERSIONS[task],
            })
            .abortSignal(AbortSignal.timeout(3000)),
        ),
      );
    if (reservation.state === "cached") {
      const value = validateOutput(task, reservation.output, input);
      log("cache");
      return { source: "cache", result: value };
    }
    if (reservation.state === "limited") return failed("AI_RATE_LIMITED");
    if (reservation.state === "pending") return failed("AI_IN_PROGRESS");
    id = reservation.id;
    const provider = runtime.provider;
    const value = validateOutput(task, await provider[task](input as never), input);
    const ttl =
      task === "explainExercise"
        ? 2592000
        : task === "explainRecommendation" || task === "summarizeWeek"
          ? 86400
          : 0;
    await result(
      db
        .rpc("ai_finish", {
          p_id: id,
          p_output: JSON.parse(JSON.stringify(value)),
          // Postgres accepts NULL text arguments; generated RPC types omit that nullability.
          p_error: null as unknown as string,
          p_ttl: ttl,
        })
        .abortSignal(AbortSignal.timeout(3000)),
    );
    log("ai");
    return { source: "ai", result: value };
  } catch (e) {
    const code = e instanceof AIError ? e.code : "AI_REQUEST_FAILED";
    if (id) {
      try {
        await result(
          db
            .rpc("ai_finish", { p_id: id, p_output: null, p_error: code, p_ttl: 0 })
            .abortSignal(AbortSignal.timeout(3000)),
        );
      } catch {
        /* Leave the reservation consumed when recording fails. */
      }
    }
    return failed(code);
  }
}
const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
export function weeklyContext(
  s: Snapshot,
  review: Snapshot["reviews"][number],
): Inputs["summarizeWeek"] {
  const start = review.period_start,
    end = review.period_end,
    previousStart = addDays(start, -7);
  const current = s.weights.filter((w) => w.date >= start && w.date <= end),
    previous = s.weights.filter((w) => w.date >= previousStart && w.date < start);
  const currentAverage = average(current.map((w) => w.weight_kg)),
    previousAverage = average(previous.map((w) => w.weight_kg));
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const nutrition = days.map((date) => {
    const target = [...s.targets]
        .reverse()
        .find((t) => t.effective_from <= date && (!t.effective_to || t.effective_to >= date)),
      logs = new Set(s.logs.filter((l) => l.date === date).map((l) => l.id)),
      items = s.items.filter((i) => logs.has(i.nutrition_log_id));
    return target && items.length
      ? {
          calories: calculateCalorieAdherence(
            items.reduce((n, i) => n + i.calories, 0),
            target.calories_target,
          ),
          protein: calculateProteinAdherence(
            items.reduce((n, i) => n + i.protein_g, 0),
            target.protein_target_g,
          ),
        }
      : null;
  });
  const expected = days.reduce((n, date) => {
    const program = [...s.programs]
        .reverse()
        .find((p) => p.effective_from <= date && (!p.effective_to || p.effective_to >= date)),
      weeks = new Set(
        s.weeks.filter((w) => w.training_program_id === program?.id).map((w) => w.id),
      );
    return (
      n +
      s.templates.filter(
        (t) =>
          weeks.has(t.program_week_id) &&
          t.day_of_week === new Date(`${date}T12:00:00Z`).getUTCDay(),
      ).length
    );
  }, 0);
  const workouts = s.sessions.filter(
    (w) => w.status === "completed" && w.session_date >= start && w.session_date <= end,
  ).length;
  const recovery = s.recovery.filter((r) => r.date >= start && r.date <= end);
  const recommendation = s.recommendations.find((r) => r.weekly_analysis_id === review.id);
  return {
    period: { start, end },
    assessmentWindow: "The saved recommendation uses a separate fourteen-day assessment.",
    weight: {
      weighIns: current.length,
      weeklyChangeKg:
        current.length >= 3 &&
        previous.length >= 3 &&
        currentAverage !== null &&
        previousAverage !== null
          ? Number((currentAverage - previousAverage).toFixed(2))
          : null,
    },
    nutrition: {
      loggedDays: nutrition.filter(Boolean).length,
      calorieAdherencePercent: Math.round(
        (nutrition.reduce((n, d) => n + (d?.calories ?? 0), 0) / 7) * 100,
      ),
      proteinAdherencePercent: Math.round(
        (nutrition.reduce((n, d) => n + (d?.protein ?? 0), 0) / 7) * 100,
      ),
    },
    training: {
      completedWorkouts: workouts,
      expectedWorkouts: expected,
      workoutAdherencePercent: expected ? Math.round(Math.min(1, workouts / expected) * 100) : null,
    },
    recovery: { score: average(recovery.map((r) => r.recovery_score)), logs: recovery.length },
    recommendation: recommendation
      ? {
          title: recommendation.title,
          reason: recommendation.reason,
          currentValue: recommendation.current_value,
          recommendedValue: recommendation.recommended_value,
          unit: recommendation.unit,
        }
      : null,
  };
}
export async function handleAIAction(
  action: string,
  body: unknown,
  s: Snapshot,
  db: Db,
  today: string,
  injected?: AIRuntime,
) {
  if (!s.profile) throw new AppError("INVALID_INPUT", "Finish onboarding first.");
  const runtime = async () => injected ?? getAIRuntime();
  if (action === "explain-recommendation") {
    const v = requestSchemas[action].parse(body),
      r = s.recommendations.find((r) => r.id === v.recommendationId);
    if (!r) throw new AppError("NOT_FOUND", "Recommendation not found.", 404);
    const review = s.reviews.find((w) => w.id === r.weekly_analysis_id),
      a = review?.raw_analysis;
    const analysis = a && typeof a === "object" && !Array.isArray(a) ? a : {};
    const input: Inputs["explainRecommendation"] = {
      decision: r.type,
      title: r.title,
      reason: r.reason,
      status: r.status,
      currentValue: r.current_value,
      recommendedValue: r.recommended_value,
      unit: r.unit,
      manualRequest: !!r.request_id,
      assessmentDays: 14,
      context: Object.fromEntries(
        ["calorieAdherence", "proteinAdherence", "workoutAdherence"]
          .filter((k) => typeof analysis[k] === "number")
          .map((k) => [k + "Percent", Math.round(Number(analysis[k]) * 100)]),
      ),
    };
    return generate("explainRecommendation", input, db, await runtime(), r.id);
  }
  if (action === "parse-food-log") {
    const v = requestSchemas[action].parse(body);
    if (
      v.date > today ||
      isNaN(Date.parse(v.date)) ||
      new Date(`${v.date}T12:00:00Z`).toISOString().slice(0, 10) !== v.date
    )
      throw new AppError("INVALID_INPUT", "Choose a valid date up to today.");
    if (containsPrivateCredentials(v.text))
      return {
        source: "fallback" as const,
        reason: "AI_OUTPUT_REJECTED" as const,
        result: {
          items: [],
          clarificationNeeded: true,
          clarificationQuestion:
            "Please describe only foods and amounts, without private account details.",
        },
      };
    const response = await generate("parseFoodLog", { text: v.text }, db, await runtime());
    const items = response.result.items.map((item) => ({
      ...item,
      matches: s.foods
        .filter(
          (f) =>
            f.is_active &&
            f.calories_per_100g !== null &&
            f.protein_per_100g !== null &&
            f.carbs_per_100g !== null &&
            f.fat_per_100g !== null &&
            matchesFoodQuery(
              { name: f.name, aliases: f.local_name, category: f.category },
              item.query,
            ),
        )
        .sort(
          (a, b) =>
            Number(!a.name.toLowerCase().startsWith(item.query.toLowerCase())) -
              Number(!b.name.toLowerCase().startsWith(item.query.toLowerCase())) ||
            a.name.localeCompare(b.name),
        )
        .slice(0, 5)
        .map((f) => ({
          id: f.id,
          name: f.name,
          preparation: f.preparation_state,
          servingName: f.serving_name,
          servingGrams: f.serving_grams,
          servingVolumeMl: f.serving_volume_ml,
        })),
    }));
    return { ...response, result: { ...response.result, items } };
  }
  if (action === "meal-suggestions") {
    const v = requestSchemas[action].parse(body);
    if (v.availableFoodIds.some((id) => !s.foods.some((f) => f.id === id && f.is_active)))
      throw new AppError("INVALID_INPUT", "Choose foods still available in your library.");
    const d = aggregate(s, today),
      candidates = rankMeals(s, v.availableFoodIds, d.remaining);
    if (!candidates.length)
      return {
        source: "fallback" as const,
        reason: "AI_NOT_CONFIGURED" as const,
        result: { suggestions: [] },
        candidates,
        remaining: d.remaining,
        message:
          d.remaining.kcal <= 0 && d.remaining.protein <= 0
            ? "Your daily energy and protein targets are already met. You can still log food manually."
            : "Choose prepared, verified foods compatible with your diet. Raw flour, uncooked meat and alcoholic drinks are not meal suggestions.",
      };
    const response = await generate(
      "suggestMeals",
      {
        candidates,
        mealType: v.mealType,
        remaining: { kcal: d.remaining.kcal, protein: d.remaining.protein },
        budgetMode: s.preferences?.budget_mode ?? "balanced",
      },
      db,
      await runtime(),
    );
    return { ...response, candidates, remaining: d.remaining };
  }
  if (action === "explain-exercise") {
    const v = requestSchemas[action].parse(body),
      e = s.exercises.find((e) => e.id === v.exerciseId && e.is_active);
    if (!e) throw new AppError("NOT_FOUND", "Exercise not found.", 404);
    return generate(
      "explainExercise",
      {
        name: e.name,
        primaryMuscle: e.primary_muscle,
        secondaryMuscles: strings(e.secondary_muscles),
        instructions: strings(e.instructions),
        commonMistakes: strings(e.common_mistakes),
        equipment: strings(e.required_equipment),
      },
      db,
      await runtime(),
      e.id,
    );
  }
  if (action === "weekly-summary") {
    const v = requestSchemas[action].parse(body),
      review = s.reviews.find((r) => r.id === v.reviewId);
    if (!review) throw new AppError("NOT_FOUND", "Weekly review not found.", 404);
    if (review.period_end >= today)
      throw new AppError("INVALID_INPUT", "Choose a completed weekly review.");
    return generate("summarizeWeek", weeklyContext(s, review), db, await runtime(), review.id);
  }
  throw new AppError("NOT_FOUND", "AI action not found.", 404);
}

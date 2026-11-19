import { requestSchemas as aiRequestSchemas } from "../ai/schemas";
import { handleAIAction } from "../ai/service";
import type { AIRuntime } from "../ai/runtime";
import { matchesFoodQuery } from "../domain/food-catalog";
import { z } from "zod";
import { guidedSetup, estimatePlan } from "../domain/onboarding";
import { requestDb } from "../db/client";
import { AppRepository } from "../repositories/app.repository";
import { getLocalDate, addDays } from "../domain/dates";
import { calculateRecoveryScore } from "../domain/engines";
import { createRequestedChange } from "./recommendation.service";
import { aggregate, workoutLibrary } from "./dashboard.service";
import { budgetSuggestions, budgetSummary, saveReview, substitutions } from "./review.service";
import { AppError, result } from "./errors";
import * as schema from "../validation/schemas";
import { reconcileRewards } from "./rewards.service";
import { handlePushAction } from "./push.service";
export async function handleApi(request: Request, aiRuntime?: AIRuntime): Promise<Response> {
  const headers = { "Cache-Control": "no-store", "Content-Type": "application/json" };
  try {
    const token = request.headers.get("Authorization")?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new AppError("NOT_AUTHENTICATED", "Sign in to continue.", 401);
    const db = requestDb(token);
    const { data: auth, error } = await db.auth.getUser(token);
    if (error || !auth.user)
      throw new AppError("NOT_AUTHENTICATED", "Your session expired. Please sign in again.", 401);
    const userId = auth.user.id,
      repo = new AppRepository(db, userId),
      url = new URL(request.url),
      path = url.pathname.replace(/\/$/, ""),
      method = request.method,
      today = getLocalDate(
        new Date(),
        (await result(db.from("profiles").select("timezone").eq("user_id", userId).maybeSingle()))
          ?.timezone ?? "Africa/Blantyre",
      );
    const read = (end = today) => repo.snapshot(addDays(end, -28), end);
    const body = async () => {
      if (Number(request.headers.get("content-length") ?? 0) > 100000)
        throw new AppError("INVALID_INPUT", "Request is too large.", 413);
      try {
        return await request.json();
      } catch {
        throw new AppError("INVALID_INPUT", "A valid JSON body is required.");
      }
    };
    let data: unknown = null;
    if (path.startsWith("/api/push/"))
      return new Response(
        JSON.stringify({
          data: await handlePushAction(db, path, method, method === "GET" ? {} : await body()),
        }),
        { headers },
      );
    if (method === "GET") {
      const requestedDay =
        path === "/api/daily-logs" ? schema.date.parse(url.searchParams.get("date")) : today;
      const s = await read(requestedDay);
      if (path === "/api/daily-logs") {
        const d = aggregate(s, requestedDay);
        data = {
          date: requestedDay,
          waterTotal: d.waterTotal,
          recovery: d.recovery,
          weight: d.todayWeight,
        };
      } else if (path === "/api/dashboard") {
        const rewards = await reconcileRewards(db);
        data = {
          ...aggregate(s, today),
          rewards: rewards ? { totalXp: rewards.totalXp, todayXp: rewards.todayXp } : null,
        };
      } else if (path === "/api/foods") {
        const query = (url.searchParams.get("q") ?? "").toLowerCase();
        data = s.foods.filter((f) =>
          matchesFoodQuery({ name: f.name, aliases: f.local_name, category: f.category }, query),
        );
      } else if (path === "/api/budget")
        data = { items: budgetSuggestions(s), summary: budgetSummary(s, today) };
      else if (path === "/api/substitutions")
        data = substitutions(
          s,
          schema.id.parse(url.searchParams.get("foodId")),
          z.coerce
            .number()
            .positive()
            .max(10000)
            .parse(url.searchParams.get("grams") ?? 100),
        );
      else if (path === "/api/reviews") data = s.reviews;
      else if (path.startsWith("/api/reviews/")) {
        const rid = schema.id.parse(path.split("/")[3]);
        data = s.reviews.find((r) => r.id === rid);
        if (!data) throw new AppError("NOT_FOUND", "Review not found.", 404);
      } else if (path === "/api/progress/weight") data = aggregate(s, today).weight;
      else if (path === "/api/progress/strength") data = aggregate(s, today).lifts;
      else if (path === "/api/nutrition/today") data = aggregate(s, today).meals;
      else if (path === "/api/workouts/today") data = aggregate(s, today).workout;
      else if (path === "/api/workouts") data = workoutLibrary(s, today);
      else if (/^\/api\/workouts\/[^/]+$/.test(path)) {
        const id = schema.id.parse(path.split("/")[3]);
        data = workoutLibrary(s, today).find((w) => w.id === id);
        if (!data) throw new AppError("NOT_FOUND", "Workout not found in your current plan.", 404);
      } else if (path.match(/^\/api\/photos\/[^/]+\/url$/)) {
        const photo = s.photos.find((p) => p.id === schema.id.parse(path.split("/")[3]));
        if (!photo) throw new AppError("NOT_FOUND", "Photo not found.", 404);
        data = await result(
          db.storage.from("progress-photos").createSignedUrl(photo.storage_path, 60),
        );
      } else throw new AppError("NOT_FOUND", "Endpoint not found.", 404);
    } else if (method === "POST" || method === "PATCH" || method === "DELETE") {
      if (path.startsWith("/api/ai/") && method === "POST") {
        const raw = await body();
        const action = path.split("/")[3] ?? "";
        let end = today;
        if (action === "weekly-summary") {
          const v = aiRequestSchemas["weekly-summary"].parse(raw);
          const review = await result(
            db
              .from("weekly_analyses")
              .select("period_end")
              .eq("id", v.reviewId)
              .eq("user_id", userId)
              .single(),
          );
          end = review.period_end;
        }
        data = await handleAIAction(action, raw, await read(end), db, today, aiRuntime);
      } else if (path === "/api/nutrition/logs/batch" && method === "POST") {
        const v = z
          .object({
            date: schema.date,
            items: z
              .array(schema.logFood.omit({ date: true }))
              .min(1)
              .max(20),
          })
          .strict()
          .parse(await body());
        data = await result(
          db.rpc("log_food_batch", {
            p_date: v.date,
            p_items: JSON.parse(JSON.stringify(v.items)),
          }),
        );
      } else if (path === "/api/setup/preview" && method === "POST") {
        data = estimatePlan(guidedSetup.parse(await body()));
      } else if (path === "/api/setup" && method === "POST") {
        const v = guidedSetup.parse(await body());
        data = await result(
          db.rpc("guided_initialize", {
            p_input: JSON.parse(JSON.stringify(v)),
            p_targets: estimatePlan(v).targets,
          }),
        );
      } else if (path === "/api/profile" && method === "POST") {
        const v = schema.onboarding.parse(await body());
        data = await result(
          db.rpc("initialize_profile", {
            p_profile: v.profile,
            p_targets: v.targets,
            p_equipment: v.equipment,
          }),
        );
      } else if (path === "/api/weight" && method === "POST") {
        const v = schema.weight.parse(await body());
        data = await result(
          db
            .from("weight_logs")
            .upsert({ ...v, user_id: userId }, { onConflict: "user_id,date" })
            .select()
            .single(),
        );
      } else if (path === "/api/recovery" && method === "POST") {
        const v = schema.recovery.parse(await body()),
          score = calculateRecoveryScore(v);
        data = await result(
          db
            .from("recovery_logs")
            .upsert(
              { ...v, user_id: userId, recovery_score: score.score, status: score.status },
              { onConflict: "user_id,date" },
            )
            .select()
            .single(),
        );
      } else if (path === "/api/water" && method === "POST") {
        const v = schema.water.parse(await body());
        data = await result(
          db
            .from("water_logs")
            .upsert({ ...v, user_id: userId }, { onConflict: "id", ignoreDuplicates: true })
            .select(),
        );
      } else if (path === "/api/nutrition/logs" && method === "POST") {
        const v = schema.logFood.parse(await body());
        data = await result(
          db.rpc("log_food", {
            p_id: v.id,
            p_date: v.date,
            p_slot: v.slot,
            p_food: v.foodId,
            p_grams: v.grams,
          }),
        );
      } else if (path.match(/^\/api\/nutrition\/items\/[^/]+$/) && method === "DELETE") {
        const iid = schema.id.parse(path.split("/")[4]);
        const item = await result(
          db.from("nutrition_log_items").select("nutrition_log_id").eq("id", iid).single(),
        );
        const log = await result(
          db.from("nutrition_logs").select("date").eq("id", item.nutrition_log_id).single(),
        );
        data = await result(db.from("nutrition_log_items").delete().eq("id", iid).select());
      } else if (path === "/api/meals/log" && method === "POST") {
        const v = z
          .object({
            id: schema.id,
            mealId: schema.id,
            date: schema.date,
            slot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
          })
          .parse(await body());
        data = await result(
          db.rpc("log_meal", { p_id: v.id, p_meal: v.mealId, p_date: v.date, p_slot: v.slot }),
        );
      } else if (path === "/api/training/initial-load" && method === "POST") {
        const v = z
          .object({ id: schema.id, weight: z.number().min(0).max(1000) })
          .parse(await body());
        data = await result(db.rpc("initial_exercise_load", { p_id: v.id, p_weight: v.weight }));
      } else if (path === "/api/foods" && method === "POST") {
        const v = schema.food.parse(await body());
        data = await result(
          db
            .from("foods")
            .insert({ ...v, user_id: userId, source: "user-provided" })
            .select()
            .single(),
        );
      } else if (
        /^\/api\/foods\/[^/]+$/.test(path) &&
        (method === "PATCH" || method === "DELETE")
      ) {
        const foodId = schema.id.parse(path.split("/")[3]);
        const owned = await result(db.from("foods").select("user_id").eq("id", foodId).single());
        if (owned.user_id !== userId)
          throw new AppError("INVALID_INPUT", "Only your custom foods can be edited.", 403);
        data =
          method === "DELETE"
            ? await result(
                db
                  .from("foods")
                  .update({ is_active: false })
                  .eq("id", foodId)
                  .eq("user_id", userId)
                  .select(),
              )
            : await result(
                db
                  .from("foods")
                  .update(schema.food.parse(await body()))
                  .eq("id", foodId)
                  .eq("user_id", userId)
                  .select(),
              );
      } else if (path === "/api/prices" && method === "POST") {
        const v = schema.price.parse(await body());
        data = await result(
          db
            .from("food_prices")
            .insert({ ...v, user_id: userId })
            .select()
            .single(),
        );
      } else if (path === "/api/measurements" && method === "POST") {
        const v = schema.measurements.parse(await body());
        data = await result(
          db
            .from("body_measurements")
            .upsert(
              {
                date: v.date,
                ...(v.waist_cm === undefined ? {} : { waist_cm: v.waist_cm }),
                ...(v.chest_cm === undefined ? {} : { chest_cm: v.chest_cm }),
                ...(v.arm_cm === undefined ? {} : { arm_cm: v.arm_cm }),
                ...(v.thigh_cm === undefined ? {} : { thigh_cm: v.thigh_cm }),
                user_id: userId,
              },
              { onConflict: "user_id,date" },
            )
            .select()
            .single(),
        );
      } else if (path === "/api/photos" && method === "POST") {
        const v = schema.photo.parse(await body());
        if (!v.storage_path.startsWith(`${userId}/`))
          throw new AppError("INVALID_INPUT", "Invalid photo path.");
        data = await result(
          db
            .from("progress_photos")
            .insert({ ...v, user_id: userId })
            .select()
            .single(),
        );
      } else if (path === "/api/load-options" && method === "POST") {
        const v = schema.load.parse(await body());
        if (v.exercise_id) {
          const exercise = await result(
            db.from("exercises").select("equipment").eq("id", v.exercise_id).single(),
          );
          if (exercise.equipment !== v.equipment_type)
            throw new AppError("INVALID_INPUT", "Choose the equipment used by this exercise.");
        }
        data = await result(
          db
            .from("gym_load_options")
            .insert({ ...v, user_id: userId })
            .select()
            .single(),
        );
      } else if (/^\/api\/load-options\/[^/]+$/.test(path) && method === "DELETE") {
        data = await result(
          db
            .from("gym_load_options")
            .delete()
            .eq("id", schema.id.parse(path.split("/")[3]))
            .select(),
        );
      } else if (path === "/api/workout-sessions" && method === "POST") {
        const v = z
          .object({
            templateId: schema.id,
            allowUnscheduled: z.boolean().optional().default(false),
          })
          .parse(await body());
        const sessionId = await result(
          db.rpc("start_workout", {
            p_template: v.templateId,
            p_allow_unscheduled: v.allowUnscheduled,
          }),
        );
        data = await result(db.from("workout_sessions").select("*").eq("id", sessionId).single());
      } else if (path === "/api/sets" && (method === "POST" || method === "PATCH")) {
        const v = schema.setEntry.parse(await body());
        data = await result(
          db.rpc("save_set", {
            p_session: v.sessionId,
            p_exercise: v.exerciseId,
            p_number: v.setNumber,
            p_weight: v.weight,
            p_reps: v.reps,
            p_rir: v.rir,
            p_done: v.done,
          }),
        );
      } else if (path.match(/^\/api\/sets\/[^/]+$/) && method === "DELETE")
        data = await result(db.rpc("delete_set", { p_id: schema.id.parse(path.split("/")[3]) }));
      else if (path.match(/^\/api\/workout-sessions\/[^/]+\/complete$/) && method === "POST") {
        const sid = schema.id.parse(path.split("/")[3]);
        const ss = await result(
          db.from("workout_sessions").select("session_date").eq("id", sid).single(),
        );
        data = await result(db.rpc("complete_workout", { p_session: sid }));
      } else if (/^\/api\/workout-sessions\/[^/]+\/abandon$/.test(path) && method === "POST") {
        const sid = schema.id.parse(path.split("/")[3]);
        const ss = await result(
          db.from("workout_sessions").select("status").eq("id", sid).single(),
        );
        if (ss.status === "completed")
          throw new AppError(
            "WORKOUT_ALREADY_COMPLETED",
            "Completed workouts cannot be abandoned.",
            409,
          );
        data = await result(
          db.from("workout_sessions").update({ status: "abandoned" }).eq("id", sid).select(),
        );
      } else if (path === "/api/checkins/weekly" && method === "POST") {
        const s = await read();
        if (!s.profile) throw new AppError("INVALID_INPUT", "Complete your profile first.");
        data = await saveReview(db, s, today);
      } else if (
        path.match(/^\/api\/recommendations\/[^/]+\/(accept|reject)$/) &&
        method === "POST"
      )
        data = await result(
          db.rpc("resolve_recommendation", {
            p_id: schema.id.parse(path.split("/")[3]),
            p_accept: path.endsWith("/accept"),
          }),
        );
      else if (path === "/api/meals" && (method === "POST" || method === "PATCH")) {
        const raw = await body(),
          v = schema.meal.parse(raw);
        data = await result(
          db.rpc("save_meal", {
            p_id:
              method === "PATCH" || (raw as { id?: unknown }).id
                ? schema.id.parse((raw as { id: unknown }).id)
                : crypto.randomUUID(),
            p_name: v.name,
            p_slot: v.meal_type,
            p_items: v.items,
          }),
        );
      } else if (path === "/api/training/recommendations" && method === "POST") {
        const v = schema.changeRequest.parse(await body());
        data = await createRequestedChange(db, await read(), today, userId, v);
      } else if (path === "/api/settings" && method === "POST") {
        const v = schema.settings.parse(await body());
        data = await result(db.rpc("save_settings", { p_settings: JSON.parse(JSON.stringify(v)) }));
      } else throw new AppError("NOT_FOUND", "Endpoint not found.", 404);
    } else throw new AppError("METHOD_NOT_ALLOWED", "Method not allowed.", 405);
    const rewards =
      method === "POST" &&
      /^\/api\/(weight|water|recovery|nutrition\/logs(?:\/batch)?|meals\/log|workout-sessions\/[^/]+\/complete)$/.test(
        path,
      )
        ? await reconcileRewards(db)
        : undefined;
    return new Response(JSON.stringify({ data, ...(rewards ? { rewards } : {}) }), { headers });
  } catch (error) {
    if (error instanceof z.ZodError)
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_INPUT",
            message: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
          },
        }),
        { status: 400, headers },
      );
    const e =
      error instanceof AppError
        ? error
        : new AppError("INTERNAL_ERROR", "Something went wrong. Please try again.", 500);
    if (!(error instanceof AppError)) console.error("API request failed", error);
    return new Response(JSON.stringify({ error: { code: e.code, message: e.message } }), {
      status: e.status,
      headers,
    });
  }
}

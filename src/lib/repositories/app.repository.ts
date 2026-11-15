import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";
import { result } from "../services/errors";
export type Db = SupabaseClient<Database>;
export type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
// Supabase defaults to 1,000 rows per response. Page history explicitly.
async function all<T>(query: {
  range: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { code?: string; message: string } | null }>;
}) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await result(query.range(offset, offset + 999));
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}
export class AppRepository {
  constructor(
    readonly db: Db,
    readonly userId: string,
  ) {}
  async snapshot(start: string, end: string) {
    const db = this.db,
      u = this.userId;
    const [
      profile,
      preferences,
      targets,
      foods,
      prices,
      meals,
      mealItems,
      logs,
      items,
      programs,
      weeks,
      templates,
      planned,
      exercises,
      sessions,
      sets,
      weights,
      recovery,
      water,
      measurements,
      photos,
      checkins,
      reviews,
      recommendations,
      loads,
      equipment,
      loggingDays,
    ] = await Promise.all([
      result(db.from("profiles").select("*").eq("user_id", u).maybeSingle()),
      result(db.from("user_preferences").select("*").eq("user_id", u).maybeSingle()),
      all(db.from("nutrition_targets").select("*").eq("user_id", u).order("version")),
      all(db.from("foods").select("*").eq("is_active", true).order("name").order("id")),
      all(
        db
          .from("food_prices")
          .select("*")
          .eq("user_id", u)
          .order("recorded_at", { ascending: false }),
      ),
      all(db.from("meals").select("*").eq("user_id", u).order("name")),
      all(db.from("meal_items").select("*").eq("user_id", u).order("id")),
      all(
        db
          .from("nutrition_logs")
          .select("*")
          .eq("user_id", u)
          .gte("date", start)
          .lte("date", end)
          .order("id"),
      ),
      all(
        db
          .from("nutrition_log_items")
          .select("*, nutrition_logs!inner(date)")
          .eq("user_id", u)
          .gte("nutrition_logs.date", start)
          .lte("nutrition_logs.date", end)
          .order("id"),
      ),
      all(db.from("training_programs").select("*").eq("user_id", u).order("version")),
      all(db.from("program_weeks").select("*").eq("user_id", u).order("id")),
      all(
        db.from("workout_templates").select("*").eq("user_id", u).order("sort_order").order("id"),
      ),
      all(
        db
          .from("workout_template_exercises")
          .select("*")
          .eq("user_id", u)
          .order("sort_order")
          .order("id"),
      ),
      all(db.from("exercises").select("*").eq("is_active", true).order("id")),
      all(
        db.from("workout_sessions").select("*").eq("user_id", u).order("session_date").order("id"),
      ),
      all(db.from("exercise_sets").select("*").eq("user_id", u).order("set_number").order("id")),
      all(db.from("weight_logs").select("*").eq("user_id", u).order("date").order("id")),
      all(
        db
          .from("recovery_logs")
          .select("*")
          .eq("user_id", u)
          .gte("date", start)
          .lte("date", end)
          .order("id"),
      ),
      all(db.from("water_logs").select("*").eq("user_id", u).eq("date", end).order("id")),
      all(db.from("body_measurements").select("*").eq("user_id", u).order("date").order("id")),
      all(
        db.from("progress_photos").select("*").eq("user_id", u).order("date", { ascending: false }),
      ),
      all(db.from("daily_checkins").select("*").eq("user_id", u).order("date").order("id")),
      all(
        db
          .from("weekly_analyses")
          .select("*")
          .eq("user_id", u)
          .order("period_end", { ascending: false }),
      ),
      all(
        db
          .from("recommendations")
          .select("*")
          .eq("user_id", u)
          .order("created_at", { ascending: false }),
      ),
      all(db.from("gym_load_options").select("*").eq("user_id", u).order("id")),
      all(db.from("available_equipment").select("*").eq("user_id", u).order("id")),
      all(db.from("logging_days").select("*").eq("user_id", u).order("date")),
    ]);
    return {
      profile,
      preferences,
      targets,
      foods,
      prices,
      meals,
      mealItems,
      logs,
      items,
      programs,
      weeks,
      templates,
      planned,
      exercises,
      sessions,
      sets,
      weights,
      recovery,
      water,
      measurements,
      photos,
      checkins,
      reviews,
      recommendations,
      loads,
      equipment,
      loggingDays,
    };
  }
}
export type Snapshot = Awaited<ReturnType<AppRepository["snapshot"]>>;

import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
let db: PGlite;
const owner = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002";
const scalar = async <T = string>(sql: string, params: unknown[] = []) =>
  Object.values((await db.query<Record<string, T>>(sql, params)).rows[0]!)[0]!;
const asUser = async (id: string) => {
  await db.exec(
    `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`,
  );
};
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant all on storage.objects to authenticated;create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
 `);
  for (const f of readdirSync("supabase/migrations").sort())
    await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  await db.query("insert into auth.users(id) values($1),($2)", [owner, other]);
  await asUser(owner);
  await db.query("select public.initialize_profile($1,$2,$3)", [
    JSON.stringify({ name: "Fixture", height: 175, weight: 60, goal: 68 }),
    JSON.stringify({ kcal: 2500, protein: 120, carbs: 330, fat: 65 }),
    JSON.stringify(["bodyweight", "barbell"]),
  ]);
});
afterAll(async () => {
  await db.close();
});
describe("database policies and complete workflows", () => {
  it("creates an equipment-aware program and makes setup idempotent", async () => {
    expect(Number(await scalar("select count(*) from public.profiles"))).toBe(1);
    expect(Number(await scalar("select count(*) from public.workout_templates"))).toBe(4);
    expect(
      Number(
        await scalar(
          "select count(*) from public.workout_template_exercises p join public.exercises e on e.id=p.exercise_id where e.equipment not in ('bodyweight','barbell')",
        ),
      ),
    ).toBe(0);
    await db.query("select public.initialize_profile($1,$2,$3)", ["{}", "{}", "[]"]);
    expect(Number(await scalar("select count(*) from public.training_programs"))).toBe(1);
  });
  it("isolates users, protects child rows and prevents owner reassignment", async () => {
    await asUser(other);
    expect(Number(await scalar("select count(*) from public.profiles"))).toBe(0);
    const denied = await db.query(
      "update public.profiles set first_name=$1 where user_id=$2 returning id",
      ["intruder", owner],
    );
    expect(denied.rows).toHaveLength(0);
    await asUser(owner);
    await expect(db.query("update public.profiles set user_id=$1", [other])).rejects.toThrow();
  });
  it("upserts weight and recovery without duplicate days", async () => {
    await db.query(
      "insert into public.weight_logs(user_id,date,weight_kg) values($1,current_date,60) on conflict(user_id,date) do update set weight_kg=excluded.weight_kg",
      [owner],
    );
    await db.query(
      "insert into public.weight_logs(user_id,date,weight_kg) values($1,current_date,61) on conflict(user_id,date) do update set weight_kg=excluded.weight_kg",
      [owner],
    );
    expect(Number(await scalar("select weight_kg from public.weight_logs"))).toBe(61);
    await db.query(
      "insert into public.recovery_logs(user_id,date,sleep_hours,energy,soreness,stress,recovery_score,status) values($1,current_date,8,4,2,2,85,'good') on conflict(user_id,date) do update set sleep_hours=excluded.sleep_hours",
      [owner],
    );
    expect(Number(await scalar("select count(*) from public.recovery_logs"))).toBe(1);
  });
  it("snapshots nutrients and handles retries without duplicate meal items", async () => {
    const food = await scalar(
      "insert into public.foods(user_id,name,category,preparation_state,source,calories_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g) values($1,'Test label','staple','dry','fixture',400,10,70,8) returning id",
      [owner],
    );
    const log = crypto.randomUUID();
    await db.query("select public.log_food($1,current_date,'breakfast',$2,50)", [log, food]);
    await db.query("select public.log_food($1,current_date,'breakfast',$2,50)", [log, food]);
    await db.query("update public.foods set calories_per_100g=500 where id=$1", [food]);
    expect(
      Number(
        await scalar("select calories from public.nutrition_log_items where nutrition_log_id=$1", [
          log,
        ]),
      ),
    ).toBe(200);
    expect(
      Number(
        await scalar("select count(*) from public.nutrition_log_items where nutrition_log_id=$1", [
          log,
        ]),
      ),
    ).toBe(1);
    const placeholder = await scalar("select id from public.foods where user_id is null limit 1");
    await expect(
      db.query("select public.log_food($1,current_date,'lunch',$2,100)", [
        crypto.randomUUID(),
        placeholder,
      ]),
    ).rejects.toThrow("INVALID_INPUT");
    const mid = crypto.randomUUID();
    await db.query("select public.save_meal($1,'Lunch','lunch',$2)", [
      mid,
      JSON.stringify([{ food_id: food, grams: 100 }]),
    ]);
    await db.query("select public.save_meal($1,'Edited lunch','lunch',$2)", [
      mid,
      JSON.stringify([{ food_id: food, grams: 200 }]),
    ]);
    const mealLog = crypto.randomUUID();
    await db.query("select public.log_meal($1,$2,current_date,'lunch')", [mealLog, mid]);
    expect(
      Number(
        await scalar("select calories from public.nutrition_log_items where nutrition_log_id=$1", [
          mealLog,
        ]),
      ),
    ).toBe(1000);
  });
  it("saves, edits, removes and completes sets with immutable completed sessions", async () => {
    const tid = await scalar("select id from public.workout_templates order by sort_order limit 1");
    const plans = (
      await db.query<{ exercise_id: string; sets: number }>(
        "select exercise_id,sets from public.workout_template_exercises where workout_template_id=$1",
        [tid],
      )
    ).rows;
    await db.query(
      "update public.workout_templates set day_of_week=extract(dow from current_date)::integer where id=$1",
      [tid],
    );
    const sid = await scalar("select public.start_workout($1)", [tid]);
    expect(await scalar("select public.start_workout($1)", [tid])).toBe(sid);
    await expect(db.query("select public.complete_workout($1)", [sid])).rejects.toThrow(
      "INVALID_INPUT",
    );
    for (const plan of plans)
      for (let i = 1; i <= plan.sets; i++)
        await db.query("select public.save_set($1,$2,$3,40,10,2,true)", [sid, plan.exercise_id, i]);
    const set = await scalar("select public.save_set($1,$2,1,40,12,2,true)", [
      sid,
      plans[0]!.exercise_id,
    ]);
    expect(Number(await scalar("select reps from public.exercise_sets where id=$1", [set]))).toBe(
      12,
    );
    await db.query("select public.delete_set($1)", [set]);
    await db.query("select public.save_set($1,$2,1,40,12,2,true)", [sid, plans[0]!.exercise_id]);
    await db.query("update public.workout_sessions set status='abandoned' where id=$1", [sid]);
    expect(await scalar("select public.start_workout($1)", [tid])).toBe(sid);
    expect(await scalar("select status from public.workout_sessions where id=$1", [sid])).toBe(
      "in_progress",
    );
    await db.query("select public.complete_workout($1)", [sid]);
    await db.query("select public.complete_workout($1)", [sid]);
    expect(await scalar("select status from public.workout_sessions where id=$1", [sid])).toBe(
      "completed",
    );
    expect(await scalar<boolean>("select workout_requirement_met from public.daily_checkins")).toBe(
      true,
    );
    await expect(
      db.query("select public.save_set($1,$2,1,45,10,2,true)", [sid, plans[0]!.exercise_id]),
    ).rejects.toThrow("WORKOUT_ALREADY_COMPLETED");
  });
  it("persists reviews once and accepts versioned changes once", async () => {
    const target = await scalar(
      "select id from public.nutrition_targets where effective_to is null",
    );
    const recs = [
      {
        type: "nutrition_adjustment",
        title: "Add 150",
        reason: "Fixture",
        currentValue: 2500,
        recommendedValue: 2650,
        unit: "kcal",
        payload: { targetId: target },
      },
    ];
    const rid = await scalar("select public.save_review(current_date-6,current_date,$1,$2)", [
      JSON.stringify({ completeness: 1, confidence: 1 }),
      JSON.stringify(recs),
    ]);
    const retry = await scalar("select public.save_review(current_date-6,current_date,$1,$2)", [
      JSON.stringify({ completeness: 0, confidence: 0 }),
      "[]",
    ]);
    expect(retry).toBe(rid);
    const rec = await scalar("select id from public.recommendations where weekly_analysis_id=$1", [
      rid,
    ]);
    await db.query("select public.resolve_recommendation($1,true)", [rec]);
    await db.query("select public.resolve_recommendation($1,true)", [rec]);
    expect(Number(await scalar("select count(*) from public.nutrition_targets"))).toBe(2);
    expect(
      Number(
        await scalar(
          "select calories_target from public.nutrition_targets where effective_to is null",
        ),
      ),
    ).toBe(2650);
    await expect(db.query("select public.resolve_recommendation($1,false)", [rec])).rejects.toThrow(
      "RECOMMENDATION_ALREADY_RESOLVED",
    );
    const rid2 = await scalar("select public.save_review(current_date-7,current_date-1,$1,$2)", [
      JSON.stringify({ completeness: 1, confidence: 1 }),
      JSON.stringify([{ ...recs[0], payload: { targetId: target } }]),
    ]);
    const rec2 = await scalar("select id from public.recommendations where weekly_analysis_id=$1", [
      rid2,
    ]);
    await db.query("select public.resolve_recommendation($1,false)", [rec2]);
    expect(Number(await scalar("select count(*) from public.nutrition_targets"))).toBe(2);
  });
  it("keeps photo objects private to their owner", async () => {
    await db.query("insert into storage.objects(bucket_id,name) values('progress-photos',$1)", [
      `${owner}/photo.jpg`,
    ]);
    await asUser(other);
    expect(
      Number(
        await scalar("select count(*) from storage.objects where bucket_id='progress-photos'"),
      ),
    ).toBe(0);
    await expect(
      db.query("insert into storage.objects(bucket_id,name) values('progress-photos',$1)", [
        `${owner}/intruder.jpg`,
      ]),
    ).rejects.toThrow();
    await asUser(owner);
  });
});
describe("transaction boundaries", () => {
  it("versions training changes and preserves the old program", async () => {
    const program = await scalar(
      "select id from public.training_programs where effective_to is null",
    );
    const plan = await scalar(
      "select id from public.workout_template_exercises order by sort_order limit 1",
    );
    const oldWeight = Number(
      await scalar("select planned_weight_kg from public.workout_template_exercises where id=$1", [
        plan,
      ]),
    );
    const rid = await scalar("select public.save_review(current_date-13,current_date-7,$1,$2)", [
      JSON.stringify({ completeness: 1, confidence: 1 }),
      JSON.stringify([
        {
          type: "exercise_load_progression",
          title: "Increase load",
          reason: "Fixture",
          currentValue: oldWeight,
          recommendedValue: oldWeight + 2.5,
          payload: { programId: program, templateExerciseId: plan },
        },
      ]),
    ]);
    const rec = await scalar("select id from public.recommendations where weekly_analysis_id=$1", [
      rid,
    ]);
    await db.query("select public.resolve_recommendation($1,true)", [rec]);
    expect(Number(await scalar("select count(*) from public.training_programs"))).toBe(2);
    expect(
      Number(
        await scalar(
          "select planned_weight_kg from public.workout_template_exercises where id=$1",
          [plan],
        ),
      ),
    ).toBe(oldWeight);
    expect(
      await scalar("select effective_to is not null from public.training_programs where id=$1", [
        program,
      ]),
    ).toBe(true);
  });
  it("rolls back the entire recommendation if the new target is invalid", async () => {
    const target = await scalar(
      "select id from public.nutrition_targets where effective_to is null",
    );
    const rid = await scalar("select public.save_review(current_date-14,current_date-8,$1,$2)", [
      JSON.stringify({ completeness: 1, confidence: 1 }),
      JSON.stringify([
        {
          type: "nutrition_adjustment",
          title: "Invalid fixture",
          reason: "Fixture",
          recommendedValue: 20000,
          payload: { targetId: target },
        },
      ]),
    ]);
    const rec = await scalar("select id from public.recommendations where weekly_analysis_id=$1", [
      rid,
    ]);
    await expect(
      db.query("select public.resolve_recommendation($1,true)", [rec]),
    ).rejects.toThrow();
    expect(await scalar("select id from public.nutrition_targets where effective_to is null")).toBe(
      target,
    );
    expect(await scalar("select status from public.recommendations where id=$1", [rec])).toBe(
      "pending",
    );
  });
  it("updates daily completion within the log transaction", async () => {
    const id = await scalar(
      "insert into public.water_logs(user_id,date,amount_ml) values($1,current_date,2500) returning id",
      [owner],
    );
    expect(
      await scalar<boolean>(
        "select water_logged from public.daily_checkins where date=current_date",
      ),
    ).toBe(true);
    await db.query("delete from public.water_logs where id=$1", [id]);
    expect(
      await scalar<boolean>(
        "select water_logged from public.daily_checkins where date=current_date",
      ),
    ).toBe(false);
  });
});

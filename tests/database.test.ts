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
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant all on storage.objects to authenticated;create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
 `);
  for (const f of readdirSync("supabase/migrations").sort())
    await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  await db.query("insert into auth.users(id) values($1),($2)", [owner, other]);
  await asUser(owner);
  await db.query("select public.initialize_profile($1,$2,$3)", [
    JSON.stringify({ name: "Fixture", height: 175, weight: 60, goal: 68 }),
    JSON.stringify({ kcal: 2500, protein: 120, carbs: 330, fat: 65 }),
    JSON.stringify(["bodyweight", "barbell", "bench", "squat_rack"]),
  ]);
});
afterAll(async () => {
  await db.close();
});
describe("persistent XP ledger", () => {
  afterAll(async () => {
    await asUser(owner);
  });
  const rewardOwner = "00000000-0000-4000-8000-000000000333";
  const sync = async () =>
    JSON.parse(
      JSON.stringify(await scalar<Record<string, unknown>>("select public.reconcile_rewards()")),
    ) as { totalXp: number; todayXp: number; grants: { kind: string; points: number }[] };
  it("starts at rollout and awards saved facts once, including retries and edits", async () => {
    await db.exec("reset role");
    await db.query("insert into auth.users(id) values($1)", [rewardOwner]);
    await asUser(rewardOwner);
    await db.query("select public.initialize_profile($1,$2,$3)", [
      JSON.stringify({ name: "Reward fixture", height: 175, weight: 60, goal: 68 }),
      JSON.stringify({ kcal: 2500, protein: 120, carbs: 330, fat: 65 }),
      JSON.stringify(["bodyweight"]),
    ]);
    await db.query("update public.user_preferences set completion_policy=$1 where user_id=$2", [
      JSON.stringify({
        weight: true,
        nutrition: true,
        workout: false,
        recovery: true,
        water: true,
      }),
      rewardOwner,
    ]);
    await db.query(
      "insert into public.weight_logs(user_id,date,weight_kg) values($1,'2026-11-18',60),($1,current_date,61)",
      [rewardOwner],
    );
    expect((await sync()).totalXp).toBe(50);
    expect((await sync()).grants).toEqual([]);
    await db.query(
      "update public.weight_logs set weight_kg=62 where user_id=$1 and date=current_date",
      [rewardOwner],
    );
    await db.query(
      "insert into public.water_logs(user_id,date,amount_ml) values($1,current_date,250)",
      [rewardOwner],
    );
    const r = await sync();
    expect(r.totalXp).toBe(65);
    expect(r.grants).toEqual([expect.objectContaining({ kind: "water", points: 15 })]);
    await db.query("delete from public.weight_logs where user_id=$1 and date=current_date", [
      rewardOwner,
    ]);
    await db.query(
      "insert into public.weight_logs(user_id,date,weight_kg) values($1,current_date,63)",
      [rewardOwner],
    );
    expect((await sync()).totalXp).toBe(65);
  });
  it("rejects fabricated, future, foreign and mutable rewards", async () => {
    await asUser(rewardOwner);
    await expect(
      db.query(
        "insert into app_private.reward_ledger(user_id,reward_date,kind,slot) values($1,current_date,'meal','lunch')",
        [rewardOwner],
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into app_private.reward_ledger(user_id,reward_date,kind) values($1,current_date+1,'weight')",
        [rewardOwner],
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into app_private.reward_ledger(user_id,reward_date,kind) values($1,current_date,'water')",
        [owner],
      ),
    ).rejects.toThrow();
    await expect(
      db.query("update app_private.reward_ledger set kind='quests' where user_id=$1", [
        rewardOwner,
      ]),
    ).rejects.toThrow();
    await expect(
      db.query("delete from app_private.reward_ledger where user_id=$1", [rewardOwner]),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into app_private.reward_ledger(user_id,reward_date,kind,points) values($1,current_date,'quests',9999)",
        [rewardOwner],
      ),
    ).rejects.toThrow();
    await asUser(other);
    expect(Number(await scalar("select count(*) from app_private.reward_ledger"))).toBe(0);
    await asUser(rewardOwner);
  });
  it("awards per-slot food and completion bonuses from actual targets and requirements", async () => {
    await asUser(rewardOwner);
    const food = await scalar(
      "select id from public.foods where is_active and calories_per_100g>0 limit 1",
    );
    for (const slot of ["breakfast", "lunch", "snack", "dinner"]) {
      const nid = await scalar(
        "insert into public.nutrition_logs(user_id,date,meal_type) values($1,current_date,$2) returning id",
        [rewardOwner, slot],
      );
      await db.query(
        "insert into public.nutrition_log_items(user_id,nutrition_log_id,food_id,grams,name,calories,protein_g,carbs_g,fat_g) values($1,$2,$3,100,'Fixture',625,10,100,20)",
        [rewardOwner, nid, food],
      );
    }
    expect((await sync()).totalXp).toBe(165); // 65 + 4x15 + 40; quests are not yet complete.
    await db.query(
      "insert into public.water_logs(user_id,date,amount_ml) values($1,current_date,2250)",
      [rewardOwner],
    );
    await db.query(
      "insert into public.recovery_logs(user_id,date,sleep_hours,energy,soreness,stress,recovery_score,status) values($1,current_date,8,3,2,2,80,'good')",
      [rewardOwner],
    );
    const r = await sync();
    expect(r.totalXp).toBe(280);
    expect(r.grants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "recovery", points: 15 }),
        expect.objectContaining({ kind: "quests", points: 100 }),
      ]),
    );
    expect((await sync()).grants).toEqual([]);
  });
  it("does not reward a zero-requirement day or a merely started workout", async () => {
    await asUser(rewardOwner);
    const tid = await scalar("select id from public.workout_templates limit 1");
    await db.query(
      "update public.workout_templates set day_of_week=extract(dow from current_date)::integer where id=$1",
      [tid],
    );
    const sid = await scalar("select public.start_workout($1)", [tid]);
    expect((await sync()).grants).toEqual([]);
    const plans = await db.query<{ exercise_id: string; sets: number }>(
      "select exercise_id,sets from public.workout_template_exercises where workout_template_id=$1",
      [tid],
    );
    for (const p of plans.rows)
      for (let n = 1; n <= p.sets; n++)
        await db.query("select public.save_set($1,$2,$3,0,10,2,true)", [sid, p.exercise_id, n]);
    await db.query("select public.complete_workout($1)", [sid]);
    expect((await sync()).grants).toEqual([
      expect.objectContaining({ kind: "workout", points: 100 }),
    ]);
    await expect(
      db.query("update public.user_preferences set completion_policy=$1 where user_id=$2", [
        JSON.stringify({
          weight: false,
          nutrition: false,
          workout: false,
          recovery: false,
          water: false,
        }),
        rewardOwner,
      ]),
    ).rejects.toThrow();
    expect((await sync()).totalXp).toBe(380);
  });
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
    await db.query(
      "insert into public.gym_load_options(user_id,exercise_id,equipment_type,increment_kg,minimum_kg,maximum_kg) select user_id,exercise_id,e.equipment,2.5,0,200 from public.workout_template_exercises p join public.exercises e on e.id=p.exercise_id where p.id=$1",
      [plan],
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
describe("expanded settings and recommendation lifecycle", () => {
  let period = 1;
  const makeRec = async (
    type: string,
    payload: Record<string, unknown>,
    recommendedValue?: number,
  ) => {
    const rid = await scalar(
      "select public.save_review(current_date-$1::integer,current_date,$2,$3)",
      [
        ++period,
        JSON.stringify({ completeness: 1, confidence: 1 }),
        JSON.stringify([
          {
            type,
            title: "Extended fixture",
            reason: "Fixture",
            payload,
            ...(recommendedValue === undefined ? {} : { recommendedValue }),
          },
        ]),
      ],
    );
    return scalar("select id from public.recommendations where weekly_analysis_id=$1", [rid]);
  };
  const active = () => scalar("select id from public.training_programs where effective_to is null");
  const plan = async () =>
    (
      await db.query<{ id: string; sets: number; exercise_id: string; lineage_id: string }>(
        "select p.* from public.workout_template_exercises p join public.workout_templates t on t.id=p.workout_template_id join public.program_weeks w on w.id=t.program_week_id join public.training_programs pg on pg.id=w.training_program_id where pg.effective_to is null order by t.sort_order,p.sort_order limit 1",
      )
    ).rows[0]!;
  beforeAll(async () => {
    await asUser(other);
    await db.query("select public.initialize_profile($1,$2,$3)", [
      JSON.stringify({ name: "Settings fixture", height: 175, weight: 60, goal: 68 }),
      JSON.stringify({ kcal: 2500, protein: 120, carbs: 330, fat: 65 }),
      JSON.stringify(["bodyweight", "dumbbell"]),
    ]);
  });
  it("changes frequency, equipment, profile and completion requirements atomically", async () => {
    await db.query("select public.save_settings($1)", [
      JSON.stringify({
        first_name: "Updated",
        water_target_ml: 3000,
        diet_type: "vegetarian",
        budget_mode: "budget",
        days: [1, 3, 5],
        height_cm: 180,
        goal_weight_kg: 72,
        target_date: "2027-12-01",
        training_experience: "intermediate",
        equipment: ["bodyweight"],
        completion_policy: {
          weight: false,
          nutrition: true,
          workout: true,
          recovery: true,
          water: false,
        },
      }),
    ]);
    expect(Number(await scalar("select training_days_per_week from public.profiles"))).toBe(3);
    expect(Number(await scalar("select height_cm from public.profiles"))).toBe(180);
    expect(
      await scalar<boolean>(
        "select is_available from public.available_equipment where equipment_type='dumbbell'",
      ),
    ).toBe(false);
    expect(
      Number(
        await scalar(
          "select count(*) from public.workout_templates t join public.program_weeks w on w.id=t.program_week_id join public.training_programs p on p.id=w.training_program_id where p.effective_to is null",
        ),
      ),
    ).toBe(3);
    expect(
      await scalar<boolean>(
        "select (completion_policy->>'water')::boolean from public.daily_checkins where date=current_date",
      ),
    ).toBe(false);
    // Restore dumbbells for subsequent valid substitutions.
    await db.query(
      "update public.available_equipment set is_available=true where equipment_type='dumbbell'",
    );
  });
  it("restores lower-body templates when growing from one training day", async () => {
    const save = (days: number[]) =>
      db.query("select public.save_settings($1)", [
        JSON.stringify({
          first_name: "Updated",
          water_target_ml: 3000,
          diet_type: "vegetarian",
          budget_mode: "budget",
          days,
        }),
      ]);
    await save([1]);
    await save([1, 2, 4, 5]);
    const names = (
      await db.query<{ name: string }>(
        "select t.name from public.workout_templates t join public.program_weeks w on w.id=t.program_week_id join public.training_programs p on p.id=w.training_program_id where p.effective_to is null order by t.sort_order",
      )
    ).rows.map((t) => t.name);
    expect(names).toEqual(["Upper A", "Lower A", "Upper B", "Lower B"]);
    await save([1, 3, 5]);
  });
  it("versions volume changes and retains comparable history identifiers", async () => {
    const pg = await active(),
      p = await plan();
    const rec = await makeRec(
      "training_volume_adjustment",
      { programId: pg, templateExerciseId: p.id },
      p.sets + 1,
    );
    await db.query("select public.resolve_recommendation($1,true)", [rec]);
    expect(
      Number(
        await scalar("select sets from public.workout_template_exercises where id=$1", [p.id]),
      ),
    ).toBe(p.sets);
    expect(
      Number(
        await scalar(
          "select sets from public.workout_template_exercises where lineage_id=$1 and id<>$2 order by id limit 1",
          [p.lineage_id, p.id],
        ),
      ),
    ).toBeGreaterThanOrEqual(p.sets);
    expect((await plan()).lineage_id).toBe(p.lineage_id);
    expect((await plan()).sets).toBe(p.sets + 1);
  });
  it("applies an equipment-compatible substitute without rewriting old sessions", async () => {
    const pg = await active(),
      p = await plan();
    const replacement = await scalar(
      "select id from public.exercises e where primary_muscle=(select primary_muscle from public.exercises where id=$1) and id<>$1 and equipment in ('bodyweight','dumbbell') order by slug limit 1",
      [p.exercise_id],
    );
    const rec = await makeRec("exercise_substitution", {
      programId: pg,
      templateExerciseId: p.id,
      replacementExerciseId: replacement,
    });
    await db.query("select public.resolve_recommendation($1,true)", [rec]);
    expect((await plan()).exercise_id).toBe(replacement);
    expect((await plan()).lineage_id).not.toBe(p.lineage_id);
    expect(
      await scalar("select exercise_id from public.workout_template_exercises where id=$1", [p.id]),
    ).toBe(p.exercise_id);
  });
  it("deloads for seven days and restores the previous plan only after acceptance", async () => {
    const base = await active(),
      p = await plan();
    const rec = await makeRec("deload", { programId: base });
    await db.query("select public.resolve_recommendation($1,true)", [rec]);
    const deload = await active();
    expect(await scalar("select phase from public.training_programs where id=$1", [deload])).toBe(
      "deload",
    );
    expect((await plan()).sets).toBe(Math.ceil(p.sets / 2));
    expect(
      await scalar<boolean>(
        "select planned_until=current_date+7 from public.training_programs where id=$1",
        [deload],
      ),
    ).toBe(true);
    const restore = await makeRec("training_volume_adjustment", {
      programId: deload,
      action: "restore",
      restoreFromProgramId: base,
    });
    await db.query("select public.resolve_recommendation($1,true)", [restore]);
    await db.query("select public.resolve_recommendation($1,true)", [restore]);
    expect((await plan()).sets).toBe(p.sets);
    expect(
      await scalar("select phase from public.training_programs where effective_to is null"),
    ).toBe("base");
  });
  it("persists expiry and makes conflicting program recommendations expire", async () => {
    const pg = await active(),
      p = await plan(),
      stale = await makeRec(
        "training_volume_adjustment",
        { programId: pg, templateExerciseId: p.id },
        p.sets + 1,
      ),
      rec = await makeRec("deload", { programId: pg });
    await db.query("select public.resolve_recommendation($1,true)", [rec]);
    expect(await scalar("select status from public.recommendations where id=$1", [stale])).toBe(
      "expired",
    );
    const rid = await scalar("select public.save_review(current_date-27,current_date-21,$1,$2)", [
      JSON.stringify({ completeness: 1, confidence: 1 }),
      JSON.stringify([{ type: "keep_current_plan", title: "Old fixture", reason: "Fixture" }]),
    ]);
    await db.query("select public.expire_recommendations()");
    expect(
      await scalar("select status from public.recommendations where weekly_analysis_id=$1", [rid]),
    ).toBe("expired");
  });
  it("keeps historical completion policy when old logs are edited", async () => {
    await db.query(
      "insert into public.weight_logs(user_id,date,weight_kg) values($1,current_date-1,60)",
      [other],
    );
    const before = await scalar<Record<string, boolean>>(
      "select completion_policy from public.daily_checkins where date=current_date-1",
    );
    await db.query(
      `update public.user_preferences set completion_policy='{"weight":true,"nutrition":true,"workout":true,"recovery":true,"water":true}'`,
    );
    await db.query("update public.weight_logs set weight_kg=61 where date=current_date-1");
    expect(
      await scalar("select completion_policy from public.daily_checkins where date=current_date-1"),
    ).toEqual(before);
  });
  it("imports only source-backed foods and retains unknown local dishes", async () => {
    expect(
      Number(
        await scalar(
          "select calories_per_100g from public.foods where source_reference='https://fdc.nal.usda.gov/food-details/173944/nutrients'",
        ),
      ),
    ).toBe(89);
    expect(
      await scalar("select calories_per_100g is null from public.foods where name=$1", ["Nsima"]),
    ).toBe(true);
  });
});

it("separates intentional logging days from plan completion and isolates the view", async () => {
  await asUser(owner);
  await db.query(
    "insert into public.weight_logs(user_id,date,weight_kg) values($1,'2025-01-05',62) on conflict(user_id,date) do nothing",
    [owner],
  );
  expect(
    Number(await scalar("select count(*) from public.logging_days where date='2025-01-05'")),
  ).toBe(1);
  expect(
    await scalar("select day_completed from public.daily_checkins where date='2025-01-05'"),
  ).toBe(false);
  await asUser(other);
  expect(
    Number(await scalar("select count(*) from public.logging_days where user_id=$1", [owner])),
  ).toBe(0);
});
it("requires every specific piece of equipment", async () => {
  await asUser(owner);
  const leg = await scalar("select id from public.exercises where slug='leg-press'");
  await db.query(
    "insert into public.available_equipment(user_id,equipment_type) values($1,'machine') on conflict do nothing",
    [owner],
  );
  expect(await scalar("select public.can_use_exercise($1)", [leg])).toBe(false);
  await db.query(
    "insert into public.available_equipment(user_id,equipment_type) values($1,'leg_press') on conflict do nothing",
    [owner],
  );
  expect(await scalar("select public.can_use_exercise($1)", [leg])).toBe(true);
});
it("creates a guided full-body schedule atomically without resetting an existing plan", async () => {
  await db.exec(
    "reset role;insert into auth.users(id) values('00000000-0000-4000-8000-000000000003')",
  );
  await asUser("00000000-0000-4000-8000-000000000003");
  const input = {
    name: "New",
    weight: 60,
    height: 170,
    goal: 65,
    months: 8,
    age: null,
    sex: "skip",
    activity: "light",
    days: [1, 3, 5],
    equipment: ["bodyweight"],
    foods: ["Beans"],
    budget: "budget",
    weeklyBudget: 20000,
  };
  await db.query("select public.guided_initialize($1,$2)", [
    JSON.stringify(input),
    JSON.stringify({ kcal: 2050, protein: 108, carbs: 280, fat: 57 }),
  ]);
  expect(Number(await scalar("select count(*) from public.workout_templates"))).toBe(3);
  expect(
    Number(
      await scalar(
        "select count(*) from public.workout_template_exercises p where not public.can_use_exercise(p.exercise_id)",
      ),
    ),
  ).toBe(0);
  expect(await scalar("select budget_mode from public.user_preferences")).toBe("budget");
  await db.query("select public.guided_initialize($1,$2)", [
    JSON.stringify({ ...input, name: "Overwrite" }),
    "{}",
  ]);
  expect(await scalar("select first_name from public.profiles")).toBe("New");
  expect(Number(await scalar("select count(*) from public.logging_days"))).toBe(0);
});

it("reschedules a new full-body plan without losing its exercises", async () => {
  await asUser("00000000-0000-4000-8000-000000000003");
  await db.query("select public.save_settings($1)", [
    JSON.stringify({
      first_name: "New",
      water_target_ml: 2500,
      diet_type: "omnivore",
      budget_mode: "budget",
      days: [2, 4, 6],
    }),
  ]);
  expect(
    Number(
      await scalar(
        "select count(*) from public.workout_template_exercises p join public.workout_templates t on t.id=p.workout_template_id join public.program_weeks w on w.id=t.program_week_id join public.training_programs g on g.id=w.training_program_id where g.effective_to is null",
      ),
    ),
  ).toBe(18);
});
it("seeds bread, wheat and beer idempotently without overwriting personal foods", async () => {
  await asUser("00000000-0000-4000-8000-000000000003");
  expect(
    Number(
      await scalar(
        "select count(*) from public.foods where user_id is null and source='USDA SR Legacy'",
      ),
    ),
  ).toBe(200);
  expect(
    Number(
      await scalar(
        "select count(*) from public.foods where user_id is null and name ilike '%wheat%' and calories_per_100g is not null",
      ),
    ),
  ).toBeGreaterThanOrEqual(20);
  await db.query(
    "insert into public.foods(user_id,name,category,preparation_state,calories_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,source,source_reference) values(auth.uid(),'Personal bread','staple','test',100,5,20,1,'user-provided','https://fdc.nal.usda.gov/food-details/174924/nutrients')",
  );
  const seed = readdirSync("supabase/migrations").find((name) =>
    name.endsWith("_expand_sourced_food_catalog.sql"),
  )!;
  const sql = readFileSync(`supabase/migrations/${seed}`, "utf8");
  await db.exec("reset role");
  await db.exec(sql.slice(sql.indexOf("merge into")));
  await asUser("00000000-0000-4000-8000-000000000003");
  expect(
    Number(
      await scalar(
        "select count(*) from public.foods where user_id is null and source='USDA SR Legacy'",
      ),
    ),
  ).toBe(200);
  expect(
    Number(await scalar("select calories_per_100g from public.foods where name='Personal bread'")),
  ).toBe(100);
});
it("stores the full source energy when logging a measured beer portion", async () => {
  const beer = await scalar(
    "select id from public.foods where user_id is null and source_reference='https://fdc.nal.usda.gov/food-details/168746/nutrients'",
  );
  const grams = (29.7 / 29.5735295625) * 500;
  await db.query("select public.log_food(gen_random_uuid(),current_date,'snack',$1,$2)", [
    beer,
    grams,
  ]);
  const energy = Number(
    await scalar("select calories from public.nutrition_log_items where food_id=$1 limit 1", [
      beer,
    ]),
  );
  expect(energy).toBeCloseTo((43 * grams) / 100, 1);
});
it("logs confirmed food batches atomically and treats retries as immutable replays", async () => {
  await asUser("00000000-0000-4000-8000-000000000003");
  const banana = await scalar(
      "select id from public.foods where source_reference='https://fdc.nal.usda.gov/food-details/173944/nutrients' and user_id is null",
    ),
    unknown = await scalar("select id from public.foods where name='Nsima' and user_id is null"),
    date = "2026-01-01";
  const before = Number(await scalar("select count(*) from public.nutrition_log_items"));
  const items = [
    { id: "00000000-0000-4000-9000-000000000001", foodId: banana, grams: 100, slot: "lunch" },
    { id: "00000000-0000-4000-9000-000000000002", foodId: unknown, grams: 50, slot: "lunch" },
  ];
  await expect(
    db.query("select public.log_food_batch($1,$2)", [date, JSON.stringify(items)]),
  ).rejects.toThrow("INVALID_INPUT");
  expect(Number(await scalar("select count(*) from public.nutrition_log_items"))).toBe(before);
  items[1]!.foodId = banana;
  await db.query("select public.log_food_batch($1,$2)", [date, JSON.stringify(items)]);
  await db.query("select public.log_food_batch($1,$2)", [date, JSON.stringify(items)]);
  expect(Number(await scalar("select count(*) from public.nutrition_log_items"))).toBe(before + 2);
  items[0]!.grams = 200;
  await expect(
    db.query("select public.log_food_batch($1,$2)", [date, JSON.stringify(items)]),
  ).rejects.toThrow("CONFLICT");
  await asUser(other);
  await expect(
    db.query("select public.log_food_batch($1,$2)", [date, JSON.stringify(items)]),
  ).rejects.toThrow();
});
it("isolates AI caches and prevents counter edits, duplicate calls and burst retries", async () => {
  await asUser(owner);
  const hash = "a".repeat(64);
  const begin = await scalar<{ state: string; id: string }>(
    "select public.ai_begin('explainExercise',$1,'model','1')",
    [hash],
  );
  expect(begin.state).toBe("reserved");
  expect(
    (
      await scalar<{ state: string }>("select public.ai_begin('explainExercise',$1,'model','1')", [
        hash,
      ])
    ).state,
  ).toBe("pending");
  await db.query("select public.ai_finish($1,$2,null,86400)", [
    begin.id,
    JSON.stringify({ safe: "cached" }),
  ]);
  expect(
    (
      await scalar<{ state: string }>("select public.ai_begin('explainExercise',$1,'model','1')", [
        hash,
      ])
    ).state,
  ).toBe("cached");
  await expect(
    db.query("update app_private.ai_generations set created_at=now()-interval '2 days'"),
  ).rejects.toThrow();
  await expect(db.query("delete from app_private.ai_generations")).rejects.toThrow();
  await expect(
    db.query(
      "insert into app_private.ai_generations(user_id,task,context_hash,model,prompt_version,created_at) values(auth.uid(),'explainExercise',$1,'model','1',now()-interval '1 day')",
      ["b".repeat(64)],
    ),
  ).rejects.toThrow();
  for (let i = 0; i < 4; i++)
    expect(
      (
        await scalar<{ state: string }>(
          "select public.ai_begin('explainExercise',$1,'model','1')",
          [i.toString(16).padStart(64, "0")],
        )
      ).state,
    ).toBe("reserved");
  expect(
    (
      await scalar<{ state: string }>("select public.ai_begin('explainExercise',$1,'model','1')", [
        "c".repeat(64),
      ])
    ).state,
  ).toBe("limited");
  await asUser(other);
  expect(Number(await scalar("select count(*) from app_private.ai_cache"))).toBe(0);
  await expect(
    db.query("select public.ai_finish($1,$2,null,86400)", [begin.id, "{}"]),
  ).rejects.toThrow();
});
it("caps AI generations per UTC day even after errors and prevents counter deletion", async () => {
  await asUser(owner);
  await db.exec(
    "reset role;update app_private.ai_generations set created_at=now()-interval '2 minutes' where user_id='00000000-0000-4000-8000-000000000001'",
  );
  await asUser(owner);
  for (let i = 5; i < 20; i++) {
    const r = await scalar<{ state: string; id: string }>(
      "select public.ai_begin('parseFoodLog',$1,'model','1')",
      [i.toString(16).padStart(64, "0")],
    );
    expect(r.state).toBe("reserved");
    await db.query("select public.ai_finish($1,null,'AI_TIMEOUT',0)", [r.id]);
    await db.exec(
      "reset role;update app_private.ai_generations set created_at=now()-interval '2 minutes' where user_id='00000000-0000-4000-8000-000000000001'",
    );
    await asUser(owner);
  }
  expect(
    (
      await scalar<{ state: string }>("select public.ai_begin('parseFoodLog',$1,'model','1')", [
        "f".repeat(64),
      ])
    ).state,
  ).toBe("limited");
});

describe("confirmed Settings and push queue", () => {
  const uid = "00000000-0000-4000-8000-000000000444",
    endpoint = "https://fcm.googleapis.com/fcm/send/ux-fixture";
  let targetId: string, subscriptionId: string;
  const payload = () => ({
    first_name: "UX fixture",
    height_cm: 175,
    goal_weight_kg: 68,
    water_target_ml: 2500,
    diet_type: "omnivore",
    budget_mode: "balanced",
    days: [1, 3, 5],
    mass_unit: "lb",
    volume_unit: "fl_oz",
    nutrition_targets: { sourceTargetId: targetId, kcal: 2700, protein: 130 },
    reminders: { morningEnabled: false, eveningEnabled: false, morningTime: "07:00" },
  });
  afterAll(async () => {
    await asUser(owner);
  });
  it("saves units and one confirmed target version, idempotently", async () => {
    await db.exec("reset role");
    await db.query("insert into auth.users(id) values($1)", [uid]);
    await asUser(uid);
    await db.query("select public.initialize_profile($1,$2,$3)", [
      JSON.stringify({ name: "UX fixture", height: 175, weight: 60, goal: 68 }),
      JSON.stringify({ kcal: 2500, protein: 120, carbs: 330, fat: 65 }),
      JSON.stringify(["bodyweight"]),
    ]);
    targetId = await scalar("select id from public.nutrition_targets where effective_to is null");
    await db.query("select public.save_settings($1)", [JSON.stringify(payload())]);
    expect(
      Number(
        await scalar(
          "select carbs_target_g from public.nutrition_targets where effective_to is null",
        ),
      ),
    ).toBe(370);
    expect(await scalar("select mass_unit from public.user_preferences")).toBe("lb");
    expect(await scalar("select volume_unit from public.user_preferences")).toBe("fl_oz");
    await db.query("select public.save_settings($1)", [JSON.stringify(payload())]);
    expect(Number(await scalar("select count(*) from public.nutrition_targets"))).toBe(2);
  });
  it("rejects stale/incompatible targets and enabling without a subscription atomically", async () => {
    const stale = {
      ...payload(),
      first_name: "Wrong name",
      nutrition_targets: { sourceTargetId: targetId, kcal: 2800, protein: 130 },
    };
    await expect(
      db.query("select public.save_settings($1)", [JSON.stringify(stale)]),
    ).rejects.toThrow("CONFLICT");
    await expect(
      db.query("select public.save_settings($1)", [
        JSON.stringify({
          ...payload(),
          nutrition_targets: { sourceTargetId: targetId, kcal: 500, protein: 500 },
        }),
      ]),
    ).rejects.toThrow("INVALID_TARGETS");
    await expect(
      db.query("select public.save_settings($1)", [
        JSON.stringify({
          ...payload(),
          reminders: { morningEnabled: true, eveningEnabled: false, morningTime: "07:00" },
        }),
      ]),
    ).rejects.toThrow("PUSH_NOT_SUBSCRIBED");
    expect(await scalar("select first_name from public.profiles")).toBe("UX fixture");
  });
  it("enforces subscription ownership and blocks unsafe providers and dispatcher calls", async () => {
    await expect(
      db.query("select public.save_push_subscription($1,$2,$3)", [
        "https://localhost/private",
        "B".repeat(87),
        "A".repeat(22),
      ]),
    ).rejects.toThrow("INVALID_INPUT");
    subscriptionId = await scalar("select public.save_push_subscription($1,$2,$3)", [
      endpoint,
      "B".repeat(87),
      "A".repeat(22),
    ]);
    await db.query("select public.prepare_test_push($1)", [endpoint]);
    await expect(db.query("select public.prepare_test_push($1)", [endpoint])).rejects.toThrow(
      "RATE_LIMITED",
    );
    await expect(db.query("select public.claim_due_reminders()")).rejects.toThrow();
    await asUser(owner);
    expect(Number(await scalar("select count(*) from app_private.push_subscriptions"))).toBe(0);
    await expect(db.query("select public.prepare_test_push($1)", [endpoint])).rejects.toThrow();
    await asUser(uid);
  });
  it("claims reminders once, suppresses after a weigh-in, and removes expired subscriptions", async () => {
    await db.query(
      "update public.user_preferences set morning_reminder=true,morning_time=(now() at time zone 'Africa/Blantyre')::time where user_id=$1",
      [uid],
    );
    await db.exec("reset role;set role service_role;");
    const claimed = await scalar<{ id: string; token: string }[]>(
      "select public.claim_due_reminders()",
    );
    const job = claimed.find((j) => !!j.id)!;
    expect(job).toBeTruthy();
    expect(await scalar("select public.claim_due_reminders()")).toEqual([]);
    await asUser(uid);
    await db.query(
      "insert into public.weight_logs(user_id,date,weight_kg) values($1,(now() at time zone 'Africa/Blantyre')::date,60)",
      [uid],
    );
    await db.exec("reset role;set role service_role;");
    expect(await scalar("select public.reminder_still_needed($1,$2)", [job.id, job.token])).toBe(
      false,
    );
    await db.exec("reset role");
    await db.query(
      "update app_private.reminder_deliveries set status='sending',token=$2 where id=$1",
      [job.id, job.token],
    );
    await db.exec("set role service_role");
    await db.query("select public.finish_reminder($1,$2,410)", [job.id, job.token]);
    expect(
      await scalar("select enabled from app_private.push_subscriptions where id=$1", [
        subscriptionId,
      ]),
    ).toBe(false);
    await asUser(uid);
  });
});

describe("explicit one-off workout starts", () => {
  const uid = "00000000-0000-4000-8000-000000000992";
  let first: string, second: string, day: number;
  beforeAll(async () => {
    await db.exec("reset role");
    await db.query("insert into auth.users(id) values($1)", [uid]);
    await asUser(uid);
    await db.query("select public.initialize_profile($1,$2,$3)", [
      JSON.stringify({ name: "One-off fixture", height: 170, weight: 60, goal: 65 }),
      JSON.stringify({ kcal: 2400, protein: 110, carbs: 320, fat: 65 }),
      JSON.stringify([
        "bodyweight",
        "barbell",
        "dumbbell",
        "cable",
        "machine",
        "pullup_bar",
        "bench",
        "incline_bench",
        "squat_rack",
        "lat_pulldown",
        "seated_row",
        "leg_press",
        "leg_extension",
        "leg_curl",
        "chest_press",
      ]),
    ]);
    const ids = (
      await db.query<{ id: string }>("select id from public.workout_templates order by sort_order")
    ).rows;
    first = ids[0]!.id;
    second = ids[1]!.id;
    day = Number(
      await scalar("select (extract(dow from now() at time zone 'Africa/Blantyre')::integer+1)%7"),
    );
    await db.query("update public.workout_templates set day_of_week=$1 where id=$2", [day, first]);
  });
  it("requires explicit consent and preserves the schedule and start id on retries", async () => {
    await expect(db.query("select public.start_workout($1)", [first])).rejects.toThrow("CONFLICT");
    const id = await scalar("select public.start_workout($1,true)", [first]);
    expect(await scalar("select public.start_workout($1,true)", [first])).toBe(id);
    expect(await scalar("select public.start_workout($1,true)", [second])).toBe(id);
    expect(
      Number(await scalar("select day_of_week from public.workout_templates where id=$1", [first])),
    ).toBe(day);
    expect(
      Number(
        await scalar("select count(*) from public.workout_sessions where status='in_progress'"),
      ),
    ).toBe(1);
  });
  it("uses the profile timezone and retains completed sessions", async () => {
    const id = await scalar("select id from public.workout_sessions where workout_template_id=$1", [
      first,
    ]);
    await db.query("update public.workout_sessions set status='completed' where id=$1", [id]);
    expect(await scalar("select public.start_workout($1,true)", [first])).toBe(id);
    expect(await scalar("select status from public.workout_sessions where id=$1", [id])).toBe(
      "completed",
    );
    const otherId = await scalar("select public.start_workout($1,true)", [second]);
    expect(
      await scalar("select session_date::text from public.workout_sessions where id=$1", [otherId]),
    ).toBe(await scalar("select (now() at time zone 'Africa/Blantyre')::date::text"));
  });
  it("denies another owner and unavailable equipment", async () => {
    await asUser(other);
    await expect(db.query("select public.start_workout($1,true)", [first])).rejects.toThrow();
    await asUser(uid);
    await db.exec(
      "update public.workout_sessions set status='abandoned' where status='in_progress';update public.available_equipment set is_available=false where equipment_type<>'bodyweight';",
    );
    await expect(db.query("select public.start_workout($1,true)", [first])).rejects.toThrow(
      "EQUIPMENT_UNAVAILABLE",
    );
  });
  it("rejects an older overlapping program version", async () => {
    await asUser(uid);
    await db.query(
      "update public.training_programs set effective_to=(now() at time zone 'Africa/Blantyre')::date where effective_to is null",
    );
    await db.query(
      "insert into public.training_programs(user_id,version,name,effective_from) select user_id,version+1,'New current plan',(now() at time zone 'Africa/Blantyre')::date from public.training_programs order by version desc limit 1",
    );
    await expect(db.query("select public.start_workout($1,true)", [first])).rejects.toThrow(
      "CONFLICT",
    );
  });
  afterAll(async () => {
    await asUser(owner);
  });
});

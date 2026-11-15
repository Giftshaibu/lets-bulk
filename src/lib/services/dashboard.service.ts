import { gramsPerMl } from "../domain/food-catalog";
import { hasEquipment } from "../domain/equipment";
import { completionPolicy } from "../domain/completion-policy";
import { exerciseHistory, trainingAnalytics, exerciseLoadConfig } from "./training.service";
import { progressAnalysis } from "./progress.service";
import { substituteCandidates } from "./recommendation.service";
import type { Snapshot } from "../repositories/app.repository";
import { addDays, daysBetween, getCurrentWeekRange } from "../domain/dates";
import {
  average,
  exerciseVolume,
  nextSessionTarget,
  calculateCalorieAdherence,
  calculateDailyCompletion,
  calculateStreak,
  round,
  weightSummary,
} from "../domain/engines";
import type { Meal, Workout, LiftProgress, DaySchedule, NutritionTargets } from "../data/types";
export function aggregate(s: Snapshot, today: string) {
  const activeTarget =
    [...s.targets]
      .reverse()
      .find((t) => t.effective_from <= today && (!t.effective_to || t.effective_to >= today)) ??
    null;
  const targets: NutritionTargets = {
    kcal: activeTarget?.calories_target ?? 0,
    protein: activeTarget?.protein_target_g ?? 0,
    carbs: activeTarget?.carbs_target_g ?? 0,
    fat: activeTarget?.fat_target_g ?? 0,
  };
  const todayLogs = s.logs.filter((l) => l.date === today);
  const meals: Meal[] = (["breakfast", "lunch", "snack", "dinner"] as const).map((slot, i) => {
    const ids = todayLogs.filter((l) => l.meal_type === slot).map((l) => l.id);
    const items = s.items
      .filter((item) => ids.includes(item.nutrition_log_id))
      .map((item) => {
        const food = s.foods.find((f) => f.id === item.food_id),
          density = food
            ? gramsPerMl({
                servingGrams: food.serving_grams,
                servingVolumeMl: food.serving_volume_ml,
              })
            : null;
        return {
          grams: item.grams,
          id: item.id,
          foodId: item.food_id,
          name: item.name,
          portion:
            density !== null
              ? `${round(item.grams / density, 1)} ml · ${round(item.grams, 1)} g`
              : `${item.grams} g`,
          kcal: round(item.calories),
          protein: round(item.protein_g),
          carbs: round(item.carbs_g),
          fat: round(item.fat_g),
        };
      });
    return {
      id: slot,
      slot,
      title: slot[0]!.toUpperCase() + slot.slice(1),
      time: ["07:00", "12:30", "16:00", "19:30"][i]!,
      targetKcal: Math.round(targets.kcal / 4),
      items,
      logged: items.length > 0,
    };
  });
  const eaten = meals
    .flatMap((m) => m.items)
    .reduce(
      (a, i) => ({
        kcal: a.kcal + i.kcal,
        protein: a.protein + i.protein,
        carbs: a.carbs + i.carbs,
        fat: a.fat + i.fat,
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    );
  const remaining = {
    kcal: Math.max(0, round(targets.kcal - eaten.kcal)),
    protein: Math.max(0, round(targets.protein - eaten.protein)),
    carbs: Math.max(0, round(targets.carbs - eaten.carbs)),
    fat: Math.max(0, round(targets.fat - eaten.fat)),
  };
  const activeProgram = [...s.programs]
    .reverse()
    .find((p) => p.effective_from <= today && (!p.effective_to || p.effective_to >= today));
  const weekIds = s.weeks
    .filter((w) => w.training_program_id === activeProgram?.id)
    .map((w) => w.id);
  const templates = s.templates.filter((t) => weekIds.includes(t.program_week_id));
  const day = new Date(`${today}T12:00:00Z`).getUTCDay();
  const running = s.sessions.find((ss) => ss.status === "in_progress");
  const template =
    (running ? s.templates.find((t) => t.id === running.workout_template_id) : null) ??
    templates.find((t) => t.day_of_week === day);
  const session =
    running ??
    s.sessions.find((ss) => ss.workout_template_id === template?.id && ss.session_date === today);
  const planned = s.planned.filter((p) => p.workout_template_id === template?.id);
  const workout: Workout = {
    id: template?.id ?? "",
    title: template?.name ?? "Rest day",
    focus: template ? "Your saved training plan" : "Recover and log your daily habits",
    dayLabel: today,
    estimatedMinutes: template?.estimated_minutes ?? 0,
    exercises: planned.map((p) => {
      const ex = s.exercises.find((e) => e.id === p.exercise_id)!;
      const previousSession = [...s.sessions]
        .reverse()
        .find(
          (ss) =>
            ss.status === "completed" &&
            ss.id !== session?.id &&
            s.sets.some(
              (es) => es.workout_session_id === ss.id && es.exercise_id === p.exercise_id,
            ),
        );
      const previous = s.sets.filter(
        (es) =>
          es.workout_session_id === previousSession?.id &&
          es.exercise_id === p.exercise_id &&
          es.is_completed,
      );
      const last = previous[0];
      return {
        id: p.exercise_id,
        name: ex.name,
        muscle: ex.primary_muscle,
        targetSets: p.sets,
        targetReps: `${p.rep_min}-${p.rep_max}`,
        lastTime: last ? `${last.weight_kg}kg × ${last.reps}` : "No previous session",
        nextTarget: nextSessionTarget(
          exerciseHistory(s, p, today, session?.id),
          { ...p, progression_increment_kg: exerciseLoadConfig(s, ex).increment },
          exerciseLoadConfig(s, ex).options,
        ),
        restSeconds: p.rest_seconds ?? 120,
        sets: Array.from({ length: p.sets }, (_, i) => {
          const actual = s.sets.find(
            (es) =>
              es.workout_session_id === session?.id &&
              es.exercise_id === p.exercise_id &&
              es.set_number === i + 1,
          );
          return {
            id: actual?.id ?? `${p.exercise_id}:${i + 1}`,
            weight: actual?.weight_kg ?? p.planned_weight_kg,
            reps: actual?.reps ?? p.rep_min,
            rir: actual?.rir ?? p.target_rir ?? 2,
            done: actual?.is_completed ?? false,
          };
        }),
      };
    }),
  };
  const week = getCurrentWeekRange(today);
  const schedule: DaySchedule[] = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(week.start, i),
      dow = (i + 1) % 7;
    const t = templates.find((t) => t.day_of_week === dow);
    return {
      day: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][i]!,
      label: t?.name ?? "Rest",
      state: !t
        ? "rest"
        : s.sessions.some((ss) => ss.session_date === d && ss.status === "completed")
          ? "done"
          : d === today
            ? "today"
            : "upcoming",
    };
  });
  const recoveryLog = s.recovery.find((r) => r.date === today);
  const recovery = {
    sleepHours: recoveryLog?.sleep_hours ?? 0,
    soreness: recoveryLog
      ? recoveryLog.soreness <= 2
        ? ("low" as const)
        : recoveryLog.soreness <= 3
          ? ("medium" as const)
          : ("high" as const)
      : ("—" as const),
    energy: recoveryLog?.energy ?? 0,
    logged: !!recoveryLog,
    score: recoveryLog?.recovery_score ?? null,
    status: recoveryLog?.status ?? "Not logged",
  };
  const weightLog = s.weights.find((w) => w.date === today);
  const waterTotal = s.water.reduce((a, w) => a + w.amount_ml, 0);
  const selectedPolicy = completionPolicy(s.preferences?.completion_policy);
  const tasks = [
    { label: "Weight", done: !!weightLog },
    {
      label: "Calories",
      done: activeTarget !== null && calculateCalorieAdherence(eaten.kcal, targets.kcal) >= 0.9,
    },
    {
      label: "Training",
      done:
        !templates.some((t) => t.day_of_week === day) ||
        s.sessions.some((ss) => ss.session_date === today && ss.status === "completed"),
    },
    { label: "Recovery", done: !!recoveryLog },
    { label: "Water", done: waterTotal >= (s.profile?.water_target_ml ?? 2500) },
  ].map((task, index) => ({
    ...task,
    required:
      selectedPolicy[(["weight", "nutrition", "workout", "recovery", "water"] as const)[index]!] &&
      (index !== 2 || templates.some((t) => t.day_of_week === day)),
  }));
  const completion = calculateDailyCompletion(
    {
      weight: tasks[0]!.done,
      nutrition: tasks[1]!.done,
      workout: tasks[2]!.done,
      recovery: tasks[3]!.done,
      water: tasks[4]!.done,
    },
    {
      ...completionPolicy(s.preferences?.completion_policy),
      workout:
        completionPolicy(s.preferences?.completion_policy).workout &&
        templates.some((t) => t.day_of_week === day),
    },
  );
  const checkins = s.checkins.filter((c) => c.date !== today && c.day_completed).map((c) => c.date);
  if (completion.dayCompleted) checkins.push(today);
  const consistency = calculateStreak(checkins, today);
  const loggingDates = (s.loggingDays ?? []).flatMap((d) => (d.date ? [d.date] : []));
  const streak = calculateStreak(loggingDates, today);
  const weight = weightSummary(s.weights, today);
  const analytics = trainingAnalytics(s, today);
  const lifts: LiftProgress[] = analytics.performance.map((e) => {
    const history = e.history.map((h) => ({ week: h.date, kg: h.topWeight })),
      current = history.at(-1)!.kg;
    return {
      id: e.exerciseId,
      name: e.name,
      startKg: history[0]!.kg,
      currentKg: current,
      pr: history.length > 1 && current > Math.max(...history.slice(0, -1).map((h) => h.kg)),
      history,
    };
  });
  const firstMeasurement = s.measurements[0],
    lastMeasurement = s.measurements.at(-1);
  const measurements = (["chest_cm", "arm_cm", "waist_cm", "thigh_cm"] as const).flatMap((k, i) =>
    lastMeasurement?.[k] != null
      ? [
          {
            id: k,
            name: ["Chest", "Arms", "Waist", "Thighs"][i]!,
            value: lastMeasurement[k]!,
            unit: "cm",
            change: lastMeasurement[k]! - (firstMeasurement?.[k] ?? lastMeasurement[k]!),
          },
        ]
      : [],
  );
  const foods = s.foods
    .filter(
      (f) =>
        f.calories_per_100g !== null &&
        f.protein_per_100g !== null &&
        f.carbs_per_100g !== null &&
        f.fat_per_100g !== null,
    )
    .map((f) => ({
      id: f.id,
      name: f.name,
      serving: "100 g",
      kcal: f.calories_per_100g!,
      protein: f.protein_per_100g!,
      carbs: f.carbs_per_100g!,
      fat: f.fat_per_100g!,
      frequent: s.items.some((item) => item.food_id === f.id),
      aliases: f.local_name,
      category: f.category,
      servingName: f.serving_name,
      servingGrams: f.serving_grams,
      servingVolumeMl: f.serving_volume_ml,
      alcoholPer100g: f.alcohol_g_per_100g,
      source: f.source,
      reference: f.source_reference,
      preparation: f.preparation_state,
    }));
  const recommendations = s.recommendations.map((r) => {
    const payload =
      r.payload && typeof r.payload === "object" && !Array.isArray(r.payload) ? r.payload : {};
    const status =
      r.status === "pending" && r.source_period_end < addDays(today, -14) ? "expired" : r.status;
    const trainingChange = [
      "exercise_load_progression",
      "training_volume_adjustment",
      "deload",
      "exercise_substitution",
    ].includes(r.type);
    const blockedReason =
      status === "expired"
        ? "This proposal expired. Run a new review or request a fresh change."
        : status === "pending" && trainingChange && running
          ? "Finish or end the active workout before applying this change."
          : status === "pending" &&
              typeof payload["programId"] === "string" &&
              payload["programId"] !== activeProgram?.id
            ? "The training plan changed after this proposal. Request a fresh change."
            : status === "pending" &&
                typeof payload["targetId"] === "string" &&
                payload["targetId"] !== activeTarget?.id
              ? "Nutrition targets changed after this proposal. Run a new review."
              : null;
    return { ...r, status, blockedReason };
  });
  const pending = recommendations.filter((r) => r.status === "pending");
  return {
    date: today,
    needsOnboarding: !s.profile,
    profile: {
      name: s.profile?.first_name ?? "Gift",
      weekNumber: s.profile
        ? Math.max(1, Math.floor(daysBetween(s.profile.start_date, today) / 7) + 1)
        : 1,
      totalWeeks: s.profile?.target_date
        ? Math.max(1, Math.ceil(daysBetween(s.profile.start_date, s.profile.target_date) / 7))
        : null,
      streakDays: streak.current,
      startWeightKg: s.profile?.starting_weight_kg ?? 0,
      goalWeightKg: s.profile?.goal_weight_kg ?? 0,
    },
    rawProfile: s.profile,
    preferences: s.preferences,
    targets,
    activeTarget,
    meals,
    eaten,
    remaining,
    foods,
    foodLibrary: s.foods,
    prices: s.prices,
    mealTemplates: s.meals.map((m) => ({
      ...m,
      items: s.mealItems.filter((i) => i.meal_id === m.id),
    })),
    workout,
    session,
    sessionSummary: session
      ? {
          sets: s.sets.filter(
            (es) => es.workout_session_id === session.id && es.is_completed && !es.is_warmup,
          ).length,
          volume: exerciseVolume(s.sets.filter((es) => es.workout_session_id === session.id)),
          minutes: Math.round((session.duration_seconds ?? 0) / 60),
        }
      : null,
    activeProgram,
    schedule,
    recovery,
    weight,
    todayWeight: { logged: !!weightLog, kg: weightLog?.weight_kg ?? null },
    waterTotal,
    tasks,
    completion,
    streak,
    consistency,
    loggingDates,
    journeyWeeks: Array.from(
      {
        length: Math.min(
          520,
          Math.max(1, Math.floor(daysBetween(s.profile?.start_date ?? today, today) / 7) + 1),
        ),
      },
      (_, i) => {
        const start = addDays(s.profile?.start_date ?? today, i * 7),
          end = addDays(start, 6),
          weights = s.weights.filter((w) => w.date >= start && w.date <= end);
        return {
          start,
          end,
          workouts: s.sessions.filter(
            (w) => w.status === "completed" && w.session_date >= start && w.session_date <= end,
          ).length,
          weightLogs: weights.length,
          averageWeight: weights.length ? round(average(weights.map((w) => w.weight_kg))!) : null,
          photos: s.photos.filter((p) => p.date >= start && p.date <= end).length,
          consistentDays: s.checkins.filter(
            (c) => c.day_completed && c.date >= start && c.date <= end,
          ).length,
        };
      },
    ),
    targetReason: activeTarget?.reason,
    lifts,
    measurements,
    photos: s.photos,
    reviews: s.reviews,
    recommendations,
    progressAnalysis: progressAnalysis(s, today),
    trainingAnalytics: analytics,
    completionPolicy: completionPolicy(s.preferences?.completion_policy),
    exerciseLibrary: s.exercises,
    programExercises: s.planned
      .filter((p) => templates.some((t) => t.id === p.workout_template_id))
      .map((p) => ({
        ...p,
        workoutName: templates.find((t) => t.id === p.workout_template_id)!.name,
      })),
    exerciseOptions: s.planned
      .filter((p) => templates.some((t) => t.id === p.workout_template_id))
      .map((p) => ({
        planId: p.id,
        exerciseId: p.exercise_id,
        name: s.exercises.find((e) => e.id === p.exercise_id)?.name ?? "Exercise",
        equipmentAvailable: hasEquipment(
          s.exercises.find((e) => e.id === p.exercise_id)!,
          new Set(s.equipment.filter((a) => a.is_available).map((a) => a.equipment_type)),
        ),
        substitutes: substituteCandidates(s, p),
      })),
    recommendation: {
      title: pending[0]?.title ?? "Keep logging",
      body: pending[0]?.reason ?? "Run a weekly check-in to review your progress.",
    },
    equipment: s.equipment,
    loadOptions: s.loads,
    trainingDays: templates.map((t) => t.day_of_week),
    plannedExercises: planned,
  };
}
export type Dashboard = ReturnType<typeof aggregate>;

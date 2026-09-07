/**
 * Typed data access layer. Today it returns local sample data; swap these
 * functions for real API/server-function calls without touching components.
 */
import * as mock from "./mock";
import type { Meal, NutritionTargets } from "./types";

export const getProfile = () => mock.profile;
export const getTargets = (): NutritionTargets => mock.targets;
export const getMeals = (): Meal[] => mock.meals;
export const getFoods = () => mock.foods;
export const getTodaysWorkout = () => mock.todaysWorkout;
export const getRecovery = () => mock.recovery;
export const getWeightSeries = () => mock.weightSeries;
export const getLifts = () => mock.lifts;
export const getMeasurements = () => mock.measurements;
export const getWeekSchedule = () => mock.weekSchedule;
export const getRecommendation = () => mock.recommendation;
export const getTodayWeight = () => ({
  logged: mock.todayWeightLogged,
  kg: mock.todayWeightKg,
});

export function sumMeals(meals: Meal[]) {
  return meals
    .flatMap((m) => m.items)
    .reduce(
      (acc, i) => ({
        kcal: acc.kcal + i.kcal,
        protein: acc.protein + i.protein,
        carbs: acc.carbs + i.carbs,
        fat: acc.fat + i.fat,
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    );
}

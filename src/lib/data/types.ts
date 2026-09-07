export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  serving: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  frequent?: boolean;
}

export interface LoggedFood {
  id: string;
  foodId: string;
  name: string;
  portion: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Meal {
  id: string;
  slot: MealSlot;
  title: string;
  time: string;
  targetKcal: number;
  items: LoggedFood[];
  logged: boolean;
}

export interface NutritionTargets {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface SetEntry {
  id: string;
  weight: number;
  reps: number;
  rir: number;
  done: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  targetSets: number;
  targetReps: string;
  lastTime: string;
  restSeconds: number;
  sets: SetEntry[];
}

export interface Workout {
  id: string;
  title: string;
  focus: string;
  dayLabel: string;
  estimatedMinutes: number;
  exercises: Exercise[];
}

export interface Recovery {
  sleepHours: number;
  soreness: "low" | "medium" | "high";
  energy: number; // 1-5
  logged: boolean;
}

export interface WeightPoint {
  date: string;
  kg: number;
  trend: number;
}

export interface StrengthPoint {
  week: string;
  kg: number;
}

export interface LiftProgress {
  id: string;
  name: string;
  currentKg: number;
  startKg: number;
  pr: boolean;
  history: StrengthPoint[];
}

export interface Measurement {
  id: string;
  name: string;
  value: number;
  unit: string;
  change: number;
}

export interface DaySchedule {
  day: string;
  label: string;
  state: "done" | "today" | "rest" | "upcoming";
}

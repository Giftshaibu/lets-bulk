import type {
  DaySchedule,
  FoodItem,
  LiftProgress,
  Meal,
  Measurement,
  NutritionTargets,
  Recovery,
  WeightPoint,
  Workout,
} from "./types";

export const profile = {
  name: "Gift",
  weekNumber: 6,
  totalWeeks: 32,
  streakDays: 12,
  startWeightKg: 58.2,
  goalWeightKg: 70,
};

export const targets: NutritionTargets = {
  kcal: 3200,
  protein: 165,
  carbs: 420,
  fat: 95,
};

export const meals: Meal[] = [
  {
    id: "m1",
    slot: "breakfast",
    title: "Breakfast",
    time: "07:00",
    targetKcal: 780,
    logged: true,
    items: [
      {
        id: "l1",
        foodId: "f1",
        name: "Oats with milk",
        portion: "120 g + 300 ml",
        kcal: 520,
        protein: 24,
        carbs: 78,
        fat: 12,
      },
      {
        id: "l2",
        foodId: "f2",
        name: "Peanut butter",
        portion: "30 g",
        kcal: 188,
        protein: 8,
        carbs: 6,
        fat: 16,
      },
    ],
  },
  {
    id: "m2",
    slot: "lunch",
    title: "Lunch",
    time: "12:30",
    targetKcal: 950,
    logged: true,
    items: [
      {
        id: "l3",
        foodId: "f3",
        name: "Rice, chicken & beans",
        portion: "1 plate",
        kcal: 820,
        protein: 52,
        carbs: 104,
        fat: 18,
      },
      {
        id: "l4",
        foodId: "f6",
        name: "Banana",
        portion: "1 medium",
        kcal: 105,
        protein: 1,
        carbs: 27,
        fat: 0,
      },
    ],
  },
  {
    id: "m3",
    slot: "snack",
    title: "Afternoon snack",
    time: "16:00",
    targetKcal: 470,
    logged: false,
    items: [],
  },
  {
    id: "m4",
    slot: "dinner",
    title: "Dinner",
    time: "19:30",
    targetKcal: 1000,
    logged: false,
    items: [],
  },
];

export const foods: FoodItem[] = [
  {
    id: "f1",
    name: "Oats",
    serving: "100 g dry",
    kcal: 379,
    protein: 13,
    carbs: 67,
    fat: 7,
    frequent: true,
  },
  {
    id: "f2",
    name: "Peanut butter",
    serving: "30 g",
    kcal: 188,
    protein: 8,
    carbs: 6,
    fat: 16,
    frequent: true,
  },
  {
    id: "f3",
    name: "Grilled chicken breast",
    serving: "150 g",
    kcal: 248,
    protein: 46,
    carbs: 0,
    fat: 6,
    frequent: true,
  },
  {
    id: "f4",
    name: "White rice, cooked",
    serving: "250 g",
    kcal: 325,
    protein: 6,
    carbs: 72,
    fat: 1,
    frequent: true,
  },
  {
    id: "f5",
    name: "Whole milk",
    serving: "300 ml",
    kcal: 186,
    protein: 10,
    carbs: 14,
    fat: 10,
    frequent: true,
  },
  {
    id: "f6",
    name: "Banana",
    serving: "1 medium",
    kcal: 105,
    protein: 1,
    carbs: 27,
    fat: 0,
    frequent: true,
  },
  {
    id: "f7",
    name: "Eggs",
    serving: "3 large",
    kcal: 234,
    protein: 19,
    carbs: 2,
    fat: 16,
  },
  {
    id: "f8",
    name: "Beans stew",
    serving: "1 cup",
    kcal: 268,
    protein: 15,
    carbs: 44,
    fat: 3,
  },
  {
    id: "f9",
    name: "Greek yoghurt",
    serving: "170 g",
    kcal: 145,
    protein: 17,
    carbs: 8,
    fat: 4,
  },
  {
    id: "f10",
    name: "Olive oil",
    serving: "1 tbsp",
    kcal: 119,
    protein: 0,
    carbs: 0,
    fat: 14,
  },
];

export const todaysWorkout: Workout = {
  id: "w1",
  title: "Upper A — Push focus",
  focus: "Chest · Shoulders · Triceps",
  dayLabel: "Week 6 · Day 2",
  estimatedMinutes: 52,
  exercises: [
    {
      id: "e1",
      name: "Barbell bench press",
      muscle: "Chest",
      targetSets: 4,
      targetReps: "6-8",
      lastTime: "60kg × 8",
      restSeconds: 150,
      sets: [
        { id: "s1", weight: 62.5, reps: 8, rir: 2, done: false },
        { id: "s2", weight: 62.5, reps: 8, rir: 2, done: false },
        { id: "s3", weight: 62.5, reps: 7, rir: 1, done: false },
        { id: "s4", weight: 60, reps: 8, rir: 1, done: false },
      ],
    },
    {
      id: "e2",
      name: "Overhead press",
      muscle: "Shoulders",
      targetSets: 3,
      targetReps: "8-10",
      lastTime: "35kg × 9",
      restSeconds: 120,
      sets: [
        { id: "s5", weight: 37.5, reps: 9, rir: 2, done: false },
        { id: "s6", weight: 37.5, reps: 8, rir: 1, done: false },
        { id: "s7", weight: 35, reps: 10, rir: 1, done: false },
      ],
    },
    {
      id: "e3",
      name: "Incline dumbbell press",
      muscle: "Chest",
      targetSets: 3,
      targetReps: "10-12",
      lastTime: "22kg × 11",
      restSeconds: 90,
      sets: [
        { id: "s8", weight: 22, reps: 12, rir: 2, done: false },
        { id: "s9", weight: 22, reps: 11, rir: 1, done: false },
        { id: "s10", weight: 20, reps: 12, rir: 1, done: false },
      ],
    },
    {
      id: "e4",
      name: "Cable triceps pushdown",
      muscle: "Triceps",
      targetSets: 3,
      targetReps: "12-15",
      lastTime: "30kg × 14",
      restSeconds: 75,
      sets: [
        { id: "s11", weight: 32.5, reps: 14, rir: 2, done: false },
        { id: "s12", weight: 32.5, reps: 13, rir: 1, done: false },
        { id: "s13", weight: 30, reps: 15, rir: 0, done: false },
      ],
    },
  ],
};

export const recovery: Recovery = {
  sleepHours: 7.5,
  soreness: "low",
  energy: 4,
  logged: true,
};

export const weightSeries: WeightPoint[] = [
  { date: "Aug 3", kg: 58.2, trend: 58.3 },
  { date: "Aug 10", kg: 58.9, trend: 58.7 },
  { date: "Aug 17", kg: 59.4, trend: 59.2 },
  { date: "Aug 24", kg: 59.8, trend: 59.7 },
  { date: "Aug 31", kg: 60.6, trend: 60.2 },
  { date: "Sep 7", kg: 61.1, trend: 60.8 },
  { date: "Sep 14", kg: 61.4, trend: 61.3 },
];

export const todayWeightLogged = false;
export const todayWeightKg = 61.4;

export const lifts: LiftProgress[] = [
  {
    id: "lp1",
    name: "Bench press",
    currentKg: 62.5,
    startKg: 47.5,
    pr: true,
    history: [
      { week: "W1", kg: 47.5 },
      { week: "W2", kg: 50 },
      { week: "W3", kg: 52.5 },
      { week: "W4", kg: 55 },
      { week: "W5", kg: 60 },
      { week: "W6", kg: 62.5 },
    ],
  },
  {
    id: "lp2",
    name: "Squat",
    currentKg: 90,
    startKg: 70,
    pr: false,
    history: [
      { week: "W1", kg: 70 },
      { week: "W2", kg: 75 },
      { week: "W3", kg: 80 },
      { week: "W4", kg: 82.5 },
      { week: "W5", kg: 87.5 },
      { week: "W6", kg: 90 },
    ],
  },
  {
    id: "lp3",
    name: "Deadlift",
    currentKg: 115,
    startKg: 90,
    pr: true,
    history: [
      { week: "W1", kg: 90 },
      { week: "W2", kg: 95 },
      { week: "W3", kg: 100 },
      { week: "W4", kg: 105 },
      { week: "W5", kg: 110 },
      { week: "W6", kg: 115 },
    ],
  },
];

export const measurements: Measurement[] = [
  { id: "b1", name: "Chest", value: 96.5, unit: "cm", change: 3.1 },
  { id: "b2", name: "Arms", value: 33.4, unit: "cm", change: 1.8 },
  { id: "b3", name: "Waist", value: 76.2, unit: "cm", change: 1.2 },
  { id: "b4", name: "Thighs", value: 55.8, unit: "cm", change: 2.4 },
];

export const weekSchedule: DaySchedule[] = [
  { day: "MON", label: "Lower A", state: "done" },
  { day: "TUE", label: "Upper A", state: "today" },
  { day: "WED", label: "Rest", state: "rest" },
  { day: "THU", label: "Lower B", state: "upcoming" },
  { day: "FRI", label: "Upper B", state: "upcoming" },
  { day: "SAT", label: "Conditioning", state: "upcoming" },
  { day: "SUN", label: "Rest", state: "rest" },
];

export const recommendation = {
  title: "Add 150 kcal next week",
  body: "Weight trend is up 0.35 kg/week — just under your 0.4 kg target. Bump dinner carbs slightly.",
};

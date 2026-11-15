import { addDays, getCurrentWeekRange } from "./dates";
export function calculateDailyCompletion(
  input: {
    weight: boolean;
    nutrition: boolean;
    workout: boolean;
    recovery: boolean;
    water: boolean;
  },
  policy = { weight: true, nutrition: true, workout: true, recovery: true, water: true },
) {
  const values = (Object.keys(input) as (keyof typeof input)[])
      .filter((key) => policy[key])
      .map((key) => input[key]),
    completed = values.filter(Boolean).length;
  return {
    completed,
    required: values.length,
    percentage: values.length ? Math.round((completed / values.length) * 100) : 0,
    dayCompleted: values.length > 0 && completed === values.length,
  };
}
export function calculateStreak(dates: string[], today: string) {
  const days = [...new Set(dates)].filter((d) => d <= today).sort();
  let longest = 0,
    run = 0;
  days.forEach((d, i) => {
    run = i > 0 && addDays(days[i - 1]!, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
  });
  const set = new Set(days);
  let cursor = set.has(today) ? today : addDays(today, -1),
    current = 0;
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  const week = getCurrentWeekRange(today);
  return {
    current,
    longest,
    completedThisWeek: days.filter((d) => d >= week.start && d <= today).length,
  };
}

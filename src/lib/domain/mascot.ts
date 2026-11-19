import { addDays, TIMEZONE } from "./dates";
import { calculateStreak } from "./streaks";

export type MascotExpression =
  "neutral" | "happy" | "confident" | "thinking" | "grumpy" | "running" | "sad" | "shocked";
export type MascotState = { expression: MascotExpression; message: string; priority: number };
export const mascot = (
  expression: MascotExpression,
  message: string,
  priority = 0,
): MascotState => ({ expression, message, priority });
export const defaultMascot = mascot(
  "confident",
  "One intentional action at a time. You’ve got this.",
);
export const mascotAssets: Record<MascotExpression, { pose: string; face: string }> =
  Object.fromEntries(
    (
      ["neutral", "happy", "confident", "thinking", "grumpy", "running", "sad", "shocked"] as const
    ).map((expression) => [
      expression,
      {
        pose: `/mascots/pose-${expression}.webp`,
        face: ["shocked", "confident", "grumpy", "thinking", "sad"].includes(expression)
          ? `/mascots/face-${expression}.webp`
          : expression === "happy"
            ? "/chiuli-icon.png"
            : `/mascots/pose-${expression}.webp`,
      },
    ]),
  ) as Record<MascotExpression, { pose: string; face: string }>;

export function highestMascot(states: MascotState[]): MascotState {
  return states.reduce(
    (best, state) => (state.priority > best.priority ? state : best),
    defaultMascot,
  );
}

export function weightMascot(
  series: { date: string; kg: number }[],
  date: string,
  kg: number,
): MascotState {
  const prior = series
    .filter((w) => w.date < date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
  if (!prior)
    return mascot("happy", "Starting-point weigh-in saved. Keep logging to build your trend.", 30);
  if (kg > prior.kg)
    return mascot(
      "happy",
      "Saved: higher than your previous weigh-in. Daily weight can fluctuate; follow your trend over time.",
      30,
    );
  if (kg < prior.kg)
    return mascot(
      "shocked",
      "Saved: lower than your previous weigh-in. Daily fluctuations happen; your longer-term trend matters.",
      40,
    );
  return mascot(
    "grumpy",
    "Saved: the same as your previous weigh-in. One flat reading does not mean your progress has stalled.",
    20,
  );
}

export function mascotLocalTime(now: Date, timezone = TIMEZONE) {
  let parts: Intl.DateTimeFormatPart[];
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  };
  try {
    parts = new Intl.DateTimeFormat("en-CA", options).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat("en-CA", { ...options, timeZone: TIMEZONE }).formatToParts(now);
  }
  const value = (name: string) => parts.find((p) => p.type === name)!.value;
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    hour: Number(value("hour")),
  };
}

export function streakMascot(dates: string[], now: Date, timezone = TIMEZONE): MascotState {
  const { date, hour } = mascotLocalTime(now, timezone);
  const days = [...new Set(dates)].filter((d) => d <= date).sort();
  const streak = calculateStreak(days, date);
  const loggedToday = days.includes(date);
  if (!days.length) return mascot("neutral", "Your story starts with your first intentional log.");
  if (!streak.current && days.at(-1)! < addDays(date, -1))
    return mascot(
      "sad",
      "Streak at 0! One intentional log restarts the fire. Your progress is still here.",
      50,
    );
  if (streak.current > 0 && !loggedToday && hour >= 20)
    return mascot(
      "shocked",
      "Clock’s ticking! It’s after 8 PM. Log before midnight to keep your streak going.",
      40,
    );
  if (loggedToday && [3, 7, 14, 30, 60, 100].includes(streak.current))
    return mascot(
      "happy",
      `${streak.current} days of intentional logs. That’s a milestone worth celebrating!`,
      30,
    );
  return mascot("confident", `${streak.current}-day logging streak! Keep building your chain.`, 1);
}

export function helperMascot(pending: boolean, error: string, ready: boolean): MascotState {
  if (pending) return mascot("thinking", "Preparing your helper result…", 60);
  if (error)
    return mascot(
      "shocked",
      "This helper couldn’t finish. Your normal app actions still work.",
      50,
    );
  return ready
    ? mascot("confident", "Your result is ready. Review it and choose what works for you.", 1)
    : mascot("neutral", "Ready when you are.");
}

export function workoutMascot(status?: string | null, scheduled = false): MascotState {
  if (status === "in_progress")
    return mascot("running", "One controlled set at a time. Your workout is in progress.", 1);
  if (status === "completed")
    return mascot("happy", "Session crushed! Workout saved. Make time to recover.", 30);
  if (status === "abandoned")
    return mascot(
      "grumpy",
      "This session ended early. Your logged work still counts; take your next step when ready.",
      20,
    );
  return scheduled
    ? mascot("confident", "Iron time! Ready for your next controlled set?", 1)
    : mascot("neutral", "Rest day = recovery day. Refuel, sleep well, and come back stronger.");
}

export function nutritionMascot(eaten: number, target: number): MascotExpression {
  if (eaten <= 0) return "grumpy";
  if (target > 0 && eaten >= target) return "happy";
  return target > 0 && eaten >= target * 0.7 ? "thinking" : "confident";
}

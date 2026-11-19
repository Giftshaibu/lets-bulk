import { describe, expect, it } from "vitest";
import {
  defaultMascot,
  highestMascot,
  helperMascot,
  mascot,
  mascotAssets,
  mascotLocalTime,
  streakMascot,
  weightMascot,
  workoutMascot,
} from "../src/lib/domain/mascot";
import { addDays } from "../src/lib/domain/dates";

describe("weight mascot uses saved facts", () => {
  const series = [
    { date: "2026-11-15", kg: 61 },
    { date: "2026-11-17", kg: 60.25 },
    { date: "2026-11-19", kg: 90 },
  ];
  it.each([
    [61, "happy"],
    [60.25, "grumpy"],
    [60.24, "shocked"],
  ] as const)("compares %s against the nearest earlier dated entry", (kg, expression) => {
    expect(weightMascot(series, "2026-11-18", kg).expression).toBe(expression);
  });
  it("excludes a same-day replacement and later entries", () => {
    expect(weightMascot(series, "2026-11-19", 60.25).expression).toBe("grumpy");
  });
  it("celebrates a first or newly backdated earliest entry", () => {
    expect(weightMascot([], "2026-11-19", 60).expression).toBe("happy");
    expect(weightMascot(series, "2026-11-14", 60).expression).toBe("happy");
  });
  it("does not round away a recorded change or mutate source history", () => {
    const before = JSON.stringify(series);
    expect(weightMascot(series, "2026-11-18", 60.251).expression).toBe("happy");
    expect(JSON.stringify(series)).toBe(before);
  });
});

describe("streak states and profile-local clock", () => {
  const dates = ["2026-11-17", "2026-11-18"];
  it("starts neutral with no past activity, ignoring future logs", () => {
    expect(streakMascot([], new Date("2026-11-19T19:00:00Z")).expression).toBe("neutral");
    expect(streakMascot(["2026-11-20"], new Date("2026-11-19T19:00:00Z")).expression).toBe(
      "neutral",
    );
  });
  it("warns at exactly 8 PM, not 7:59 PM", () => {
    expect(streakMascot(dates, new Date("2026-11-19T17:59:59Z")).expression).toBe("confident");
    expect(streakMascot(dates, new Date("2026-11-19T18:00:00Z")).expression).toBe("shocked");
  });
  it("does not warn after today is logged", () => {
    expect(
      streakMascot([...dates, "2026-11-19"], new Date("2026-11-19T19:00:00Z")).expression,
    ).toBe("happy");
  });
  it("shows a genuinely broken streak and refreshes at local midnight", () => {
    expect(streakMascot(dates, new Date("2026-11-19T21:59:59Z")).expression).toBe("shocked");
    expect(streakMascot(dates, new Date("2026-11-19T22:00:00Z")).expression).toBe("sad");
  });
  it.each([3, 7, 14, 30, 60, 100])("celebrates the %s-day milestone only with a log today", (n) => {
    const logged = Array.from({ length: n }, (_, i) => addDays("2026-11-19", -i));
    expect(streakMascot([...logged, ...logged], new Date("2026-11-19T10:00:00Z")).expression).toBe(
      "happy",
    );
    expect(streakMascot(logged, new Date("2026-11-20T10:00:00Z")).expression).toBe("confident");
  });
  it("uses a valid profile timezone and falls back for an invalid one", () => {
    const now = new Date("2026-11-19T18:00:00Z");
    expect(streakMascot(dates, now, "UTC").expression).toBe("confident");
    expect(streakMascot(dates, now, "Africa/Blantyre").expression).toBe("shocked");
    expect(mascotLocalTime(now, "invalid")).toEqual({ date: "2026-11-19", hour: 20 });
  });
});

describe("independent state and header priorities", () => {
  it("loading wins over error, warning and celebration, without changing any section", () => {
    const ready = mascot("happy", "Saved", 30),
      warning = mascot("shocked", "Risk", 40),
      error = helperMascot(false, "failed", false),
      loading = helperMascot(true, "failed", true);
    expect(highestMascot([ready, warning, error, loading])).toBe(loading);
    expect(highestMascot([ready, warning, error])).toBe(error);
    expect(highestMascot([ready, warning])).toBe(warning);
    expect(ready.expression).toBe("happy");
    expect(highestMascot([])).toBe(defaultMascot);
  });
  it("fallback results are normal ready states, not request errors", () => {
    expect(helperMascot(false, "", true).expression).toBe("confident");
    expect(helperMascot(false, "", false).expression).toBe("neutral");
  });
  it("does not infer a skipped workout from no session or a rest day", () => {
    expect(workoutMascot(null).expression).toBe("neutral");
    expect(workoutMascot("in_progress").expression).toBe("running");
    expect(workoutMascot("completed").expression).toBe("running");
    expect(workoutMascot("abandoned").expression).toBe("grumpy");
  });
  it("provides all eight poses and uses the five close-up faces where supplied", () => {
    expect(Object.keys(mascotAssets)).toHaveLength(8);
    expect(mascotAssets.shocked.face).toBe("/mascots/face-shocked.webp");
    expect(mascotAssets.happy.face).toBe(mascotAssets.happy.pose);
  });
});

import { describe, it, expect } from "vitest";
import { snapshot, id } from "./ai-fixtures";
import { aggregate, workoutLibrary } from "../src/lib/services/dashboard.service";
import { getLocalDate } from "../src/lib/domain/dates";
function fixture() {
  const s = snapshot();
  s.programs = [
    {
      id: id(901),
      effective_from: "2026-01-01",
      effective_to: null,
      version: 1,
    } as (typeof s.programs)[number],
  ];
  s.weeks = [{ id: id(902), training_program_id: id(901) } as (typeof s.weeks)[number]];
  s.templates = [
    {
      id: id(903),
      name: "Upper",
      program_week_id: id(902),
      day_of_week: 1,
      estimated_minutes: 30,
    } as (typeof s.templates)[number],
  ];
  return s;
}
describe("schedule-aware workout navigation", () => {
  it("distinguishes scheduled days, genuine rest, and missing programs", () => {
    const s = fixture();
    expect(aggregate(s, "2026-11-16").trainingStatus).toBe("scheduled");
    expect(aggregate(s, "2026-11-16").workout.title).toBe("Upper");
    expect(aggregate(s, "2026-11-19").trainingStatus).toBe("rest");
    expect(aggregate(s, "2026-11-19").workout.title).toBe("Rest day");
    s.programs = [];
    expect(aggregate(s, "2026-11-19").trainingStatus).toBe("missing_program");
  });
  it("shows an active and then completed one-off session on a rest day", () => {
    const s = fixture();
    s.sessions = [
      {
        id: id(904),
        workout_template_id: id(903),
        session_date: "2026-11-19",
        status: "in_progress",
      } as (typeof s.sessions)[number],
    ];
    expect(aggregate(s, "2026-11-19").workout.title).toBe("Upper");
    s.sessions[0]!.status = "completed";
    expect(aggregate(s, "2026-11-19").workout.title).toBe("Upper");
    expect(workoutLibrary(s, "2026-11-19")[0]?.sessionStatus).toBe("completed");
  });
  it("keeps a completed one-off visible even when another workout is scheduled", () => {
    const s = fixture();
    s.templates.push({ ...s.templates[0]!, id: id(905), name: "Lower", day_of_week: 4 });
    s.sessions = [
      {
        id: id(904),
        workout_template_id: id(903),
        session_date: "2026-11-19",
        status: "completed",
        completed_at: "2026-11-19T12:00:00Z",
      } as (typeof s.sessions)[number],
    ];
    const d = aggregate(s, "2026-11-19");
    expect(d.workout.title).toBe("Upper");
    expect(d.session?.status).toBe("completed");
    expect(d.schedule.find((day) => day.day === "THU")?.state).toBe("done");
  });
  it("resolves the day in the saved timezone across midnight", () => {
    const now = new Date("2026-11-19T23:30:00Z");
    expect(getLocalDate(now, "Africa/Blantyre")).toBe("2026-11-20");
    expect(getLocalDate(now, "America/Los_Angeles")).toBe("2026-11-19");
  });
});

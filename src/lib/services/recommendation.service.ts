import { hasEquipment } from "../domain/equipment";
import type { Snapshot, Db } from "../repositories/app.repository";
import type { Json } from "../db/database.types";
import { AppError, result } from "./errors";
export type ChangeRequest = {
  id: string;
  type: "volume" | "deload" | "substitution" | "restore";
  planId?: string | undefined;
  replacementId?: string | undefined;
  direction?: number | undefined;
};
export function substituteCandidates(s: Snapshot, plan: Snapshot["planned"][number]) {
  const exercise = s.exercises.find((e) => e.id === plan.exercise_id);
  const equipment = new Set(s.equipment.filter((e) => e.is_available).map((e) => e.equipment_type));
  const used = new Set(
    s.planned
      .filter((p) => p.workout_template_id === plan.workout_template_id)
      .map((p) => p.exercise_id),
  );
  return s.exercises.filter(
    (e) =>
      e.id !== plan.exercise_id &&
      !used.has(e.id) &&
      e.primary_muscle === exercise?.primary_muscle &&
      hasEquipment(e, equipment),
  );
}
export function requestedChange(s: Snapshot, today: string, v: ChangeRequest) {
  const program = s.programs.find((p) => p.effective_to === null);
  if (!program) throw new AppError("NOT_FOUND", "Save a training plan first.", 404);
  const weeks = new Set(
    s.weeks.filter((w) => w.training_program_id === program.id).map((w) => w.id),
  );
  const templates = new Set(
    s.templates.filter((t) => weeks.has(t.program_week_id)).map((t) => t.id),
  );
  const plan = s.planned.find((p) => p.id === v.planId && templates.has(p.workout_template_id));
  let type: string,
    title: string,
    description: string,
    recommendedValue: number | null = null,
    currentValue: number | null = null;
  const payload: Record<string, string> = { programId: program.id };
  if (v.type === "deload") {
    if (program.phase === "deload")
      throw new AppError("CONFLICT", "A deload is already active.", 409);
    type = "deload";
    title = "Take a seven-day deload";
    description =
      "Reduce each exercise to roughly half its working sets for seven days. Working loads stay unchanged. Restoration will require your approval.";
  } else if (v.type === "restore") {
    if (
      program.phase !== "deload" ||
      !program.resume_program_id ||
      !program.planned_until ||
      program.planned_until > today
    )
      throw new AppError("CONFLICT", "Finish the seven-day deload before restoring volume.", 409);
    type = "training_volume_adjustment";
    title = "Restore your previous training volume";
    description =
      "Restore the sets from before the deload while retaining accepted exercise swaps.";
    payload["action"] = "restore";
    payload["restoreFromProgramId"] = program.resume_program_id;
  } else {
    if (!plan)
      throw new AppError("NOT_FOUND", "This exercise is no longer in the active plan.", 404);
    const exercise = s.exercises.find((e) => e.id === plan.exercise_id)!;
    payload["templateExerciseId"] = plan.id;
    if (v.type === "volume") {
      if (program.phase === "deload")
        throw new AppError("CONFLICT", "Keep deload volume stable until restoration.", 409);
      recommendedValue = plan.sets + (v.direction ?? 1);
      if (recommendedValue < 1 || recommendedValue > 10)
        throw new AppError("INVALID_INPUT", "Choose between one and ten working sets.");
      currentValue = plan.sets;
      type = "training_volume_adjustment";
      title = `${exercise.name}: ${recommendedValue} working sets`;
      description =
        "Change one set per session. Review nutrition, recovery and recent performance before applying.";
    } else {
      const replacement = substituteCandidates(s, plan).find((e) => e.id === v.replacementId);
      if (!replacement)
        throw new AppError(
          "INVALID_INPUT",
          "Choose a different exercise for the same muscle using available equipment.",
        );
      type = "exercise_substitution";
      title = `Replace ${exercise.name} with ${replacement.name}`;
      description =
        "The replacement matches the primary muscle and available equipment. Its starting load resets to 0 kg added weight; confirm a suitable load before the first session.";
      payload["replacementExerciseId"] = replacement.id;
    }
  }
  return {
    type,
    title,
    description,
    reason: "Requested by you. This remains a proposal until you choose Apply.",
    payload,
    current_value: currentValue,
    recommended_value: recommendedValue,
    unit: v.type === "volume" ? "sets" : null,
  };
}
export async function createRequestedChange(
  db: Db,
  s: Snapshot,
  today: string,
  userId: string,
  v: ChangeRequest,
) {
  const draft = requestedChange(s, today, v);
  const response = await result(
    db
      .from("recommendations")
      .upsert(
        {
          ...draft,
          payload: draft.payload as Json,
          id: v.id,
          request_id: v.id,
          user_id: userId,
          weekly_analysis_id: null,
          source_period_start: today,
          source_period_end: today,
          confidence: 0,
        },
        { onConflict: "request_id", ignoreDuplicates: true },
      )
      .select(),
  );
  return response;
}

import { clamp, round } from "./numbers";
import { RULES } from "./config";
export type RecoveryInput = {
  sleep_hours: number;
  energy: number;
  soreness: number;
  stress: number;
};
export function calculateRecoveryScore(r: RecoveryInput) {
  const w = RULES.recovery;
  const score = round(
    100 *
      (clamp(r.sleep_hours / 8) * w.sleep +
        ((r.energy - 1) / 4) * w.energy +
        ((5 - r.soreness) / 4) * w.soreness +
        ((5 - r.stress) / 4) * w.stress),
  );
  return { score, status: score >= 75 ? "good" : score >= 50 ? "moderate" : "poor" };
}

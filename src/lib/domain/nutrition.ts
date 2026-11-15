import { clamp } from "./numbers";
export function calculateInitialTargets(weight: number, maintenance: number) {
  const kcal = Math.round(maintenance + 250),
    protein = Math.round(weight * 1.8),
    fat = Math.round(weight * 0.8);
  return { kcal, protein, fat, carbs: Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4)) };
}
export function calculateCalorieAdherence(actual: number, target: number) {
  return target > 0 ? clamp(1 - Math.abs(actual - target) / target) : 0;
}
export const calculateProteinAdherence = (actual: number, target: number) =>
  target > 0 ? clamp(actual / target) : 0;

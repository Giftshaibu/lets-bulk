export type MassUnit = "kg" | "lb";
export type VolumeUnit = "ml" | "fl_oz";
export const KG_PER_LB = 0.45359237,
  ML_PER_FL_OZ = 29.5735295625;
export function units(preferences: unknown): { mass: MassUnit; volume: VolumeUnit } {
  const p = preferences as { mass_unit?: string; volume_unit?: string } | null;
  return {
    mass: p?.mass_unit === "lb" ? "lb" : "kg",
    volume: p?.volume_unit === "fl_oz" ? "fl_oz" : "ml",
  };
}
export const massFromKg = (kg: number, unit: MassUnit) => (unit === "lb" ? kg / KG_PER_LB : kg);
export const massToKg = (n: number, unit: MassUnit) => (unit === "lb" ? n * KG_PER_LB : n);
export const volumeFromMl = (ml: number, unit: VolumeUnit) =>
  unit === "fl_oz" ? ml / ML_PER_FL_OZ : ml;
export const volumeToMl = (n: number, unit: VolumeUnit) =>
  Math.round(unit === "fl_oz" ? n * ML_PER_FL_OZ : n);
export const massLabel = (kg: number, unit: MassUnit, digits = 1) =>
  `${massFromKg(kg, unit).toLocaleString(undefined, { maximumFractionDigits: digits })} ${unit}`;
export const volumeLabel = (ml: number, unit: VolumeUnit) =>
  `${volumeFromMl(ml, unit).toLocaleString(undefined, { maximumFractionDigits: unit === "ml" ? 0 : 2 })} ${unit === "fl_oz" ? "US fl oz" : "ml"}`;
export function manualTargets(
  current: {
    calories_target: number;
    protein_target_g: number;
    carbs_target_g: number;
    fat_target_g: number;
  },
  kcal: number,
  protein: number,
) {
  const raw =
    current.carbs_target_g +
    (kcal - current.calories_target - 4 * (protein - current.protein_target_g)) / 4;
  if (
    !Number.isInteger(kcal) ||
    kcal < 500 ||
    kcal > 10000 ||
    !Number.isInteger(protein) ||
    protein < 1 ||
    protein > 500 ||
    raw < 0 ||
    raw > 1500
  )
    throw new Error("These targets don’t fit together. Adjust calories or protein.");
  return { kcal, protein, carbs: Math.round(raw), fat: current.fat_target_g };
}
export const massText = (text: string | undefined, unit: MassUnit) =>
  unit === "kg"
    ? (text ?? "")
    : (text ?? "").replace(/(-?\d+(?:\.\d+)?)\s*kg\b/g, (_all, n: string) =>
        massLabel(Number(n), unit),
      );

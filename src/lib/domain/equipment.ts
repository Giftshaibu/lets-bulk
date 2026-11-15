export const equipmentChoices = [
  "bodyweight",
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "pullup_bar",
  "bench",
  "incline_bench",
  "squat_rack",
  "lat_pulldown",
  "seated_row",
  "leg_press",
  "leg_extension",
  "leg_curl",
  "chest_press",
] as const;
export const equipmentLabels: Record<string, string> = {
  bodyweight: "Bodyweight",
  barbell: "Barbell",
  dumbbell: "Dumbbells",
  cable: "Cable station",
  machine: "Other machine (does not enable specific machines)",
  pullup_bar: "Pull-up bar",
  bench: "Flat bench",
  incline_bench: "Adjustable incline bench",
  squat_rack: "Squat rack",
  lat_pulldown: "Lat pulldown station",
  seated_row: "Seated row station",
  leg_press: "Leg press machine",
  leg_extension: "Leg extension machine",
  leg_curl: "Lying leg curl machine",
  chest_press: "Chest press machine",
};
export function hasEquipment(
  exercise: { equipment: string; required_equipment?: unknown },
  available: Set<string>,
) {
  const required = Array.isArray(exercise.required_equipment)
    ? exercise.required_equipment
    : [exercise.equipment];
  return required.every((key) => typeof key === "string" && available.has(key));
}

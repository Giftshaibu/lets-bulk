export const RULES = {
  gainMin: 0.15,
  gainMax: 0.3,
  calorieStep: 150,
  minWeighIns: 3,
  minNutritionDays: 5,
  minCompleteness: 0.7,
  minAdherence: 0.9,
  minWorkoutAdherence: 0.75,
  deloadDays: 7,
  maintenanceMinDays: 21,
  maintenanceMinWeighIns: 10,
  recovery: { sleep: 0.4, energy: 0.25, soreness: 0.2, stress: 0.15 },
} as const;

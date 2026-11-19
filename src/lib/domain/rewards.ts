export type RewardGrant = {
  id: string;
  date: string;
  kind: "weight" | "meal" | "water" | "recovery" | "workout" | "meals" | "quests";
  slot: string;
  points: number;
};
export type RewardSummary = { totalXp: number; todayXp: number };
export type RewardResult = RewardSummary & { grants: RewardGrant[] };
export const REWARD_POINTS = {
  weight: 50,
  meal: 15,
  water: 15,
  recovery: 15,
  workout: 100,
  meals: 40,
  quests: 100,
} as const;

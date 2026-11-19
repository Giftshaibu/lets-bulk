import { z } from "zod";
import type { Db } from "../repositories/app.repository";
const rewardSchema = z.object({
  totalXp: z.number().int().nonnegative(),
  todayXp: z.number().int().nonnegative(),
  grants: z.array(
    z.object({
      id: z.string().uuid(),
      date: z.string(),
      kind: z.enum(["weight", "meal", "water", "recovery", "workout", "meals", "quests"]),
      slot: z.string(),
      points: z.number().int().positive(),
    }),
  ),
});
export async function reconcileRewards(db: Db) {
  try {
    const { data, error } = await db
      .rpc("reconcile_rewards")
      .abortSignal(AbortSignal.timeout(3000));
    if (error) throw new Error("REWARD_SYNC_FAILED");
    return rewardSchema.parse(data);
  } catch {
    console.info("Reward sync pending");
    return null;
  }
}

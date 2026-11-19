import { describe, expect, it, vi } from "vitest";
import { reconcileRewards } from "../src/lib/services/rewards.service";
import type { Db } from "../src/lib/repositories/app.repository";
import { REWARD_POINTS } from "../src/lib/domain/rewards";
import { nutritionMascot, workoutMascot } from "../src/lib/domain/mascot";
function client(data: unknown, error: unknown = null) {
  const abortSignal = vi.fn(() => Promise.resolve({ data, error }));
  return { db: { rpc: vi.fn(() => ({ abortSignal })) } as unknown as Db, abortSignal };
}
describe("reward syncing is optional and bounded", () => {
  it("returns verified server grants and uses a request deadline", async () => {
    const value = {
      totalXp: 50,
      todayXp: 50,
      grants: [
        {
          id: "00000000-0000-4000-8000-000000000050",
          date: "2026-11-19",
          kind: "weight",
          slot: "",
          points: 50,
        },
      ],
    };
    const c = client(value);
    expect(await reconcileRewards(c.db)).toEqual(value);
    expect(c.abortSignal).toHaveBeenCalledWith(expect.any(AbortSignal));
  });
  it("does not throw when XP fails, is malformed, or times out", async () => {
    expect(await reconcileRewards(client(null, { message: "offline" }).db)).toBeNull();
    expect(await reconcileRewards(client({ totalXp: -1 }).db)).toBeNull();
    const db = {
      rpc: () => ({
        abortSignal: () => Promise.reject(new DOMException("Timeout", "TimeoutError")),
      }),
    } as unknown as Db;
    expect(await reconcileRewards(db)).toBeNull();
  });
  it("uses the agreed non-stacking reward table", () => {
    expect(REWARD_POINTS).toEqual({
      weight: 50,
      meal: 15,
      water: 15,
      recovery: 15,
      workout: 100,
      meals: 40,
      quests: 100,
    });
  });
  it("uses target-relative nutrition expressions without hard-coded calorie targets", () => {
    expect(nutritionMascot(0, 3000)).toBe("grumpy");
    expect(nutritionMascot(1500, 3000)).toBe("confident");
    expect(nutritionMascot(2100, 3000)).toBe("thinking");
    expect(nutritionMascot(3000, 3000)).toBe("happy");
    expect(nutritionMascot(0, 0)).toBe("grumpy");
  });
  it("distinguishes scheduled training from rest and celebrates completion", () => {
    expect(workoutMascot(null, true).expression).toBe("confident");
    expect(workoutMascot(null, false).expression).toBe("neutral");
    expect(workoutMascot("completed", true).expression).toBe("happy");
  });
});

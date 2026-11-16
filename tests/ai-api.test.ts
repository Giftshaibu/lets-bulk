import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { snapshot, id, owner } from "./ai-fixtures";
import { MockCoachingAIProvider } from "../src/lib/ai/mock.provider";
const state = vi.hoisted(() => ({
  data: null as unknown,
  rpc: vi.fn(),
  snapshot: vi.fn(),
  user: "",
}));
vi.mock("../src/lib/db/client", () => ({
  requestDb: () => ({
    auth: {
      getUser: async (token: string) =>
        token === "owner" || token === "other"
          ? {
              data: {
                user: {
                  id:
                    token === "owner"
                      ? "00000000-0000-4000-8000-000000000001"
                      : "00000000-0000-4000-8000-000000000002",
                },
              },
              error: null,
            }
          : { data: { user: null }, error: { message: "invalid" } },
    },
    rpc: state.rpc,
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        single: async () =>
          state.user === "owner"
            ? { data: { period_end: "2026-11-15" }, error: null }
            : { data: null, error: { code: "PGRST116", message: "not found" } },
      };
      return query;
    },
  }),
}));
vi.mock("../src/lib/repositories/app.repository", () => ({
  AppRepository: class {
    constructor(_db: unknown, userId: string) {
      state.user = userId.endsWith("1") ? "owner" : "other";
    }
    snapshot(start: string, end: string) {
      return state.snapshot(start, end);
    }
  },
}));
import { handleApi } from "../src/lib/services/api";
const runtime = { model: "mock", provider: new MockCoachingAIProvider() };
function request(action: string, body: unknown, token = "owner") {
  return new Request(`https://bulk.example/api/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-16T12:00:00Z"));
  state.data = snapshot();
  state.rpc.mockReset().mockImplementation((name: string) => {
    const p = Promise.resolve({
      data: name === "ai_begin" ? { state: "reserved", id: id(701) } : null,
      error: null,
    });
    return Object.assign(p, { abortSignal: () => p });
  });
  state.snapshot.mockReset().mockImplementation(async () => {
    const s = state.data as ReturnType<typeof snapshot>;
    return state.user === "owner"
      ? s
      : { ...s, profile: { ...s.profile, user_id: id(2) }, reviews: [], recommendations: [] };
  });
});
afterEach(() => vi.useRealTimers());
describe("authenticated AI API integration", () => {
  const cases: [string, unknown][] = [
    ["ai/explain-recommendation", { recommendationId: id(501) }],
    ["ai/parse-food-log", { text: "two eggs", date: "2026-11-16" }],
    ["ai/meal-suggestions", { mealType: "lunch", availableFoodIds: [id(101), id(102)] }],
    ["ai/explain-exercise", { exerciseId: id(401) }],
    ["ai/weekly-summary", { reviewId: id(601) }],
  ];
  it.each(cases)("requires authentication before %s reads or inference", async (action, body) => {
    expect((await handleApi(request(action, body, ""), runtime)).status).toBe(401);
    expect((await handleApi(request(action, body, "invalid"), runtime)).status).toBe(401);
    expect(state.snapshot).not.toHaveBeenCalled();
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it.each(cases)(
    "runs %s with an injected mock and only language-layer writes",
    async (action, body) => {
      const response = await handleApi(request(action, body), runtime);
      expect(response.status).toBe(200);
      const data = (await response.json()).data;
      expect(data.source).toBe("ai");
      expect(state.rpc.mock.calls.every(([name]) => ["ai_begin", "ai_finish"].includes(name))).toBe(
        true,
      );
    },
  );
  it("loads the actual review period, including historical weekly summaries", async () => {
    const response = await handleApi(request("ai/weekly-summary", { reviewId: id(601) }), runtime);
    expect(response.status).toBe(200);
    expect(state.snapshot).toHaveBeenCalledWith("2026-10-18", "2026-11-15");
  });
  it("denies another user’s recommendation and weekly review", async () => {
    expect(
      (
        await handleApi(
          request("ai/explain-recommendation", { recommendationId: id(501) }, "other"),
          runtime,
        )
      ).status,
    ).toBe(404);
    expect(
      (await handleApi(request("ai/weekly-summary", { reviewId: id(601) }, "other"), runtime))
        .status,
    ).toBe(404);
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it("rejects oversized descriptions and forged user or target context", async () => {
    expect(
      (
        await handleApi(
          request("ai/parse-food-log", { text: "x".repeat(1001), date: "2026-11-16" }),
          runtime,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await handleApi(
          request("ai/explain-recommendation", {
            recommendationId: id(501),
            user_id: owner,
            calories: 5000,
          }),
          runtime,
        )
      ).status,
    ).toBe(400);
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it("uses the separate deterministic batch endpoint only after explicit confirmation", async () => {
    state.rpc.mockResolvedValue({ data: 2, error: null });
    const response = await handleApi(
      request("nutrition/logs/batch", {
        date: "2026-11-16",
        items: [
          { id: id(801), foodId: id(101), grams: 100, slot: "lunch" },
          { id: id(802), foodId: id(102), grams: 150, slot: "lunch" },
        ],
      }),
      runtime,
    );
    expect(response.status).toBe(200);
    expect(state.rpc).toHaveBeenCalledExactlyOnceWith("log_food_batch", {
      p_date: "2026-11-16",
      p_items: [
        { id: id(801), foodId: id(101), grams: 100, slot: "lunch" },
        { id: id(802), foodId: id(102), grams: 150, slot: "lunch" },
      ],
    });
  });
});

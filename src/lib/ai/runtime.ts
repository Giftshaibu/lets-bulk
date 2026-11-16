import { CloudflareAIProvider } from "./cloudflare.provider";
import type { CoachingAIProvider } from "./provider";
import type { AIErrorCode } from "./types";
export type AIRuntime = { provider?: CoachingAIProvider; model: string; unavailable?: AIErrorCode };
export async function getAIRuntime(): Promise<AIRuntime> {
  try {
    const { env } = await import("cloudflare:workers");
    const model = env.CLOUDFLARE_AI_MODEL ?? "";
    if (env.AI_ENABLED !== "true" || env.AI_FREE_TIER_CONFIRMED !== "true")
      return { model, unavailable: "AI_DISABLED" };
    if (!env.AI || !model) return { model, unavailable: "AI_NOT_CONFIGURED" };
    return { model, provider: new CloudflareAIProvider(env.AI, model) };
  } catch {
    return { model: "", unavailable: "AI_NOT_CONFIGURED" };
  }
}

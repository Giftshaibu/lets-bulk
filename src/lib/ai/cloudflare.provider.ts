import type { CoachingAIProvider } from "./provider";
import { buildPrompt } from "./prompts";
import { validateOutput } from "./guardrails";
import { AIError, type Inputs } from "./types";
import type { Task, Output } from "./schemas";
export function extractResponse(raw: unknown): unknown {
  const value = raw as {
    choices?: { message?: { content?: unknown }; finish_reason?: string }[];
    response?: unknown;
  };
  if (value?.choices?.[0]?.finish_reason === "length") throw new AIError("AI_INVALID_RESPONSE");
  const content = value?.choices?.[0]?.message?.content ?? value?.response;
  if (typeof content === "object" && content !== null) return content;
  if (typeof content !== "string" || content.length > 20000)
    throw new AIError("AI_INVALID_RESPONSE");
  try {
    return JSON.parse(content);
  } catch {
    throw new AIError("AI_INVALID_RESPONSE");
  }
}
export class CloudflareAIProvider implements CoachingAIProvider {
  constructor(
    private readonly ai: CloudflareBindings["AI"],
    private readonly model: string,
    private readonly timeoutMs = 12000,
  ) {}
  private async run<T extends Task>(task: T, input: Inputs[T]): Promise<Output<T>> {
    const messages = buildPrompt(task, input);
    if (new TextEncoder().encode(JSON.stringify(messages)).length > 16000)
      throw new AIError("AI_OUTPUT_REJECTED");
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timed = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new AIError("AI_TIMEOUT"));
        }, this.timeoutMs);
      });
      // Workers-generated model types; runtime model errors are handled without switching providers.
      const response = await Promise.race([
        this.ai.run(
          this.model as keyof AiModels,
          {
            messages,
            stream: false,
            temperature: task === "parseFoodLog" ? 0 : 0.2,
            max_completion_tokens: 1536,
            chat_template_kwargs: { enable_thinking: false },
            response_format: { type: "json_object" },
            store: false,
            tool_choice: "none",
          },
          { signal: controller.signal },
        ),
        timed,
      ]);
      return validateOutput(task, extractResponse(response), input);
    } catch (e) {
      if (e instanceof AIError) throw e;
      throw new AIError(
        controller.signal.aborted
          ? "AI_TIMEOUT"
          : /model.*(unavailable|not found|deprecated)|5016/i.test(
                e instanceof Error ? e.message : "",
              )
            ? "AI_MODEL_UNAVAILABLE"
            : /quota|rate.?limit|429|neuron/i.test(e instanceof Error ? e.message : "")
              ? "AI_RATE_LIMITED"
              : "AI_REQUEST_FAILED",
      );
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }
  explainRecommendation = (v: Inputs["explainRecommendation"]) =>
    this.run("explainRecommendation", v);
  parseFoodLog = (v: Inputs["parseFoodLog"]) => this.run("parseFoodLog", v);
  suggestMeals = (v: Inputs["suggestMeals"]) => this.run("suggestMeals", v);
  explainExercise = (v: Inputs["explainExercise"]) => this.run("explainExercise", v);
  summarizeWeek = (v: Inputs["summarizeWeek"]) => this.run("summarizeWeek", v);
}

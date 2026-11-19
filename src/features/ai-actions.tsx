import { useAIAction } from "./use-ai-action";
import type { AIResult } from "@/lib/ai/types";
import type { Output } from "@/lib/ai/schemas";
import { MascotFeedback } from "./mascot-feedback";
import { helperMascot } from "@/lib/domain/mascot";
export function AIExplanation({
  kind,
  id,
}: {
  kind: "recommendation" | "exercise" | "week";
  id: string;
}) {
  const state =
    useAIAction<
      AIResult<
        Output<"explainRecommendation"> | Output<"explainExercise"> | Output<"summarizeWeek">
      >
    >();
  const action =
    kind === "recommendation"
      ? "explain-recommendation"
      : kind === "exercise"
        ? "explain-exercise"
        : "weekly-summary";
  const body =
    kind === "recommendation"
      ? { recommendationId: id }
      : kind === "exercise"
        ? { exerciseId: id }
        : { reviewId: id };
  const output = state.value?.result;
  return (
    <section className="my-3">
      {(state.pending || state.error || output) && (
        <MascotFeedback
          state={helperMascot(state.pending, state.error, !!output)}
          compact
          label="Helper encouragement"
        />
      )}
      <button
        className="min-h-11 rounded-xl border-2 border-border bg-card px-3 font-bold"
        disabled={state.pending}
        onClick={() => void state.run(`/api/ai/${action}`, body)}
      >
        {state.pending
          ? "Preparing…"
          : kind === "recommendation"
            ? "Why this change?"
            : kind === "exercise"
              ? "Explain more simply"
              : "This week in plain language"}
      </button>
      {state.error && (
        <p role="status" className="mt-2 text-sm">
          {state.error}
        </p>
      )}
      {output && (
        <div className="mt-3 rounded-xl bg-muted p-3 text-sm" aria-live="polite">
          {state.value?.source === "fallback" && (
            <p className="mb-2 font-bold">
              Automatic wording isn’t available right now. Here is your saved guidance.
            </p>
          )}
          {"why" in output && (
            <>
              <p className="font-bold">{output.summary}</p>
              <p className="mt-2">{output.why}</p>
              <p className="mt-2">{output.practicalNextStep}</p>
            </>
          )}
          {"steps" in output && (
            <>
              <p>{output.simpleExplanation}</p>
              <ol className="my-2 list-decimal space-y-1 pl-5">
                {output.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              <ul className="list-disc pl-5">
                {output.commonMistakes.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
              <p className="mt-2">{output.beginnerTip}</p>
            </>
          )}
          {"wins" in output && (
            <>
              <p className="font-bold">{output.headline}</p>
              <p>{output.summary}</p>
              <ul className="my-2 list-disc pl-5">
                {output.wins.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
              <p>{output.focusNextWeek}</p>
            </>
          )}
        </div>
      )}
    </section>
  );
}

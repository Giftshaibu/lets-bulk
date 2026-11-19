import { BottomSheet } from "@/components/bottom-sheet";
import { Check, X, Info, Dumbbell } from "lucide-react";
import { InfoCard } from "@/components/bottom-sheet";
import { Mascot } from "@/components/mascot";
import { AIExplanation } from "./ai-actions";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, ChunkyButton, SectionTitle } from "@/components/kit";
import { useAppData, api } from "./app-data";
import { inputClass, NumberField } from "./setup";
import { browserDb } from "@/lib/db/client";
import type {
  budgetSuggestions,
  budgetSummary,
  substitutions,
} from "@/lib/services/review.service";
const num = (f: FormData, key: string) => Number(f.get(key));
export function ReviewPanel() {
  const { data, act, pending, operation } = useAppData();
  const review = data.reviews[0],
    waiting = data.recommendations.filter((r) => r.status === "pending");
  const raw = review?.raw_analysis as Record<string, unknown> | undefined;
  const verdict =
    typeof raw?.["reason"] === "string"
      ? raw["reason"]
      : review
        ? "Your check-in is ready. Review any suggested changes below."
        : "Run a check-in to see how your last full week went.";
  return (
    <Card tone="special">
      <SectionTitle
        action={
          <Mascot
            expression={
              operation?.path === "/api/checkins/weekly" && operation.status === "saving"
                ? "thinking"
                : "confident"
            }
            className="h-20 w-20"
          />
        }
      >
        Weekly Check-In
      </SectionTitle>
      <p className="mb-3 text-sm font-bold">{verdict}</p>
      <ChunkyButton disabled={pending} onClick={() => void act("/api/checkins/weekly", {})}>
        Run weekly check-in
      </ChunkyButton>
      {review && (
        <p className="mt-2 text-xs text-muted-foreground">
          Last full week: {review.period_start}–{review.period_end}
        </p>
      )}
      <div className="mt-4 grid gap-3">
        {waiting.map((r) => (
          <div key={r.id} className="rounded-2xl border-2 border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 shrink-0 text-primary" />
              <h3 className="min-w-0 flex-1 truncate font-extrabold" title={r.title}>
                {r.title}
              </h3>
              <BottomSheet
                title="Why this suggestion?"
                trigger={
                  <button
                    type="button"
                    aria-label={`Why: ${r.title}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted"
                  >
                    <Info className="h-5 w-5" />
                  </button>
                }
              >
                <p className="font-bold">{r.title}</p>
                <ul className="my-3 list-disc space-y-2 pl-5">
                  <li>{r.reason}</li>
                  {r.description && <li>{r.description}</li>}
                  {r.current_value !== null && r.recommended_value !== null && (
                    <li>
                      {r.current_value} → {r.recommended_value} {r.unit}
                    </li>
                  )}
                  {r.blockedReason && <li>{r.blockedReason}</li>}
                </ul>
                <p className="text-sm">
                  Nothing changes until you choose Apply. Skip keeps your current plan.
                </p>
                <AIExplanation kind="recommendation" id={r.id} />
                {review && <AIExplanation kind="week" id={review.id} />}
              </BottomSheet>
            </div>
            {r.blockedReason && <p className="my-2 text-sm">{r.blockedReason}</p>}
            <div className="mt-3 flex gap-3">
              <ChunkyButton
                size="sm"
                disabled={pending || !!r.blockedReason}
                onClick={() => void act(`/api/recommendations/${r.id}/accept`, {})}
              >
                <Check className="h-4 w-4" />
                Apply
              </ChunkyButton>
              <ChunkyButton
                size="sm"
                tone="neutral"
                disabled={pending}
                onClick={() => void act(`/api/recommendations/${r.id}/reject`, {})}
              >
                <X className="h-4 w-4" />
                Skip
              </ChunkyButton>
            </div>
          </div>
        ))}
      </div>
      {review && !waiting.length && (
        <p className="mt-3 text-sm">No changes waiting. Keep following your saved plan.</p>
      )}
    </Card>
  );
}
function ReviewExplanation({ analysis }: { analysis: unknown }) {
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) return null;
  const a = analysis as Record<string, unknown>;
  const blocks = Array.isArray(a["blocks"])
    ? a["blocks"].filter((b): b is string => typeof b === "string")
    : [];
  return (
    <InfoCard title={<>Why this recommendation?</>}>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {["calorieAdherence", "proteinAdherence", "workoutAdherence"].map((k) =>
          typeof a[k] === "number" ? (
            <p key={k}>
              {k.replace("Adherence", " adherence")}: {Math.round((a[k] as number) * 100)}%
            </p>
          ) : null,
        )}
      </div>
      {blocks.map((b) => (
        <p className="mt-2 text-sm" key={b}>
          {b}
        </p>
      ))}
    </InfoCard>
  );
}

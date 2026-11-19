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
  const { data, act, pending } = useAppData();
  return (
    <Card tone="special">
      <SectionTitle
        action={<Mascot expression="thinking" variant="face" className="h-8 w-8" interactive />}
      >
        Weekly review
      </SectionTitle>
      <p className="text-sm font-bold">Coach Chiuli checked your week. You decide what sticks.</p>
      <ChunkyButton
        className="my-3"
        disabled={pending}
        onClick={() => void act("/api/checkins/weekly", {})}
      >
        Run weekly check-in
      </ChunkyButton>
      {data.reviews[0] && (
        <details className="mb-3 text-sm">
          <summary className="min-h-11 cursor-pointer font-bold">Review evidence</summary>
          <p>
            {data.reviews[0].period_start}–{data.reviews[0].period_end} · data{" "}
            {Math.round(data.reviews[0].data_completeness * 100)}% · confidence{" "}
            {Math.round(data.reviews[0].confidence * 100)}%
          </p>
          <ReviewExplanation analysis={data.reviews[0].raw_analysis} />
        </details>
      )}
      {data.reviews[0] && (
        <AIExplanation
          key={data.reviews[0].id + JSON.stringify(data.reviews[0].raw_analysis)}
          kind="week"
          id={data.reviews[0].id}
        />
      )}
      <div className="grid gap-3">
        {data.recommendations.map((r) => (
          <div key={r.id} className="rounded-xl border-2 border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <Mascot expression="thinking" variant="face" className="h-8 w-8" interactive />
              <h3 className="min-w-0 font-extrabold">{r.title}</h3>
            </div>
            <p className="text-sm">{r.reason}</p>
            {r.description && <p className="mt-2 text-sm">{r.description}</p>}
            {r.current_value !== null && r.recommended_value !== null && (
              <p className="mt-2 font-bold">
                {r.current_value} → {r.recommended_value} {r.unit}
              </p>
            )}
            {r.blockedReason && <p className="mt-2 text-sm font-bold">{r.blockedReason}</p>}
            <AIExplanation
              key={r.id + r.status + String(r.recommended_value) + r.reason}
              kind="recommendation"
              id={r.id}
            />
            <p className="my-2 text-xs font-bold uppercase">
              {r.status} ·{" "}
              {r.request_id
                ? "Your request"
                : `confidence ${Math.round((r.confidence ?? 0) * 100)}%`}
            </p>
            {r.status === "pending" && (
              <div className="flex flex-wrap gap-2">
                <ChunkyButton
                  size="sm"
                  disabled={pending || !!r.blockedReason}
                  onClick={() => void act(`/api/recommendations/${r.id}/accept`, {})}
                >
                  Apply
                </ChunkyButton>
                <ChunkyButton
                  size="sm"
                  tone="neutral"
                  disabled={pending}
                  onClick={() => void act(`/api/recommendations/${r.id}/reject`, {})}
                >
                  Keep current
                </ChunkyButton>
              </div>
            )}
          </div>
        ))}
      </div>
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
    <details className="mb-3">
      <summary className="min-h-11 font-bold">Why this recommendation?</summary>
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
    </details>
  );
}

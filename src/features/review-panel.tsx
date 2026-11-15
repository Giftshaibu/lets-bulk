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
      <SectionTitle>Weekly review</SectionTitle>
      <p className="text-sm font-bold">
        Review the last completed week. Changes remain suggestions until you apply them.
      </p>
      <ChunkyButton
        className="my-3"
        disabled={pending}
        onClick={() => void act("/api/checkins/weekly", {})}
      >
        Run weekly check-in
      </ChunkyButton>
      {data.reviews[0] && (
        <p className="mb-3 text-sm">
          {data.reviews[0].period_start}–{data.reviews[0].period_end} · data{" "}
          {Math.round(data.reviews[0].data_completeness * 100)}% · confidence{" "}
          {Math.round(data.reviews[0].confidence * 100)}%
        </p>
      )}
      <div className="grid gap-3">
        {data.recommendations.map((r) => (
          <div key={r.id} className="rounded-xl border-2 border-border bg-card p-3">
            <h3 className="font-extrabold">{r.title}</h3>
            <p className="text-sm">{r.reason}</p>
            <p className="my-2 text-xs font-bold uppercase">
              {r.status} · confidence {Math.round(r.confidence * 100)}%
            </p>
            {r.status === "pending" && (
              <div className="flex flex-wrap gap-2">
                <ChunkyButton
                  size="sm"
                  disabled={pending}
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

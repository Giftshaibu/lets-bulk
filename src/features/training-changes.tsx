import { useState } from "react";
import { Card, ChunkyButton, SectionTitle } from "@/components/kit";
import { useAppData } from "./app-data";
import { inputClass } from "./setup";
export function TrainingChanges() {
  const { data, act, pending } = useAppData();
  const [message, setMessage] = useState("");
  async function propose(value: Record<string, unknown>) {
    if (await act("/api/training/recommendations", { id: crypto.randomUUID(), ...value }))
      setMessage(
        "Proposal saved. Open Today → Weekly review to apply it or keep your current plan.",
      );
  }
  return (
    <Card>
      <SectionTitle>Review training changes</SectionTitle>
      <p className="text-sm">
        Test a tweak — nothing changes until you approve it in Weekly review.
      </p>
      {data.activeProgram?.phase === "deload" ? (
        <div className="my-3">
          <p className="font-bold">
            Deload active until {data.activeProgram.planned_until}. Loads are unchanged and working
            sets are reduced.
          </p>
          {data.activeProgram.planned_until && data.activeProgram.planned_until <= data.date && (
            <ChunkyButton
              className="mt-3"
              disabled={pending}
              onClick={() => void propose({ type: "restore" })}
            >
              Propose restoring volume
            </ChunkyButton>
          )}
        </div>
      ) : (
        <ChunkyButton
          className="my-3"
          disabled={pending}
          onClick={() => void propose({ type: "deload" })}
        >
          Request 7-day deload
        </ChunkyButton>
      )}
      {data.programExercises.map((p) => {
        const option = data.exerciseOptions.find((o) => o.planId === p.id);
        return (
          <details key={p.id} className="my-3 rounded-xl border-2 border-border p-3">
            <summary className="min-h-11 font-bold">
              {p.workoutName} · {option?.name}
              {option && !option.equipmentAvailable ? " — equipment unavailable" : ""}
            </summary>
            <p className="text-sm">
              Current prescription: {p.sets} sets, {p.rep_min}–{p.rep_max} reps.
            </p>
            {data.activeProgram?.phase !== "deload" && (
              <div className="my-3 flex flex-wrap gap-2">
                <ChunkyButton
                  size="sm"
                  disabled={pending || p.sets >= 10}
                  onClick={() => void propose({ type: "volume", planId: p.id, direction: 1 })}
                >
                  Propose one extra set
                </ChunkyButton>
                <ChunkyButton
                  size="sm"
                  tone="neutral"
                  disabled={pending || p.sets <= 1}
                  onClick={() => void propose({ type: "volume", planId: p.id, direction: -1 })}
                >
                  Propose one fewer set
                </ChunkyButton>
              </div>
            )}
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void propose({
                  type: "substitution",
                  planId: p.id,
                  replacementId: String(new FormData(e.currentTarget).get("replacement")),
                });
              }}
            >
              <label className="font-bold">
                Compatible replacement
                <select className={inputClass} name="replacement" required>
                  <option value="">Choose an exercise</option>
                  {option?.substitutes.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.equipment})
                    </option>
                  ))}
                </select>
              </label>
              <ChunkyButton size="sm" disabled={pending || !option?.substitutes.length}>
                Propose exercise swap
              </ChunkyButton>
            </form>
          </details>
        );
      })}
      {message && (
        <p role="status" className="mt-3 font-bold">
          {message}
        </p>
      )}
    </Card>
  );
}

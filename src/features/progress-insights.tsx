import { units, massFromKg, massToKg, massLabel, massText } from "@/lib/domain/units";
import { InfoCard } from "@/components/bottom-sheet";
import { Card, SectionTitle } from "@/components/kit";
import { useAppData } from "./app-data";
export function ProgressInsights() {
  const { data } = useAppData(),
    insight = data.progressAnalysis,
    training = data.trainingAnalytics;
  const mass = units(data.preferences).mass;
  return (
    <>
      <Card>
        <SectionTitle>Weekly averages & outlook</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {insight.weeklyAverages.map((w) => (
            <div className="rounded-xl bg-muted p-3" key={w.end}>
              <p className="text-xs font-bold">
                {w.start}–{w.end}
              </p>
              <p className="font-extrabold">
                {w.average === null ? "No weigh-ins" : massLabel(w.average, mass, 2)} · {w.count}{" "}
                logs
              </p>
            </div>
          ))}
        </div>
        <p className="my-3 text-sm">{insight.projectionReason}</p>
        <div className="grid grid-cols-3 gap-3">
          {insight.projections.map((p) => (
            <div className="rounded-xl bg-muted p-3" key={p.weeks}>
              <p className="text-xs font-bold">In {p.weeks} weeks</p>
              <p className="font-extrabold">
                {p.kg === null ? "Not enough data" : massLabel(p.kg, mass)}
              </p>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <SectionTitle>Observed maintenance estimate</SectionTitle>
        <p className="text-sm">{insight.maintenance.reason}</p>
        {insight.maintenance.available && (
          <p className="mt-3 font-extrabold">
            About {insight.maintenance.calories?.toLocaleString()} kcal/day · confidence{" "}
            {Math.round(insight.maintenance.confidence * 100)}%
          </p>
        )}
      </Card>
      <Card>
        <SectionTitle>Training volume this week</SectionTitle>
        <p className="mb-3 text-sm">
          Completed working sets by primary muscle. Warm-ups are excluded.
        </p>
        {training.weeklyMuscles.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="p-2">Muscle</th>
                  <th className="p-2">Sets</th>
                  <th className="p-2">Reps</th>
                  <th className="p-2">Volume ({mass})</th>
                  <th className="p-2">Avg RIR</th>
                </tr>
              </thead>
              <tbody>
                {training.weeklyMuscles.map((m) => (
                  <tr key={m.muscle}>
                    <td className="p-2 font-bold">{m.muscle}</td>
                    <td className="p-2">{m.sets}</td>
                    <td className="p-2">{m.reps}</td>
                    <td className="p-2">
                      {Math.round(massFromKg(m.volume, mass)).toLocaleString()}
                    </td>
                    <td className="p-2">{m.averageRir === null ? "—" : m.averageRir.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No completed working sets this week.</p>
        )}
      </Card>
      <Card>
        <SectionTitle>Performance & effort</SectionTitle>
        <p className="mb-3 text-sm">
          Estimated 1RM is shown for weighted sets of up to 12 reps. It is a rough indicator;
          added-load volume does not measure the full effort of bodyweight exercises.
        </p>
        <div className="grid gap-3">
          {training.performance.map((e) => (
            <InfoCard
              title={
                <>
                  {e.name} · {e.recent.totalReps} reps · RIR{" "}
                  {e.recent.averageRir === null ? "—" : e.recent.averageRir.toFixed(1)}
                </>
              }
            >
              <p className="text-sm">
                Recent estimated 1RM:{" "}
                {e.recent.estimated1RM > 0
                  ? massLabel(e.recent.estimated1RM, mass)
                  : "unavailable for these sets"}
                . RIR change:{" "}
                {e.rirChange === null ? "needs another session" : e.rirChange.toFixed(1)}.
              </p>
              {e.history.slice(-6).map((h) => (
                <p className="mt-2 text-sm" key={h.sessionId}>
                  {h.date}: {h.totalReps} reps · {massLabel(h.volume, mass, 0)} added-load volume ·
                  RIR {h.averageRir === null ? "—" : h.averageRir.toFixed(1)}
                </p>
              ))}
            </InfoCard>
          ))}
        </div>
      </Card>
    </>
  );
}

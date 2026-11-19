import { units, massFromKg, massToKg, massLabel, massText } from "@/lib/domain/units";
import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Bar, BigStat, Card, Pill, SectionTitle } from "@/components/kit";
import { useAppData } from "@/features/app-data";
import { ProgressInsights } from "@/features/progress-insights";
import { BodyForms } from "@/features/tracking-forms";

export const Route = createFileRoute("/progress-details")({
  validateSearch: (search: Record<string, unknown>) => ({
    section: typeof search["section"] === "string" ? search["section"] : "weight",
  }),
  head: () => ({
    meta: [
      { title: "Progress — Chiuli Training Companion" },
      {
        name: "description",
        content:
          "Track body weight trend, strength gains on the main lifts and body measurements over your bulk.",
      },
      { property: "og:title", content: "Progress — Chiuli Training Companion" },
      {
        property: "og:description",
        content: "Weight trend, strength curves and measurements across the bulk.",
      },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const { data } = useAppData();
  const mass = units(data.preferences).mass;
  const { section } = Route.useSearch();
  const { lifts, measurements, profile } = data;
  const series = data.weight.series;
  const last = series.at(-1);
  const gained = data.weight.gained;
  const perWeek = data.weight.perWeek;
  const prCount = lifts.filter((l) => l.pr).length;

  return (
    <AppShell
      title="Progress"
      subtitle={`Week ${profile.weekNumber}${profile.totalWeeks ? ` of ${profile.totalWeeks}` : ""}`}
    >
      <div className="flex flex-col gap-4">
        {section !== "strength" && (
          <BodyForms
            section={
              section === "measurements"
                ? "measurements"
                : section === "photos"
                  ? "photos"
                  : "weight"
            }
          />
        )}
        {(section === "weight" || section === "strength") && <ProgressInsights />}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3">
            <BigStat
              value={`+${massFromKg(gained, mass).toFixed(1)}`}
              suffix={mass}
              label="Gained"
              tone="success"
            />
          </Card>
          <Card className="p-3" tone="reward">
            <BigStat value={profile.streakDays} label="Day streak" tone="reward" />
          </Card>
          <Card className="p-3" tone="special">
            <BigStat value={prCount} label="PRs" tone="special" />
          </Card>
        </div>

        {section === "weight" && (
          <Card>
            <SectionTitle>Body weight</SectionTitle>
            <div className="flex items-end justify-between">
              <BigStat
                value={last ? Number(massFromKg(last.kg, mass).toFixed(1)) : "—"}
                suffix={mass}
                label="Latest weigh-in"
              />
              <Pill tone={data.weight.status === "on_target" ? "success" : "primary"}>
                {perWeek === null
                  ? "Collect more weigh-ins"
                  : `${massLabel(perWeek, mass, 2)} / week`}
              </Pill>
            </div>
            <WeightChart points={series} />
            <div className="mt-3">
              <div className="mb-1.5 flex justify-between text-[12px] font-extrabold text-muted-foreground uppercase">
                <span>{massLabel(profile.startWeightKg, mass)} start</span>
                <span>{massLabel(profile.goalWeightKg, mass)} goal</span>
              </div>
              <Bar
                value={(last?.kg ?? profile.startWeightKg) - profile.startWeightKg}
                max={profile.goalWeightKg - profile.startWeightKg}
                tone="success"
              />
            </div>
          </Card>
        )}

        {section === "strength" && (
          <Card>
            <SectionTitle>Strength</SectionTitle>
            <div className="flex flex-col gap-3">
              {lifts.map((l) => {
                const max = Math.max(...l.history.map((h) => h.kg));
                return (
                  <div
                    key={l.id}
                    className={`rounded-2xl border-2 border-b-4 p-3 ${
                      l.pr ? "border-special bg-special-soft" : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[16px] font-extrabold">{l.name}</span>
                        {l.pr && <Trophy className="h-4 w-4 text-special-ink" strokeWidth={2.8} />}
                      </div>
                      <span className="text-[20px] font-extrabold">
                        {massLabel(l.currentKg, mass)}
                      </span>
                    </div>
                    <div className="mt-3 flex h-16 items-end gap-1.5">
                      {l.history.map((h) => (
                        <div key={h.week} className="flex flex-1 flex-col items-center gap-1">
                          <div
                            className={`w-full rounded-t-md ${l.pr ? "bg-special" : "bg-primary"}`}
                            style={{ height: `${(h.kg / Math.max(max, 1)) * 52}px` }}
                          />
                          <span className="text-[9px] font-extrabold text-muted-foreground">
                            {h.week}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {section === "measurements" && (
          <Card>
            <SectionTitle>Measurements</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              {measurements.map((m) => (
                <div key={m.id} className="rounded-2xl border-2 border-b-4 border-border p-3">
                  <BigStat value={m.value} suffix={m.unit} label={m.name} />
                  <div className="mt-1 text-[12px] font-extrabold text-success">
                    +{m.change.toFixed(1)} {m.unit}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function WeightChart({ points }: { points: { date: string; kg: number; trend: number }[] }) {
  if (!points.length) return <p className="mt-3 text-sm">No weigh-ins yet.</p>;
  const values = points.flatMap((p) => [p.kg, p.trend]);
  const min = Math.min(...values) - 0.5;
  const max = Math.max(...values) + 0.5;
  const w = 320;
  const h = 120;
  const line = (key: "kg" | "trend") =>
    points
      .map((p, i) => {
        const x = (i / Math.max(points.length - 1, 1)) * w;
        const y = h - ((p[key] - min) / (max - min)) * h;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  return (
    <div className="mt-3">
      <svg
        role="img"
        aria-label="Weight history"
        viewBox={`0 0 ${w} ${h}`}
        className="h-[120px] w-full"
        preserveAspectRatio="none"
      >
        <path
          d={line("trend")}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth={3}
          strokeDasharray="6 6"
        />
        <path
          d={line("kg")}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex justify-between text-[11px] font-extrabold text-muted-foreground">
        {points.map((p) => (
          <span key={p.date}>{p.date}</span>
        ))}
      </div>
    </div>
  );
}

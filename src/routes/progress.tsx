import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Bar, BigStat, Card, Pill, SectionTitle } from "@/components/kit";
import {
  getLifts,
  getMeasurements,
  getProfile,
  getWeightSeries,
} from "@/lib/data/service";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress — Gift Bulk Training Companion" },
      {
        name: "description",
        content:
          "Track body weight trend, strength gains on the main lifts and body measurements over your bulk.",
      },
      { property: "og:title", content: "Progress — Gift Bulk Training Companion" },
      {
        property: "og:description",
        content: "Weight trend, strength curves and measurements across the bulk.",
      },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const series = getWeightSeries();
  const lifts = getLifts();
  const measurements = getMeasurements();
  const profile = getProfile();

  const first = series[0]!;
  const last = series[series.length - 1]!;
  const gained = last.kg - first.kg;
  const perWeek = gained / Math.max(series.length - 1, 1);
  const prCount = lifts.filter((l) => l.pr).length;

  return (
    <AppShell title="Progress" subtitle={`Week ${profile.weekNumber} of ${profile.totalWeeks}`}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3">
            <BigStat value={`+${gained.toFixed(1)}`} suffix="kg" label="Gained" tone="success" />
          </Card>
          <Card className="p-3" tone="reward">
            <BigStat value={profile.streakDays} label="Day streak" tone="reward" />
          </Card>
          <Card className="p-3" tone="special">
            <BigStat value={prCount} label="PRs" tone="special" />
          </Card>
        </div>

        <Card>
          <SectionTitle>Body weight</SectionTitle>
          <div className="flex items-end justify-between">
            <BigStat value={last.kg} suffix="kg" label="Latest weigh-in" />
            <Pill tone={perWeek >= 0.3 ? "success" : "primary"}>
              {perWeek.toFixed(2)} kg / week
            </Pill>
          </div>
          <WeightChart points={series} />
          <div className="mt-3">
            <div className="mb-1.5 flex justify-between text-[12px] font-extrabold text-muted-foreground uppercase">
              <span>{profile.startWeightKg} kg start</span>
              <span>{profile.goalWeightKg} kg goal</span>
            </div>
            <Bar
              value={last.kg - profile.startWeightKg}
              max={profile.goalWeightKg - profile.startWeightKg}
              tone="success"
            />
          </div>
        </Card>

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
                    <span className="text-[20px] font-extrabold">{l.currentKg} kg</span>
                  </div>
                  <div className="mt-3 flex h-16 items-end gap-1.5">
                    {l.history.map((h) => (
                      <div key={h.week} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className={`w-full rounded-t-md ${l.pr ? "bg-special" : "bg-primary"}`}
                          style={{ height: `${(h.kg / max) * 52}px` }}
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
      </div>
    </AppShell>
  );
}

function WeightChart({ points }: { points: { date: string; kg: number; trend: number }[] }) {
  const values = points.flatMap((p) => [p.kg, p.trend]);
  const min = Math.min(...values) - 0.5;
  const max = Math.max(...values) + 0.5;
  const w = 320;
  const h = 120;
  const line = (key: "kg" | "trend") =>
    points
      .map((p, i) => {
        const x = (i / (points.length - 1)) * w;
        const y = h - ((p[key] - min) / (max - min)) * h;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[120px] w-full" preserveAspectRatio="none">
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

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card, SectionTitle } from "@/components/kit";
import { useAppData } from "@/features/app-data";
import { BodyForms } from "@/features/body-forms";
import { TargetExplanation } from "@/features/target-explanation";
import { addDays } from "@/lib/domain/dates";
export const Route = createFileRoute("/progress")({ component: Progress });
function Progress() {
  const { data } = useAppData();
  const [selected, setSelected] = useState<number | null>(null);
  const [weightOpen, setWeightOpen] = useState(false);
  const mapViewport = useRef<HTMLDivElement>(null);
  const start = data.rawProfile?.start_date ?? data.date;
  const elapsed = Math.max(0, Math.floor((Date.parse(data.date) - Date.parse(start)) / 604800000));
  useEffect(() => {
    if (mapViewport.current) mapViewport.current.scrollTop = Math.max(0, elapsed * 112 - 112);
  }, [elapsed]);
  const weeks = Array.from(
    { length: Math.min(520, Math.max(8, elapsed + 4, data.profile.totalWeeks ?? 0)) },
    (_, i) => {
      const from = addDays(start, i * 7),
        to = addDays(from, 6);
      return { from, to, logs: data.loggingDates.filter((d) => d >= from && d <= to).length };
    },
  );
  return (
    <AppShell
      title="Your journey"
      subtitle="One intentional action keeps your logging streak going"
    >
      <div className="grid gap-4">
        <Card>
          <p className="text-2xl font-extrabold">🔥 {data.streak.current} day logging streak</p>
          <details>
            <summary className="min-h-11 cursor-pointer font-bold">What keeps my streak?</summary>
            <p>
              Log food, weight, a set, water, recovery, measurements or a photo. Opening the app
              alone does not count.
            </p>
          </details>
          <p className="mt-2">
            Full plan consistency: {data.consistency.completedThisWeek} days this week. Longest
            logging streak: {data.streak.longest} days.
          </p>
          <button
            className="mt-3 min-h-11 rounded-xl border-2 border-primary bg-primary-soft px-4 font-bold"
            onClick={() => setWeightOpen(true)}
          >
            Log weight
          </button>
        </Card>
        <Card>
          <SectionTitle>Week by week</SectionTitle>
          <p>
            Green weeks contain logged activity. Orange is your current week. Future weeks unlock
            with time.
          </p>
          <div
            className="my-5 max-h-[440px] overflow-x-hidden overflow-y-auto rounded-xl border border-border"
            aria-label="Journey map"
            ref={mapViewport}
          >
            <div className="relative mx-auto max-w-[300px]">
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox={`0 0 300 ${weeks.length * 112}`}
                aria-hidden="true"
              >
                <path
                  d={weeks
                    .map((_, i) => {
                      const x = 150 + Math.sin(i * 1.25) * 60,
                        y = 40 + i * 112;
                      return i === 0
                        ? `M ${x} ${y}`
                        : `C ${150 + Math.sin((i - 1) * 1.25) * 60} ${y - 56}, ${x} ${y - 56}, ${x} ${y}`;
                    })
                    .join(" ")}
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="5"
                />
              </svg>
              {weeks.map((w, i) => (
                <div
                  key={w.from}
                  className="relative flex h-28 justify-center"
                  style={{ transform: `translateX(${Math.sin(i * 1.25) * 60}px)` }}
                >
                  <button
                    disabled={i > elapsed}
                    aria-label={`Week ${i + 1}, ${i > elapsed ? "locked" : w.logs + " logging days"}`}
                    onClick={() => setSelected(i)}
                    className={`relative z-10 h-20 w-20 rounded-full border-4 border-b-8 font-extrabold ${i === elapsed ? "border-primary bg-primary-soft" : i < elapsed && w.logs > 0 ? "border-success bg-success-soft" : "border-border bg-muted"}`}
                  >
                    {i > elapsed ? "🔒" : i + 1}
                  </button>
                </div>
              ))}
            </div>
          </div>
          <Dialog.Root
            open={selected !== null}
            onOpenChange={(open) => {
              if (!open) setSelected(null);
            }}
          >
            {selected !== null && (
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
                <Dialog.Content
                  aria-describedby={undefined}
                  className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-border bg-card p-5"
                >
                  <Dialog.Title className="text-xl font-bold">Week {selected + 1}</Dialog.Title>
                  <Dialog.Close className="my-2 min-h-11 font-bold underline">Close</Dialog.Close>
                  <p>
                    {weeks[selected]!.from} – {weeks[selected]!.to}
                  </p>
                  <p>
                    {weeks[selected]!.logs} days with intentional logs. Missing weeks stay visible;
                    no activity is assumed.
                  </p>
                  <p className="mt-2">
                    {data.journeyWeeks[selected]?.workouts ?? 0} completed workouts ·{" "}
                    {data.journeyWeeks[selected]?.weightLogs ?? 0} weight logs ·{" "}
                    {data.journeyWeeks[selected]?.photos ?? 0} photos.
                  </p>
                  <p>
                    Average weight: {data.journeyWeeks[selected]?.averageWeight ?? "No weigh-ins"}
                    {data.journeyWeeks[selected]?.averageWeight !== null ? " kg" : ""}. Full-plan
                    days: {data.journeyWeeks[selected]?.consistentDays ?? 0}.
                  </p>
                  <Link
                    to="/progress-details"
                    search={{ section: "weight" }}
                    className="inline-flex min-h-11 items-center underline"
                  >
                    Explore progress details
                  </Link>
                </Dialog.Content>
              </Dialog.Portal>
            )}
          </Dialog.Root>
        </Card>
        <TargetExplanation />
        <nav className="grid grid-cols-2 gap-3">
          {["Weight", "Strength", "Measurements", "Photos"].map((label) => (
            <Link
              className="rounded-2xl border-2 border-b-4 border-border bg-card p-4 font-bold"
              to="/progress-details"
              search={{ section: label.toLowerCase() }}
              key={label}
            >
              {label} →
            </Link>
          ))}
        </nav>
        <Card>
          <SectionTitle>Your milestones</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {[3, 7, 14, 30, 60, 100].map((n) => (
              <span
                className={`rounded-full border-2 px-3 py-2 font-bold ${data.streak.longest >= n ? "border-success bg-success-soft" : "border-border"}`}
                key={n}
              >
                {data.streak.longest >= n ? "✓" : "○"} {n} day streak
              </span>
            ))}
          </div>
          <p className="mt-3">
            {data.lifts.filter((l) => l.pr).length} recorded personal records · {data.photos.length}{" "}
            progress photos · {data.weight.series.length} weigh-ins
          </p>
        </Card>

        <Dialog.Root open={weightOpen} onOpenChange={setWeightOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
            <Dialog.Content
              aria-describedby={undefined}
              className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-border bg-card p-4"
            >
              <Dialog.Title className="text-xl font-bold">Log weight</Dialog.Title>
              <Dialog.Close className="my-2 min-h-11 font-bold underline">Close</Dialog.Close>
              <BodyForms />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </AppShell>
  );
}

import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowDown, Check, Flag, LockKeyhole, Mountain, Trophy, X } from "lucide-react";
import { Brand, ChiuliIcon } from "@/components/brand";
import { SettingsLink } from "@/components/settings-link";
import { useAppData } from "@/features/app-data";
import { addDays } from "@/lib/domain/dates";

export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { title: "Your journey — Chiuli" },
      {
        name: "description",
        content: "Explore your Chiuli journey, one week and one landmark at a time.",
      },
    ],
  }),
  component: Journey,
});

function Journey() {
  const { data } = useAppData();
  const start = data.rawProfile?.start_date ?? data.date;
  const elapsed = Math.max(0, Math.floor((Date.parse(data.date) - Date.parse(start)) / 604800000));
  const currentWeek = useRef<HTMLLIElement>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const weeks = Array.from(
    { length: Math.min(520, Math.max(8, elapsed + 4, data.profile.totalWeeks ?? 0)) },
    (_, i) => {
      const from = addDays(start, i * 7),
        to = addDays(from, 6);
      return { from, to, logs: data.loggingDates.filter((d) => d >= from && d <= to).length };
    },
  );
  useEffect(() => {
    if (elapsed > 1) currentWeek.current?.scrollIntoView({ block: "center" });
  }, [elapsed]);
  const details = selected === null ? null : data.journeyWeeks[selected];
  const position = (i: number) => 180 + Math.sin(i * 1.25) * 78;
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <Link
            to="/progress"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-extrabold"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            Progress
          </Link>
          <div className="ml-auto flex items-center gap-1 sm:gap-3">
            <Link to="/" aria-label="Chiuli home">
              <Brand />
            </Link>
            <SettingsLink />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 pb-12">
        <section className="pt-8 text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
            Small steps. Stronger you.
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Your journey</h1>
          <p className="mx-auto mt-3 max-w-md text-sm font-bold text-muted-foreground">
            Every week is part of your story. Explore your landmarks and the progress you’ve
            actually logged.
          </p>
          <div
            className="mt-5 flex flex-wrap justify-center gap-4 text-xs font-bold text-muted-foreground"
            aria-label="Map legend"
          >
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-success" aria-hidden="true" />
              Activity logged
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ChiuliIcon className="h-5 w-5" />
              Current week
            </span>
            <span className="inline-flex items-center gap-1.5">
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              Ahead of you
            </span>
          </div>
          <button
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-primary bg-primary-soft px-4 text-sm font-extrabold text-primary-shadow"
            onClick={() =>
              currentWeek.current?.scrollIntoView({
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "instant"
                  : "smooth",
                block: "center",
              })
            }
          >
            Find my current week
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </section>
        <section aria-label="Journey map" className="relative mx-auto mt-8 w-full max-w-[560px]">
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 360 ${weeks.length * 168}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d={weeks
                .map((_, i) =>
                  i === 0
                    ? `M ${position(i)} 64`
                    : `C ${position(i - 1)} ${i * 168 - 20}, ${position(i)} ${i * 168 - 20}, ${position(i)} ${64 + i * 168}`,
                )
                .join(" ")}
              fill="none"
              stroke="var(--border)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray="2 18"
            />
          </svg>
          <ol>
            {weeks.map((week, i) => {
              const locked = i > elapsed,
                current = i === elapsed,
                logged = week.logs > 0;
              const Landmark = i === 0 ? Flag : (i + 1) % 4 === 0 ? Trophy : Mountain;
              return (
                <li
                  key={week.from}
                  ref={current ? currentWeek : undefined}
                  className="relative flex h-[168px] scroll-mt-28 flex-col items-center"
                  style={{
                    paddingLeft: `${Math.max(0, Math.sin(i * 1.25) * 43)}%`,
                    paddingRight: `${Math.max(0, -Math.sin(i * 1.25) * 43)}%`,
                  }}
                >
                  {current && (
                    <span className="absolute -top-3 z-10 rounded-full bg-primary px-3 py-1 text-[10px] font-black tracking-wider text-white uppercase">
                      You are here
                    </span>
                  )}
                  <button
                    disabled={locked}
                    aria-label={`Week ${i + 1}, ${locked ? "locked" : `${week.logs} logging days`}`}
                    aria-current={current ? "step" : undefined}
                    aria-expanded={selected === i}
                    onClick={() => setSelected(selected === i ? null : i)}
                    className={`relative mt-3 flex h-24 w-24 shrink-0 items-center justify-center rounded-[2rem] border-2 border-b-[6px] shadow-sm transition-transform enabled:hover:-translate-y-1 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-primary ${current ? "border-primary bg-primary-soft ring-8 ring-primary/10" : logged ? "border-success bg-success-soft text-success" : "border-border bg-card text-muted-foreground"}`}
                  >
                    {current ? (
                      <ChiuliIcon className="h-18 w-18" />
                    ) : locked ? (
                      <LockKeyhole className="h-8 w-8" aria-hidden="true" />
                    ) : (
                      <Landmark className="h-9 w-9" strokeWidth={2} aria-hidden="true" />
                    )}
                    {logged && !current && (
                      <span className="absolute -right-1 -bottom-1 rounded-full bg-success p-1 text-white">
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </span>
                    )}
                  </button>
                  <span className="mt-2 text-sm font-black">Week {i + 1}</span>
                  <span className="text-[11px] font-bold text-muted-foreground">
                    {new Date(`${week.from}T12:00:00Z`).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      timeZone: "UTC",
                    })}
                    {locked
                      ? " · Upcoming"
                      : logged
                        ? ` · ${week.logs} active ${week.logs === 1 ? "day" : "days"}`
                        : " · No logs"}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
        <p className="mx-auto max-w-sm text-center text-sm font-bold text-muted-foreground">
          A quiet week still belongs on your map. Your next action is a fresh start.
        </p>
      </main>
      {selected !== null && (
        <section
          role="region"
          aria-label={`Week ${selected + 1} details`}
          className="fixed inset-x-0 bottom-0 z-40 max-h-[55dvh] overflow-y-auto border-t-2 border-primary bg-card p-5 shadow-xl"
        >
          <div className="mx-auto max-w-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Week {selected + 1}</h2>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close week details"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-border"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              {weeks[selected]!.from} – {weeks[selected]!.to}
            </p>
            <p className="mt-3 font-bold">
              {weeks[selected]!.logs} days with intentional logs · {details?.workouts ?? 0} workouts
              · {details?.weightLogs ?? 0} weigh-ins · {details?.photos ?? 0} photos
            </p>
            <p className="mt-2">
              Average weight:{" "}
              {details?.averageWeight == null ? "No weigh-ins" : `${details.averageWeight} kg`}.
              Full-plan days: {details?.consistentDays ?? 0}.
            </p>
            <Link
              to="/progress-details"
              search={{ section: "weight" }}
              className="mt-3 inline-flex min-h-11 items-center font-bold text-primary underline"
            >
              Explore progress details
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card, SectionTitle } from "@/components/kit";
import { useAppData } from "@/features/app-data";
import { BodyForms } from "@/features/body-forms";
import { TargetExplanation } from "@/features/target-explanation";
import { ArrowUpRight, Circle, Flame } from "lucide-react";
import { Mascot } from "@/components/mascot";
import { ChiuliIcon } from "@/components/brand";
import { StreakMascot } from "@/features/mascot-feedback";
export const Route = createFileRoute("/progress")({
  head: () => ({ meta: [{ title: "Progress — Chiuli" }] }),
  component: Progress,
});
function Progress() {
  const { data } = useAppData();
  const [weightOpen, setWeightOpen] = useState(false);
  return (
    <AppShell
      title="Your journey"
      subtitle="One intentional action keeps your logging streak going"
    >
      <div className="grid gap-4">
        <Card>
          <StreakMascot progress />
          <p className="flex items-center gap-2 text-2xl font-extrabold">
            <Flame className="h-7 w-7 shrink-0 text-primary" aria-hidden="true" />
            {data.streak.current} day logging streak
          </p>
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
            className="press mt-3 min-h-12 rounded-xl border-2 border-b-4 border-primary-shadow bg-primary px-4 font-extrabold text-white"
            onClick={() => setWeightOpen(true)}
          >
            Log weight
          </button>
        </Card>
        <Link
          to="/journey"
          className="press flex min-h-36 items-center gap-4 rounded-3xl border-2 border-b-4 border-primary bg-primary-soft p-5"
        >
          <ChiuliIcon className="h-20 w-20" />
          <div className="flex-1">
            <p className="text-xs font-extrabold uppercase tracking-widest text-primary-shadow">
              Your next chapter
            </p>
            <h2 className="mt-1 text-xl font-black">Explore your journey</h2>
            <p className="mt-1 text-sm font-bold text-muted-foreground">
              Your weeks, landmarks and logged progress. A whole screen to see how far you’ve come.
            </p>
          </div>
          <ArrowUpRight className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
        </Link>
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
                className={`inline-flex items-center gap-2 rounded-full border-2 px-3 py-2 font-bold ${data.streak.longest >= n ? "border-success bg-success-soft" : "border-border"}`}
                key={n}
              >
                {data.streak.longest >= n ? (
                  <Mascot
                    expression={n >= 14 ? "happy" : "confident"}
                    variant="face"
                    className="h-6 w-6"
                  />
                ) : (
                  <Circle className="h-4 w-4" aria-hidden="true" />
                )}{" "}
                {n} day streak
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

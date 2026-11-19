import { BottomSheet } from "@/components/bottom-sheet";
import { ReviewPanel } from "@/features/review-panel";
import { Scale, Dumbbell, Ruler, Camera } from "lucide-react";
import { InfoCard } from "@/components/bottom-sheet";
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
  head: () => ({
    meta: [
      {
        title: "Progress — Chiuli",
      },
    ],
  }),
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
          <InfoCard title={<>What keeps my streak?</>}>
            <p>
              Log food, weight, a set, water, recovery, measurements or a photo. Opening the app
              alone does not count.
            </p>
          </InfoCard>
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
        <nav aria-label="Progress sections" className="grid auto-rows-fr grid-cols-2 gap-3">
          {[
            {
              label: "Weight",
              icon: Scale,
              fill: "#FFF6E8",
              border: "#FFD699",
              lip: "#F5B963",
              badge: "#FF9600",
            },
            {
              label: "Strength",
              icon: Dumbbell,
              fill: "#FFF9EB",
              border: "#FFE099",
              lip: "#F2C661",
              badge: "#DD7100",
            },
            {
              label: "Measurements",
              icon: Ruler,
              fill: "#FAF3EC",
              border: "#E3CBB5",
              lip: "#CCA98B",
              badge: "#60351F",
            },
            {
              label: "Photos",
              icon: Camera,
              fill: "#FFF4EC",
              border: "#FFCCB0",
              lip: "#F0A882",
              badge: "#E66A00",
            },
          ].map((t) => (
            <Link
              key={t.label}
              to="/progress-details"
              search={{ section: t.label.toLowerCase() }}
              aria-label={t.label}
              title={t.label}
              className="press flex min-h-[76px] min-w-0 items-center gap-2 rounded-2xl border-2 border-b-[3px] px-3 py-3 text-[#25201F]"
              style={{ background: t.fill, borderColor: t.border, borderBottomColor: t.lip }}
            >
              <span
                className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl text-white"
                style={{ background: t.badge }}
              >
                <t.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 truncate text-xs font-extrabold sm:text-sm">{t.label}</span>
            </Link>
          ))}
        </nav>
        <ReviewPanel />
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

        <BottomSheet title="Log weight" open={weightOpen} onOpenChange={setWeightOpen}>
          <BodyForms />
        </BottomSheet>
      </div>
    </AppShell>
  );
}

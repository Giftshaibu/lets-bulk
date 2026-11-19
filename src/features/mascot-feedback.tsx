import { useContext, useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { BottomSheet } from "@/components/bottom-sheet";
import { useSharedMascot } from "./use-shared-mascot";
import { X } from "lucide-react";
import { Mascot } from "@/components/mascot";
import {
  defaultMascot,
  highestMascot,
  streakMascot,
  workoutMascot,
  type MascotState,
} from "@/lib/domain/mascot";
import { MascotContext, useMascotContribution } from "./mascot-context";
import { useAppData } from "./app-data";
import { XpSummary } from "./quest-ui";

export function MascotFeedback({
  state,
  compact = false,
  announce = false,
  contribute = true,
  label = "Chiuli encouragement",
  hero = false,
}: {
  state: MascotState;
  compact?: boolean;
  announce?: boolean;
  contribute?: boolean;
  label?: string;
  hero?: boolean;
}) {
  useMascotContribution(state, contribute);
  return (
    <div
      className="my-3 flex min-w-0 items-center gap-3 rounded-2xl bg-primary-soft/50 p-3"
      role={announce ? "status" : "region"}
      aria-label={label}
    >
      <Mascot
        expression={state.expression}
        interactive
        hero={hero}
        variant={compact ? "face" : "pose"}
        className={compact ? "h-10 w-10" : "h-20 w-20 sm:h-24 sm:w-24"}
      />
      <p className="min-w-0 text-sm font-bold text-ink-soft">{state.message}</p>
    </div>
  );
}

export function MascotStatus() {
  const state = useSharedMascot();
  return (
    <BottomSheet
      title="Chiuli is with you"
      trigger={
        <button
          type="button"
          aria-label="Chiuli status"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Mascot expression={state.expression} variant="face" className="h-10 w-10" />
        </button>
      }
    >
      <Mascot expression={state.expression} className="mx-auto my-3 h-32 w-32" />
      <p className="text-center font-bold">{state.message}</p>
      <XpSummary />
      <p className="mt-3 text-sm">
        One intentional action keeps your logging story moving. Rest and recovery count too.
      </p>
    </BottomSheet>
  );
}

export function StreakMascot({ progress = false }: { progress?: boolean }) {
  const { data } = useAppData();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const visible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const timer = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
  return (
    <MascotFeedback
      state={(() => {
        const state = streakMascot(data.loggingDates, now, data.rawProfile?.timezone);
        return progress && state.expression === "confident" && data.streak.current >= 7
          ? { ...state, expression: "happy", priority: 30 }
          : state;
      })()}
      label="Logging streak encouragement"
    />
  );
}

export function WorkoutMascot() {
  const { data, operation } = useAppData();
  const own = operation?.path.startsWith("/api/workout") || operation?.path.startsWith("/api/sets");
  const state: MascotState =
    own && operation?.status === "saving"
      ? { expression: "thinking", message: "Saving your workout…", priority: 60 }
      : own && operation?.status === "error"
        ? {
            expression: "shocked",
            message: "Your workout couldn’t be saved. Please try again.",
            priority: 50,
          }
        : workoutMascot(data.session?.status, data.workout.exercises.length > 0);
  return <MascotFeedback state={state} label="Workout encouragement" hero />;
}

import { useContext, useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import * as Dialog from "@radix-ui/react-dialog";
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
  const registry = useContext(MascotContext),
    path = useLocation({ select: (l) => l.pathname });
  const state = highestMascot(
    Object.values(registry?.entries ?? {}).filter((e) => e.path === path),
  );
  return (
    <Dialog.Root>
      <Dialog.Trigger
        aria-label="Chiuli status"
        title="Chiuli status"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Mascot expression={state.expression} variant="face" className="h-9 w-9" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          aria-describedby="chiuli-status-description"
          className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border-2 border-border bg-card p-5 text-center"
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-xl font-black">Chiuli is with you</Dialog.Title>
            <Dialog.Close
              aria-label="Close Chiuli status"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-border"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <Mascot expression={state.expression} className="mx-auto my-4 h-40 w-40" />
          <p id="chiuli-status-description" className="font-bold">
            {state.message || defaultMascot.message}
          </p>
          <XpSummary />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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

import { useContext, useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { MascotContext } from "./mascot-context";
import { useAppData } from "./app-data";
import { highestMascot, mascot, mascotLocalTime, streakMascot } from "@/lib/domain/mascot";
export function useSharedMascot() {
  const { data, operation } = useAppData(),
    registry = useContext(MascotContext),
    path = useLocation({ select: (l) => l.pathname });
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const t = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const local = mascotLocalTime(now, data.rawProfile?.timezone),
    logged = data.loggingDates.includes(local.date);
  let state = streakMascot(data.loggingDates, now, data.rawProfile?.timezone);
  if (state.expression !== "sad") {
    if (
      local.hour >= 20 &&
      local.date === data.date &&
      (!data.todayWeight.logged || data.eaten.kcal === 0)
    )
      state = mascot(
        "shocked",
        "It’s after 8 PM. Your weight or food still needs a log today.",
        40,
      );
    else {
      const current = data.weight.series.find((w) => w.date === local.date),
        prior = data.weight.series.filter((w) => w.date < local.date).at(-1);
      if (
        (data.completion.dayCompleted && local.date === data.date) ||
        (current && prior && current.kg > prior.kg)
      )
        state = mascot("happy", "Today’s progress is logged. Keep building your story.", 30);
      else if (logged || data.streak.current > 0)
        state = mascot("confident", "One intentional action at a time. You’ve got this.", 1);
    }
  }
  const contributions = Object.values(registry?.entries ?? {}).filter(
    (e) => e.path === path && e.priority >= 50,
  );
  if (operation?.status === "saving")
    contributions.push({ ...mascot("thinking", "Saving your action…", 60), path });
  return highestMascot([state, ...contributions]);
}

import { Mascot } from "@/components/mascot";
import { Bar } from "@/components/kit";
import { useAppData } from "./app-data";
import { nutritionMascot } from "@/lib/domain/mascot";

export function XpSummary() {
  const { data } = useAppData();
  return (
    <p className="my-2 text-sm font-extrabold text-primary" aria-label="XP summary">
      {data.rewards
        ? `${data.rewards.totalXp.toLocaleString()} XP total · +${data.rewards.todayXp} today`
        : "XP is syncing. Your logs are safe."}
    </p>
  );
}
export function NutritionMascot() {
  const { data } = useAppData();
  return (
    <Mascot
      expression={nutritionMascot(data.eaten.kcal, data.targets.kcal)}
      variant="face"
      className="h-11 w-11"
      interactive
    />
  );
}
export function MacroTiles({ remaining = false }: { remaining?: boolean }) {
  const { data } = useAppData();
  return (
    <div
      className="mt-4 grid grid-cols-3 items-stretch gap-2 sm:gap-3"
      aria-label="Nutrition macros"
    >
      {(
        [
          ["Protein", "protein", "success"],
          ["Carbs", "carbs", "info"],
          ["Fat", "fat", "reward"],
        ] as const
      ).map(([label, key, tone]) => (
        <div
          key={key}
          className="flex min-w-0 flex-col justify-between rounded-xl bg-muted/60 p-2 sm:p-3"
        >
          <div>
            <p className="break-words text-lg font-black">
              {Math.round(remaining ? data.remaining[key] : data.eaten[key])}
              <span className="text-xs">g</span>
            </p>
            <p className="mt-1 break-words text-[10px] font-extrabold tracking-wide uppercase">
              {label}
            </p>
            <p className="mb-2 break-words text-[10px] font-bold text-muted-foreground">
              {remaining ? "left" : "of"} {Math.round(data.targets[key])}g
            </p>
          </div>
          <Bar value={data.eaten[key]} max={data.targets[key]} tone={tone} className="h-2" />
        </div>
      ))}
    </div>
  );
}

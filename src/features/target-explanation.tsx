import { useAppData } from "./app-data";
export function TargetExplanation() {
  const { data } = useAppData();
  const p = data.rawProfile;
  const reason = data.targetReason;
  const weeks = p?.target_date
    ? Math.max(1, (Date.parse(p.target_date) - Date.parse(p.start_date)) / 604800000)
    : null;
  const remainingWeeks = p?.target_date
    ? (Date.parse(p.target_date) - Date.parse(data.date)) / 604800000
    : null;
  return (
    <details className="mt-3 rounded-xl border-2 border-border p-3">
      <summary className="min-h-11 cursor-pointer break-words font-bold">
        Bulk target: {data.targets.kcal.toLocaleString()} kcal · {data.targets.protein}g protein
        fuel
      </summary>
      <p>
        {reason ?? "Your saved starting targets"}. Current daily targets: {data.targets.kcal} kcal
        and {data.targets.protein} g protein.
      </p>
      <p className="mt-2">
        Calories provide energy to train and gain gradually; protein supports muscle repair.
        Consistent logs and weekly weight averages help us suggest a small change when there is
        enough evidence. You choose whether to apply it.
      </p>
      {p?.target_date && weeks && (
        <p className="mt-2">
          Goal: {p.goal_weight_kg} kg by {p.target_date}. The original timeline implies{" "}
          {((p.goal_weight_kg - p.starting_weight_kg) / weeks).toFixed(2)} kg per week.{" "}
          {remainingWeeks !== null && remainingWeeks > 0
            ? `${Math.ceil(remainingWeeks)} weeks remain.`
            : "The target date has passed; you can choose a new date in Settings."}{" "}
          We never force catch-up calories to meet a date.
        </p>
      )}
    </details>
  );
}

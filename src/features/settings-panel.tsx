import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, ChunkyButton, SectionTitle } from "@/components/kit";
import { useAppData, api } from "./app-data";
import { inputClass, NumberField } from "./setup";
import { browserDb } from "@/lib/db/client";
import type {
  budgetSuggestions,
  budgetSummary,
  substitutions,
} from "@/lib/services/review.service";
const num = (f: FormData, key: string) => Number(f.get(key));
export function SettingsPanel() {
  const { data, act, pending } = useAppData();
  return (
    <Card className="mt-5">
      <details>
        <summary className="min-h-11 cursor-pointer font-bold">Settings & gym equipment</summary>
        <form
          className="mt-3 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void act("/api/settings", {
              first_name: String(f.get("name")),
              water_target_ml: num(f, "water"),
              diet_type: String(f.get("diet")),
              budget_mode: String(f.get("budget")),
              days: [0, 1, 2, 3].map((i) => num(f, `day-${i}`)),
            });
          }}
        >
          <label>
            Name
            <input name="name" className={inputClass} defaultValue={data.profile.name} required />
          </label>
          <NumberField
            name="water"
            label="Daily water target (ml)"
            value={data.rawProfile?.water_target_ml ?? 2500}
            min={500}
            max={10000}
            step="1"
          />
          <label>
            Diet
            <select
              name="diet"
              className={inputClass}
              defaultValue={data.preferences?.diet_type ?? "omnivore"}
            >
              <option>omnivore</option>
              <option>vegetarian</option>
              <option>vegan</option>
            </select>
          </label>
          <label>
            Budget preference
            <select
              name="budget"
              className={inputClass}
              defaultValue={data.preferences?.budget_mode ?? "balanced"}
            >
              <option>balanced</option>
              <option>budget</option>
            </select>
          </label>
          <p className="text-sm font-bold">Four training days (each must be different)</p>
          <div className="grid grid-cols-2 gap-3">
            {["Upper A", "Lower A", "Upper B", "Lower B"].map((label, i) => (
              <label key={label}>
                {label}
                <select
                  className={inputClass}
                  name={`day-${i}`}
                  defaultValue={data.trainingDays[i] ?? [1, 2, 4, 5][i]}
                >
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, n) => (
                    <option key={d} value={n}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <ChunkyButton disabled={pending}>Save settings</ChunkyButton>
        </form>
        <LoadOptions />
      </details>
    </Card>
  );
}
export function LoadOptions() {
  const { data, act, pending } = useAppData();
  return (
    <details className="mt-3">
      <summary className="min-h-11 cursor-pointer font-bold">Usable gym loads</summary>
      <p className="text-sm">
        Enter actual increments, minimum and maximum loads. Progression waits until these are known.
      </p>
      <form
        className="mt-3 grid grid-cols-2 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void act("/api/load-options", {
            equipment_type: String(f.get("equipment")),
            increment_kg: num(f, "increment"),
            minimum_kg: num(f, "min"),
            maximum_kg: num(f, "max"),
          });
        }}
      >
        <label className="col-span-2">
          Equipment
          <select className={inputClass} name="equipment">
            {data.equipment.map((e) => (
              <option key={e.id}>{e.equipment_type}</option>
            ))}
          </select>
        </label>
        <NumberField name="increment" label="Increment (kg)" min={0.1} />
        <NumberField name="min" label="Minimum (kg)" />
        <NumberField name="max" label="Maximum (kg)" min={1} />
        <ChunkyButton disabled={pending}>Save loads</ChunkyButton>
      </form>
      {data.loadOptions.map((o) => (
        <p className="mt-2 text-sm" key={o.id}>
          {o.equipment_type}: {o.minimum_kg}–{o.maximum_kg} kg in {o.increment_kg} kg steps
        </p>
      ))}
    </details>
  );
}

export function InitialLoads() {
  const { data, act, pending } = useAppData();
  if (data.session || !data.workout.exercises.length) return null;
  return (
    <details className="mt-3">
      <summary className="min-h-11 font-bold">Set initial working loads</summary>
      <p className="text-sm">
        Confirm your starting loads before your first session. Bodyweight exercises use 0 kg added
        load. Later changes are reviewed as recommendations.
      </p>
      {data.plannedExercises.map((p) => (
        <form
          key={p.id}
          className="my-3 flex items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void act("/api/training/initial-load", {
              id: p.id,
              weight: num(new FormData(e.currentTarget), "weight"),
            });
          }}
        >
          <NumberField
            name="weight"
            label={`${data.workout.exercises.find((e) => e.id === p.exercise_id)?.name} (kg)`}
            value={p.planned_weight_kg}
            max={1000}
          />
          <ChunkyButton size="sm" disabled={pending}>
            Save
          </ChunkyButton>
        </form>
      ))}
    </details>
  );
}

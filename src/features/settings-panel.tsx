import { useState } from "react";
import { equipmentChoices, equipmentLabels } from "@/lib/domain/equipment";
import { Card, ChunkyButton } from "@/components/kit";
import { useAppData } from "./app-data";
import { inputClass, NumberField } from "./setup";
const num = (f: FormData, key: string) => Number(f.get(key));
const equipment = equipmentChoices.filter((e) => e !== "bodyweight");
export function SettingsPanel() {
  const { data, act, pending } = useAppData();
  const [days, setDays] = useState(data.trainingDays);
  const labels = {
    weight: "Weight log",
    nutrition: "Nutrition target",
    workout: "Scheduled workout",
    recovery: "Recovery log",
    water: "Water target",
  };
  return (
    <Card className="mt-5">
      <section aria-label="Settings and gym equipment">
        <form
          className="mt-3 grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void act("/api/settings", {
              first_name: String(f.get("name")),
              height_cm: num(f, "height_cm"),
              goal_weight_kg: num(f, "goal_weight_kg"),
              target_date: String(f.get("target_date")) || null,
              training_experience: String(f.get("experience")),
              water_target_ml: num(f, "water"),
              diet_type: String(f.get("diet")),
              budget_mode: String(f.get("budget")),
              days,
              equipment: ["bodyweight", ...f.getAll("equipment")],
              completion_policy: Object.fromEntries(
                Object.keys(labels).map((k) => [k, f.get(`require-${k}`) === "on"]),
              ),
            });
          }}
        >
          <label className="font-bold">
            Name
            <input
              name="name"
              className={inputClass}
              defaultValue={data.profile.name}
              required
              maxLength={80}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              name="height_cm"
              label="Height (cm)"
              value={data.rawProfile?.height_cm ?? 175}
              min={50}
              max={260}
            />
            <NumberField
              name="goal_weight_kg"
              label="Goal weight (kg)"
              value={data.profile.goalWeightKg}
              min={20}
              max={500}
            />
          </div>
          <label className="font-bold">
            Optional target date
            <input
              className={inputClass}
              name="target_date"
              type="date"
              defaultValue={data.rawProfile?.target_date ?? ""}
            />
          </label>
          <p className="text-sm">
            The date is a reference point. It will not force a faster rate of weight gain.
          </p>
          <label className="font-bold">
            Training experience
            <select
              name="experience"
              className={inputClass}
              defaultValue={data.rawProfile?.training_experience ?? "beginner"}
            >
              <option>beginner</option>
              <option>intermediate</option>
              <option>advanced</option>
            </select>
          </label>
          <NumberField
            name="water"
            label="Daily water target (ml)"
            value={data.rawProfile?.water_target_ml ?? 2500}
            min={500}
            max={10000}
            step="1"
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="font-bold">
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
            <label className="font-bold">
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
          </div>
          <fieldset>
            <legend className="font-bold">Training days ({days.length} per week)</legend>
            <p className="text-sm">
              Choose one to seven days. Changing the schedule creates a new version and keeps
              previous workouts intact.
            </p>
            <div className="flex flex-wrap gap-x-4">
              {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                <label key={day} className="inline-flex min-h-11 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={days.includes(day)}
                    onChange={(e) =>
                      setDays((previous) =>
                        [1, 2, 3, 4, 5, 6, 0].filter((d) =>
                          d === day ? e.target.checked : previous.includes(d),
                        ),
                      )
                    }
                  />
                  {
                    ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
                      day
                    ]
                  }
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="font-bold">Available equipment</legend>
            <p className="text-sm">
              Bodyweight is included. After removing equipment, review replacements on Train before
              starting an affected workout.
            </p>
            <div className="flex flex-wrap gap-x-4">
              {equipment.map((kind) => (
                <label key={kind} className="inline-flex min-h-11 items-center gap-2">
                  <input
                    name="equipment"
                    type="checkbox"
                    value={kind}
                    defaultChecked={data.equipment.some(
                      (e) => e.equipment_type === kind && e.is_available,
                    )}
                  />
                  {equipmentLabels[kind]}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="font-bold">Required for a completed day</legend>
            <p className="text-sm">
              Keep at least one daily logging requirement. A workout is required only on scheduled
              training days.
            </p>
            <div className="grid grid-cols-2 gap-x-3">
              {(Object.keys(labels) as (keyof typeof labels)[]).map((k) => (
                <label key={k} className="inline-flex min-h-11 items-center gap-2">
                  <input
                    name={`require-${k}`}
                    type="checkbox"
                    defaultChecked={data.completionPolicy[k]}
                  />
                  {labels[k]}
                </label>
              ))}
            </div>
          </fieldset>
          <ChunkyButton disabled={pending || !days.length}>Save settings</ChunkyButton>
        </form>
        <LoadOptions />
      </section>
    </Card>
  );
}
export function LoadOptions() {
  const { data, act, pending } = useAppData();
  const [selectedEquipment, setSelectedEquipment] = useState(
    data.equipment.find((e) => e.is_available)?.equipment_type ?? "bodyweight",
  );
  return (
    <details className="mt-3">
      <summary className="min-h-11 cursor-pointer font-bold">Usable gym loads</summary>
      <p className="text-sm">
        Record the loads you can actually use. An exercise-specific entry overrides general
        equipment entries.
      </p>
      <form
        className="mt-3 grid grid-cols-2 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void act("/api/load-options", {
            equipment_type: String(f.get("equipment")),
            exercise_id: String(f.get("exercise")) || null,
            increment_kg: num(f, "increment"),
            minimum_kg: num(f, "min"),
            maximum_kg: num(f, "max"),
          });
        }}
      >
        <label className="col-span-2 font-bold">
          Equipment
          <select
            className={inputClass}
            name="equipment"
            value={selectedEquipment}
            onChange={(e) => setSelectedEquipment(e.target.value)}
          >
            {data.equipment
              .filter((e) => e.is_available)
              .map((e) => (
                <option key={e.id}>{e.equipment_type}</option>
              ))}
          </select>
        </label>
        <label className="col-span-2 font-bold">
          Apply to exercise
          <select
            className={inputClass}
            name="exercise"
            onChange={(e) => {
              const exercise = data.exerciseLibrary.find((ex) => ex.id === e.target.value);
              if (exercise) setSelectedEquipment(exercise.equipment);
            }}
          >
            <option value="">All exercises using this equipment</option>
            {data.exerciseLibrary
              .filter((e) =>
                data.equipment.some((a) => a.is_available && a.equipment_type === e.equipment),
              )
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
          </select>
        </label>
        <NumberField name="increment" label="Increment (kg)" min={0.1} />
        <NumberField name="min" label="Minimum (kg)" />
        <NumberField name="max" label="Maximum (kg)" min={1} />
        <ChunkyButton disabled={pending}>Save loads</ChunkyButton>
      </form>
      {data.loadOptions.map((o) => (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm" key={o.id}>
          <p>
            {o.exercise_id
              ? data.exerciseLibrary.find((e) => e.id === o.exercise_id)?.name
              : o.equipment_type}
            : {o.minimum_kg}–{o.maximum_kg} kg in {o.increment_kg} kg steps
          </p>
          <button
            disabled={pending}
            className="min-h-11 font-bold underline"
            onClick={() => void act(`/api/load-options/${o.id}`, undefined, "DELETE")}
          >
            Remove load option
          </button>
        </div>
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

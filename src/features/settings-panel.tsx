import { ChoiceField } from "@/components/selection-screen";
import { BottomSheet } from "@/components/bottom-sheet";
import { NumberStepper, DateStepper } from "@/components/stepper";
import { Mascot } from "@/components/mascot";
import { PushSettings } from "./push-settings";
import { Target, User, SlidersHorizontal, Check } from "lucide-react";
import {
  units,
  massFromKg,
  massToKg,
  volumeFromMl,
  volumeToMl,
  manualTargets,
  massLabel,
  type MassUnit,
  type VolumeUnit,
} from "@/lib/domain/units";
import { addDays } from "@/lib/domain/dates";
import { InfoCard } from "@/components/bottom-sheet";
import { useEffect, useState } from "react";
import { equipmentChoices, equipmentLabels } from "@/lib/domain/equipment";
import { Card, ChunkyButton } from "@/components/kit";
import { useAppData } from "./app-data";
import { inputClass, NumberField } from "./setup";
const num = (f: FormData, key: string) => Number(f.get(key));
const equipment = equipmentChoices.filter((e) => e !== "bodyweight");
export function SettingsPanel() {
  const { data, act, pending } = useAppData();
  const preferred = units(data.preferences);
  const stored = data.preferences as typeof data.preferences & {
    morning_reminder?: boolean;
    evening_reminder?: boolean;
    morning_time?: string;
  };
  const [days, setDays] = useState(data.trainingDays),
    [mass, setMass] = useState<MassUnit>(preferred.mass),
    [volume, setVolume] = useState<VolumeUnit>(preferred.volume),
    [goal, setGoal] = useState(data.profile.goalWeightKg),
    [water, setWater] = useState(data.rawProfile?.water_target_ml ?? 2500),
    [targetDate, setTargetDate] = useState(data.rawProfile?.target_date ?? ""),
    [kcal, setKcal] = useState(data.targets.kcal),
    [protein, setProtein] = useState(data.targets.protein),
    [morning, setMorning] = useState(stored?.morning_reminder ?? false),
    [evening, setEvening] = useState(stored?.evening_reminder ?? false),
    [time, setTime] = useState(stored?.morning_time?.slice(0, 5) ?? "07:00");
  const [baseTarget, setBaseTarget] = useState(data.activeTarget),
    [confirm, setConfirm] = useState<Record<string, unknown> | null>(null),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    if (saved) setBaseTarget(data.activeTarget);
  }, [saved, data.activeTarget]);
  let preview: ReturnType<typeof manualTargets> | null = null,
    error = "";
  try {
    if (baseTarget) preview = manualTargets(baseTarget, kcal, protein);
  } catch (e) {
    error = e instanceof Error ? e.message : "Invalid targets";
  }
  const labels = {
    weight: "Weight log",
    nutrition: "Nutrition target",
    workout: "Scheduled workout",
    recovery: "Recovery log",
    water: "Water target",
  };
  async function save(value: Record<string, unknown>) {
    if (await act("/api/settings", value)) {
      setConfirm(null);
      setSaved(true);
    }
  }
  return (
    <>
      <Card>
        <div className="flex items-center gap-3">
          <Mascot expression={saved ? "happy" : "confident"} className="h-24 w-24" interactive />
          <div>
            <h2 className="text-xl font-black">Make Chiuli yours</h2>
            <p className="mt-1 text-sm font-bold">
              Tune your targets, reminders and training preferences.
            </p>
          </div>
        </div>
        {saved && (
          <p role="status" className="mt-3 font-bold">
            Settings saved.
          </p>
        )}
      </Card>
      <form
        className="mt-4 grid gap-4"
        onChange={() => setSaved(false)}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const value: Record<string, unknown> = {
            first_name: String(f.get("name")),
            height_cm: num(f, "height_cm"),
            goal_weight_kg: goal,
            target_date: targetDate || null,
            training_experience: String(f.get("experience")),
            water_target_ml: water,
            diet_type: String(f.get("diet")),
            budget_mode: String(f.get("budget")),
            days,
            equipment: ["bodyweight", ...f.getAll("equipment")],
            completion_policy: Object.fromEntries(
              Object.keys(labels).map((k) => [k, f.get(`require-${k}`) === "on"]),
            ),
            mass_unit: mass,
            volume_unit: volume,
            reminders: { morningEnabled: morning, eveningEnabled: evening, morningTime: time },
          };
          if (
            baseTarget &&
            (kcal !== baseTarget.calories_target || protein !== baseTarget.protein_target_g)
          ) {
            value["nutrition_targets"] = { sourceTargetId: baseTarget.id, kcal, protein };
            setConfirm(value);
          } else void save(value);
        }}
      >
        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black">
            <User className="h-5 w-5 text-primary" />
            Profile & goals
          </h2>
          <div className="grid gap-4">
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
            <NumberField
              name="height_cm"
              label="Height (cm)"
              value={data.rawProfile?.height_cm ?? 175}
              min={50}
              max={260}
            />
            <NumberStepper
              label="Goal weight"
              value={massFromKg(goal, mass)}
              onChange={(n) => {
                setGoal(massToKg(n, mass));
                setSaved(false);
              }}
              step={0.1}
              min={massFromKg(20, mass)}
              max={massFromKg(500, mass)}
              suffix={mass}
              disabled={pending}
            />
            {targetDate ? (
              <>
                <DateStepper
                  label="Reference date"
                  future
                  value={targetDate}
                  onChange={setTargetDate}
                  today={data.date}
                />
                <button
                  type="button"
                  className="min-h-11 text-left font-bold text-primary"
                  onClick={() => setTargetDate("")}
                >
                  Remove reference date
                </button>
              </>
            ) : (
              <button
                type="button"
                className="min-h-11 rounded-xl border-2 border-border font-bold"
                onClick={() => setTargetDate(addDays(data.date, 90))}
              >
                Add optional reference date
              </button>
            )}
            <p className="text-xs">
              This date is a reference point. It never forces catch-up calories.
            </p>
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black">
            <Target className="h-5 w-5 text-primary" />
            Bulk & nutrition targets
          </h2>
          <div className="grid gap-4">
            <NumberStepper
              label="Daily calories"
              value={kcal}
              onChange={(n) => {
                setKcal(n);
                setSaved(false);
              }}
              step={50}
              min={500}
              max={10000}
              suffix="kcal"
              disabled={pending}
            />
            <NumberStepper
              label="Daily protein"
              value={protein}
              onChange={(n) => {
                setProtein(n);
                setSaved(false);
              }}
              step={5}
              min={1}
              max={500}
              suffix="g"
              disabled={pending}
            />
            <NumberStepper
              label="Daily water target"
              value={volumeFromMl(water, volume)}
              onChange={(n) => {
                setWater(volumeToMl(n, volume));
                setSaved(false);
              }}
              step={volume === "ml" ? 250 : 8}
              min={volumeFromMl(500, volume)}
              max={volumeFromMl(10000, volume)}
              suffix={volume === "ml" ? "ml" : "US fl oz"}
              disabled={pending}
            />
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : (
              preview && (
                <p className="text-sm">
                  Preview: {preview.carbs}g carbs · {preview.fat}g fat. Target edits require
                  confirmation.
                </p>
              )
            )}
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            Units & preferences
          </h2>
          <fieldset>
            <legend className="mb-2 font-bold">Weight unit</legend>
            <div className="flex gap-3">
              {(["kg", "lb"] as const).map((u) => (
                <button
                  type="button"
                  key={u}
                  aria-pressed={mass === u}
                  className={`press min-h-11 flex-1 rounded-xl border-2 border-b-4 font-bold ${mass === u ? "border-primary-shadow bg-primary text-white" : "border-border bg-card"}`}
                  onClick={() => {
                    setMass(u);
                    setSaved(false);
                  }}
                >
                  {u}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="mt-4">
            <legend className="mb-2 font-bold">Liquid unit</legend>
            <div className="flex gap-3">
              {(["ml", "fl_oz"] as const).map((u) => (
                <button
                  type="button"
                  key={u}
                  aria-pressed={volume === u}
                  className={`press min-h-11 flex-1 rounded-xl border-2 border-b-4 font-bold ${volume === u ? "border-primary-shadow bg-primary text-white" : "border-border bg-card"}`}
                  onClick={() => {
                    setVolume(u);
                    setSaved(false);
                  }}
                >
                  {u === "ml" ? "ml" : "US fl oz"}
                </button>
              ))}
            </div>
          </fieldset>
          <p className="mt-3 text-xs">
            Units change the display, not your saved measurements. Food and protein stay in grams;
            height and body measurements stay in centimetres.
          </p>
        </Card>
        <PushSettings
          morning={morning}
          setMorning={setMorning}
          evening={evening}
          setEvening={setEvening}
          time={time}
          setTime={setTime}
        />
        <Card>
          <h2 className="mb-3 text-lg font-black">Training & food preferences</h2>
          <div className="grid gap-4">
            <label className="font-bold">
              Training experience
              <ChoiceField
                name="experience"
                className={inputClass}
                defaultValue={data.rawProfile?.training_experience ?? "beginner"}
              >
                {["beginner", "intermediate", "advanced"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </ChoiceField>
            </label>
            <label className="font-bold">
              Diet
              <ChoiceField
                name="diet"
                className={inputClass}
                defaultValue={data.preferences?.diet_type ?? "omnivore"}
              >
                {["omnivore", "vegetarian", "vegan"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </ChoiceField>
            </label>
            <label className="font-bold">
              Budget preference
              <ChoiceField
                name="budget"
                className={inputClass}
                defaultValue={data.preferences?.budget_mode ?? "balanced"}
              >
                {["balanced", "budget"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </ChoiceField>
            </label>
            <fieldset>
              <legend className="font-bold">Training days ({days.length} per week)</legend>
              <div className="flex flex-wrap gap-3">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <label key={d} className="flex min-h-11 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={days.includes(d)}
                      onChange={(e) =>
                        setDays((previous) =>
                          [1, 2, 3, 4, 5, 6, 0].filter((v) =>
                            v === d ? e.target.checked : previous.includes(v),
                          ),
                        )
                      }
                    />
                    {
                      [
                        "Sunday",
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                      ][d]
                    }
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="font-bold">Available equipment</legend>
              <p className="text-xs">
                Bodyweight is included. Review replacements after removing equipment.
              </p>
              <div className="flex flex-wrap gap-3">
                {equipment.map((kind) => (
                  <label key={kind} className="flex min-h-11 items-center gap-2">
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
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-black">Daily quests</h2>
          <p className="mb-3 text-xs">
            Choose at least one daily logging requirement. Training is only required on scheduled
            days.
          </p>
          <div className="grid gap-2">
            {(Object.keys(labels) as (keyof typeof labels)[]).map((k) => (
              <label key={k} className="flex min-h-11 items-center justify-between gap-3">
                <span>{labels[k]}</span>
                <input
                  name={`require-${k}`}
                  type="checkbox"
                  defaultChecked={data.completionPolicy[k]}
                />
              </label>
            ))}
          </div>
        </Card>
        <ChunkyButton disabled={pending || !days.length || !!error} full>
          <Check className="h-5 w-5" />
          Save settings
        </ChunkyButton>
      </form>
      <LoadOptions />
      <BottomSheet
        title="Confirm new nutrition targets"
        open={confirm !== null}
        onOpenChange={(o) => {
          if (!o) setConfirm(null);
        }}
      >
        <p className="font-bold">Apply a new target version from today?</p>
        {preview && (
          <ul className="my-4 space-y-2">
            <li>
              {data.targets.kcal} → {preview.kcal} kcal
            </li>
            <li>
              {data.targets.protein} → {preview.protein}g protein
            </li>
            <li>
              {preview.carbs}g carbs · {preview.fat}g fat (fat unchanged)
            </li>
          </ul>
        )}
        <p className="mb-4 text-sm">
          Earlier history is kept. Older nutrition proposals may need a fresh check-in.
        </p>
        <ChunkyButton
          full
          disabled={pending || !confirm}
          onClick={() => {
            if (confirm) void save(confirm);
          }}
        >
          Confirm and save
        </ChunkyButton>
      </BottomSheet>
    </>
  );
}
export function LoadOptions() {
  const { data, act, pending } = useAppData();
  const mass = units(data.preferences).mass;
  const [selectedEquipment, setSelectedEquipment] = useState(
    data.equipment.find((e) => e.is_available)?.equipment_type ?? "bodyweight",
  );
  return (
    <InfoCard title={<>Usable gym loads</>}>
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
            increment_kg: massToKg(num(f, "increment"), mass),
            minimum_kg: massToKg(num(f, "min"), mass),
            maximum_kg: massToKg(num(f, "max"), mass),
          });
        }}
      >
        <label className="col-span-2 font-bold">
          Equipment
          <ChoiceField
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
          </ChoiceField>
        </label>
        <label className="col-span-2 font-bold">
          Apply to exercise
          <ChoiceField
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
          </ChoiceField>
        </label>
        <NumberField name="increment" label={`Increment (${mass})`} min={0.1} />
        <NumberField name="min" label={`Minimum (${mass})`} />
        <NumberField name="max" label={`Maximum (${mass})`} min={1} />
        <ChunkyButton disabled={pending}>Save loads</ChunkyButton>
      </form>
      {data.loadOptions.map((o) => (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm" key={o.id}>
          <p>
            {o.exercise_id
              ? data.exerciseLibrary.find((e) => e.id === o.exercise_id)?.name
              : o.equipment_type}
            : {massLabel(o.minimum_kg, mass)}–{massLabel(o.maximum_kg, mass)} in{" "}
            {massLabel(o.increment_kg, mass)} steps
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
    </InfoCard>
  );
}
export function InitialLoads() {
  const { data, act, pending } = useAppData();
  const mass = units(data.preferences).mass;
  if (data.session || !data.workout.exercises.length) return null;
  return (
    <InfoCard title={<>Set initial working loads</>}>
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
              weight: massToKg(num(new FormData(e.currentTarget), "weight"), mass),
            });
          }}
        >
          <NumberField
            name="weight"
            label={`${data.workout.exercises.find((e) => e.id === p.exercise_id)?.name} (${mass})`}
            value={Number(massFromKg(p.planned_weight_kg, mass).toFixed(3))}
            max={1000}
          />
          <ChunkyButton size="sm" disabled={pending}>
            Save
          </ChunkyButton>
        </form>
      ))}
    </InfoCard>
  );
}

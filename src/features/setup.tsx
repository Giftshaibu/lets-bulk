import { useState } from "react";
import { equipmentChoices, equipmentLabels } from "@/lib/domain/equipment";
import { api } from "./app-data";
import type { GuidedSetup } from "@/lib/domain/onboarding";
import type { estimatePlan } from "@/lib/domain/onboarding";
import { ChunkyButton } from "@/components/kit";
export const inputClass =
  "mt-1 min-h-11 w-full rounded-xl border-2 border-border bg-card p-2 font-bold";
export function NumberField({
  name,
  label,
  value,
  min = 0,
  max = 10000,
  step = "any",
  required = true,
}: {
  name: string;
  label: string;
  value?: number;
  min?: number;
  max?: number;
  step?: string;
  required?: boolean;
}) {
  return (
    <label className="grid text-sm font-bold">
      {label}
      <input
        className={inputClass}
        name={name}
        type="number"
        defaultValue={value}
        min={min}
        max={max}
        step={step}
        required={required}
      />
    </label>
  );
}
const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export function SetupForm({
  save,
  pending,
}: {
  save: (path: string, body: unknown) => Promise<boolean>;
  pending: boolean;
}) {
  const [step, setStep] = useState(0),
    [error, setError] = useState("");
  const [preview, setPreview] = useState<ReturnType<typeof estimatePlan> | null>(null);
  const [value, setValue] = useState<GuidedSetup>({
    name: "",
    weight: 65,
    height: 170,
    goal: 70,
    months: 8,
    age: null,
    sex: "skip",
    activity: "light",
    days: [1, 3, 5],
    equipment: ["bodyweight"],
    foods: [],
    budget: "balanced",
    weeklyBudget: null,
  });
  const update = <K extends keyof GuidedSetup>(key: K, v: GuidedSetup[K]) =>
    setValue((old) => ({ ...old, [key]: v }));
  const field = (
    key: "weight" | "height" | "goal" | "months",
    label: string,
    min: number,
    max: number,
  ) => (
    <label>
      {label}
      <input
        className={inputClass}
        type="number"
        min={min}
        max={max}
        step="any"
        required
        value={value[key]}
        onChange={(e) => update(key, Number(e.target.value))}
      />
    </label>
  );
  return (
    <form
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        if (step < 4) {
          setStep(step + 1);
          return;
        }
        try {
          if (!preview) {
            setPreview(
              await api<ReturnType<typeof estimatePlan>>("/api/setup/preview", "POST", value),
            );
          } else await save("/api/setup", value);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Please check your answers.");
        }
      }}
    >
      <p className="font-bold text-primary">Step {Math.min(step + 1, 5)} of 5</p>
      <h1 className="text-2xl font-extrabold">
        {
          [
            "Let’s start with you",
            "Your goal, at your pace",
            "Your everyday activity",
            "Your training week",
            "Food that works for you",
          ][step]
        }
      </h1>
      {step === 0 && (
        <>
          <label>
            Your name
            <input
              className={inputClass}
              required
              maxLength={80}
              value={value.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </label>
          {field("weight", "Current weight (kg)", 20, 500)}
          {field("height", "Height (cm)", 100, 260)}
          <label>
            Age (optional, adults 18+)
            <input
              className={inputClass}
              type="number"
              min={18}
              max={100}
              value={value.age ?? ""}
              onChange={(e) => update("age", e.target.value ? Number(e.target.value) : null)}
            />
          </label>
          <label>
            Sex used for energy estimate
            <select
              className={inputClass}
              value={value.sex}
              onChange={(e) => update("sex", e.target.value as GuidedSetup["sex"])}
            >
              <option value="skip">Skip — use a rough estimate</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </label>
        </>
      )}
      {step === 1 && (
        <>
          {field("goal", "Goal weight (kg)", 20, 500)}
          <label>
            Timeline
            <select
              className={inputClass}
              value={[6, 8, 12].includes(value.months) ? value.months : "custom"}
              onChange={(e) =>
                update("months", e.target.value === "custom" ? 9 : Number(e.target.value))
              }
            >
              <option value="6">6 months</option>
              <option value="8">8 months</option>
              <option value="12">12 months</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          {![6, 8, 12].includes(value.months) && field("months", "Number of months", 1, 60)}
          <p>Your timeline is a guide. Progress depends on your body’s response.</p>
        </>
      )}
      {step === 2 &&
        (
          [
            ["light", "Mostly sitting", "Desk work, study, and short walks"],
            ["moderate", "Often on your feet", "Regular walking or standing work"],
            ["active", "Physically active days", "Manual work or lots of daily movement"],
          ] as const
        ).map(([key, title, description]) => (
          <label key={key} className="rounded-2xl border-2 border-border p-4">
            <input
              type="radio"
              name="activity"
              checked={value.activity === key}
              onChange={() => update("activity", key)}
            />{" "}
            <strong>{title}</strong>
            <p>{description}</p>
          </label>
        ))}
      {step === 3 && (
        <>
          <p>Choose 3, 4 or 5 training days. Start with a schedule you can repeat.</p>
          {weekdays.map((d, i) => (
            <label key={d}>
              <input
                type="checkbox"
                checked={value.days.includes(i)}
                onChange={(e) =>
                  update(
                    "days",
                    e.target.checked ? [...value.days, i] : value.days.filter((n) => n !== i),
                  )
                }
              />{" "}
              {d}
            </label>
          ))}
          <fieldset>
            <legend className="font-bold">Equipment you can use</legend>
            <p>
              Bodyweight is included. Select benches and individual machines only when you can use
              them.
            </p>
            {equipmentChoices
              .filter((key) => key !== "bodyweight" && key !== "machine")
              .map((key) => (
                <label key={key} className="mr-4 inline-flex min-h-11 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={value.equipment.includes(key)}
                    onChange={(e) =>
                      update(
                        "equipment",
                        e.target.checked
                          ? [...value.equipment, key]
                          : value.equipment.filter((n) => n !== key),
                      )
                    }
                  />
                  {equipmentLabels[key]}
                </label>
              ))}
          </fieldset>
        </>
      )}
      {step === 4 && (
        <>
          <p>Which foods are easy for you to find?</p>
          {[
            "Nsima",
            "Rice",
            "Beans",
            "Groundnuts",
            "Usipa",
            "Chambo",
            "Eggs",
            "Milk",
            "Bananas",
            "Sweet potato",
          ].map((food) => (
            <label key={food}>
              <input
                type="checkbox"
                checked={value.foods.includes(food)}
                onChange={(e) => {
                  setPreview(null);
                  update(
                    "foods",
                    e.target.checked
                      ? [...value.foods, food]
                      : value.foods.filter((f) => f !== food),
                  );
                }}
              />{" "}
              {food}
            </label>
          ))}
          <label>
            Food budget
            <select
              className={inputClass}
              value={value.budget}
              onChange={(e) => {
                setPreview(null);
                update("budget", e.target.value as GuidedSetup["budget"]);
              }}
            >
              <option value="balanced">Balanced</option>
              <option value="budget">Keep costs low</option>
            </select>
          </label>
          <label>
            Weekly food budget (MWK, optional)
            <input
              className={inputClass}
              type="number"
              min="1"
              value={value.weeklyBudget ?? ""}
              onChange={(e) => {
                setPreview(null);
                update("weeklyBudget", e.target.value ? Number(e.target.value) : null);
              }}
            />
          </label>
        </>
      )}
      {preview && (
        <section
          aria-label="Your starting plan"
          className="rounded-2xl border-2 border-primary bg-primary-soft p-4"
        >
          <h2 className="text-xl font-bold">Your starting plan</h2>
          <p className="text-2xl font-bold">
            {preview.targets.kcal} kcal · {preview.targets.protein} g protein / day
          </p>
          <p>
            {preview.rough ? "Rough starting estimate. " : ""}
            {preview.explanation}
          </p>
          <p>
            Your goal implies about {preview.weeklyGoal} kg per week. A common gradual starting pace
            is 0.25–0.5% of body weight per week; a longer timeline may be more practical.
          </p>
          <details>
            <summary>Other nutrition targets</summary>
            {preview.targets.carbs} g carbs · {preview.targets.fat} g fat
          </details>
        </section>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="flex gap-3">
        {step > 0 && (
          <button
            type="button"
            className="min-h-11 underline"
            onClick={() => {
              setPreview(null);
              setStep(step - 1);
            }}
          >
            Back
          </button>
        )}
        <ChunkyButton disabled={pending}>
          {step < 4 ? "Continue" : preview ? "Save my plan" : "Show my starting plan"}
        </ChunkyButton>
      </div>
    </form>
  );
}

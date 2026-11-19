import { InfoCard } from "@/components/bottom-sheet";
import { useEffect, useRef, useState } from "react";
import { equipmentChoices, equipmentLabels } from "@/lib/domain/equipment";
import { api } from "./app-data";
import type { GuidedSetup } from "@/lib/domain/onboarding";
import type { estimatePlan } from "@/lib/domain/onboarding";
import { Bar, ChunkyButton } from "@/components/kit";
import { NumberStepper } from "@/components/stepper";
import { Mascot } from "@/components/mascot";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Scale,
  Target,
  Footprints,
  Dumbbell,
  Utensils,
} from "lucide-react";
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
const panel =
  "grid min-w-0 gap-4 rounded-3xl border-2 border-b-4 border-[#FFD699] bg-[#FFF6E8] p-4";
const choice = (selected: boolean) =>
  `press relative flex min-h-14 min-w-0 items-center gap-3 rounded-2xl border-2 border-b-4 p-3 text-left font-bold ${selected ? "border-[#CC7000] bg-[#FF9600] text-white" : "border-[#E3CBB5] bg-[#FFF9EE] text-[#60351F]"}`;
function Choices<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string, string?])[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="grid min-w-0 gap-2">
      <legend className="mb-2 font-extrabold">{label}</legend>
      {options.map(([key, title, description]) => (
        <label key={key} className={choice(value === key)}>
          <input
            type="radio"
            name={label}
            value={key}
            checked={value === key}
            onChange={() => onChange(key)}
            className="h-5 w-5 shrink-0 accent-[#60351F]"
          />
          <span className="min-w-0">
            <span className="block">{title}</span>
            {description && <span className="mt-1 block text-xs font-medium">{description}</span>}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
export function SetupForm({
  save,
  pending,
}: {
  save: (path: string, body: unknown) => Promise<boolean>;
  pending: boolean;
}) {
  const [step, setStep] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null),
    first = useRef(true);
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
  const locked = pending || busy;
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus();
    heading.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [step]);
  const update = <K extends keyof GuidedSetup>(key: K, v: GuidedSetup[K]) => {
    setPreview(null);
    setError("");
    setValue((old) => ({ ...old, [key]: v }));
  };
  const field = (
    key: "weight" | "height" | "goal" | "months",
    label: string,
    min: number,
    max: number,
    increment: number,
    suffix: string,
  ) => (
    <NumberStepper
      label={label}
      value={value[key]}
      onChange={(n) => update(key, n)}
      min={min}
      max={max}
      step={increment}
      suffix={suffix}
      disabled={locked}
    />
  );
  const toggle = <T,>(items: T[], item: T) =>
    items.includes(item) ? items.filter((v) => v !== item) : [...items, item];
  const Icon = [Scale, Target, Footprints, Dumbbell, Utensils][step]!;
  return (
    <form
      className="grid min-w-0 gap-4"
      aria-busy={locked}
      onSubmit={async (e) => {
        e.preventDefault();
        if (locked) return;
        setError("");
        if (step === 0 && !value.name.trim()) {
          setError("Enter your name to continue.");
          return;
        }
        if (step === 1 && value.goal <= value.weight) {
          setError("Choose a goal above your current weight.");
          return;
        }
        if (step === 3 && (value.days.length < 3 || value.days.length > 5)) {
          setError("Choose 3, 4 or 5 training days.");
          return;
        }
        if (step < 4) {
          setStep(step + 1);
          return;
        }
        setBusy(true);
        try {
          if (!preview)
            setPreview(
              await api<ReturnType<typeof estimatePlan>>("/api/setup/preview", "POST", {
                ...value,
                name: value.name.trim(),
              }),
            );
          else await save("/api/setup", { ...value, name: value.name.trim() });
        } catch (e) {
          setError(e instanceof Error ? e.message : "Please check your answers.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-extrabold text-primary">Step {step + 1} of 5</p>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#60351F] text-[#FFF9EE]">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      </div>
      <Bar value={step + 1} max={5} />
      <div className="flex items-center gap-3 rounded-2xl bg-[#FFF9EE] p-3">
        <Mascot
          expression={locked ? "thinking" : preview ? "happy" : "confident"}
          className="h-20 w-20 shrink-0"
        />
        <div className="min-w-0">
          <h1 ref={heading} tabIndex={-1} className="text-xl font-black leading-tight outline-none">
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
          <p className="mt-2 text-sm font-bold">
            {
              [
                "A few details to make your plan yours.",
                "Small steps. A pace you can keep.",
                "Choose what a normal day feels like.",
                "Build a week that fits your life.",
                "Familiar foods. A practical starting plan.",
              ][step]
            }
          </p>
        </div>
      </div>
      <fieldset disabled={locked} className="grid min-w-0 gap-4">
        {step === 0 && (
          <section className={panel} aria-label="About you">
            <label className="text-sm font-extrabold">
              Your name
              <input
                className={inputClass}
                required
                maxLength={80}
                autoComplete="given-name"
                value={value.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </label>
            {field("weight", "Current weight (kg)", 20, 500, 0.1, "kg")}
            {field("height", "Height (cm)", 100, 260, 1, "cm")}
            {value.age === null ? (
              <ChunkyButton type="button" tone="neutral" onClick={() => update("age", 25)}>
                Add age (optional, adults 18+)
              </ChunkyButton>
            ) : (
              <>
                <NumberStepper
                  label="Age"
                  value={value.age}
                  min={18}
                  max={100}
                  step={1}
                  suffix="years"
                  onChange={(n) => update("age", n)}
                />
                <ChunkyButton
                  type="button"
                  tone="neutral"
                  size="sm"
                  onClick={() => update("age", null)}
                >
                  Skip age
                </ChunkyButton>
              </>
            )}
            <Choices
              label="Sex used for energy estimate"
              value={value.sex}
              options={[
                ["skip", "Skip — use a rough estimate"],
                ["female", "Female"],
                ["male", "Male"],
              ]}
              onChange={(n) => update("sex", n)}
            />
          </section>
        )}
        {step === 1 && (
          <section className={panel} aria-label="Your goal">
            {field("goal", "Goal weight (kg)", 20, 500, 0.1, "kg")}
            <fieldset>
              <legend className="mb-2 font-extrabold">Timeline shortcuts</legend>
              <div className="grid grid-cols-3 gap-2">
                {[6, 8, 12].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={value.months === n}
                    className={`${choice(value.months === n)} justify-center px-1 text-sm`}
                    onClick={() => update("months", n)}
                  >
                    {n} months
                  </button>
                ))}
              </div>
            </fieldset>
            {field("months", "Number of months", 1, 60, 1, "months")}
            <InfoCard title="A timeline that works for you">
              <p>
                Your timeline is a guide. Progress depends on your body’s response. A reference date
                never forces catch-up calories.
              </p>
            </InfoCard>
          </section>
        )}
        {step === 2 && (
          <section className={panel}>
            <Choices
              label="Everyday activity"
              value={value.activity}
              options={[
                ["light", "Mostly sitting", "Desk work, study, and short walks"],
                ["moderate", "Often on your feet", "Regular walking or standing work"],
                ["active", "Physically active days", "Manual work or lots of daily movement"],
              ]}
              onChange={(n) => update("activity", n)}
            />
          </section>
        )}
        {step === 3 && (
          <>
            <section className={panel}>
              <h2 className="font-black">Your training days · {value.days.length} selected</h2>
              <p className="text-sm">
                Choose 3, 4 or 5 days. Start with a schedule you can repeat.
              </p>
              <div className="grid grid-cols-1 gap-2 min-[440px]:grid-cols-2">
                {weekdays.map((d, i) => (
                  <label key={d} className={choice(value.days.includes(i))}>
                    <input
                      type="checkbox"
                      checked={value.days.includes(i)}
                      onChange={() => update("days", toggle(value.days, i))}
                      className="h-5 w-5 shrink-0 accent-[#60351F]"
                    />
                    <span className="min-w-0 break-words text-sm">{d}</span>
                  </label>
                ))}
              </div>
            </section>
            <section className="grid min-w-0 gap-3 rounded-3xl border-2 border-b-4 border-[#E3CBB5] bg-[#FAF3EC] p-4">
              <h2 className="font-black">Equipment you can use</h2>
              <InfoCard title="What equipment should I select?">
                <p>
                  Bodyweight is included. Choose benches and individual machines only when you can
                  use them. You can change your equipment later in Settings.
                </p>
              </InfoCard>
              {equipmentChoices
                .filter((key) => key !== "bodyweight" && key !== "machine")
                .map((key) => (
                  <label key={key} className={choice(value.equipment.includes(key))}>
                    <input
                      type="checkbox"
                      checked={value.equipment.includes(key)}
                      onChange={() => update("equipment", toggle(value.equipment, key))}
                      className="h-5 w-5 shrink-0 accent-[#60351F]"
                    />
                    <span className="min-w-0 break-words text-sm">{equipmentLabels[key]}</span>
                  </label>
                ))}
            </section>
          </>
        )}
        {step === 4 && (
          <>
            <section className={panel}>
              <h2 className="font-black">Which foods are easy for you to find?</h2>
              <div className="grid grid-cols-1 gap-2 min-[440px]:grid-cols-2">
                {[
                  "Nsima",
                  "Rice",
                  "Beans",
                  "Soya pieces",
                  "Groundnuts",
                  "Usipa",
                  "Chambo",
                  "Eggs",
                  "Milk",
                  "Bananas",
                  "Sweet potato",
                ].map((food) => (
                  <label key={food} className={choice(value.foods.includes(food))}>
                    <input
                      type="checkbox"
                      checked={value.foods.includes(food)}
                      onChange={() => update("foods", toggle(value.foods, food))}
                      className="h-5 w-5 shrink-0 accent-[#60351F]"
                    />
                    <span className="min-w-0 break-words text-sm">{food}</span>
                  </label>
                ))}
              </div>
            </section>
            <section className="grid min-w-0 gap-4 rounded-3xl border-2 border-b-4 border-[#FFE099] bg-[#FFF9EB] p-4">
              <Choices
                label="Food budget"
                value={value.budget}
                options={[
                  ["balanced", "Balanced"],
                  ["budget", "Keep costs low"],
                ]}
                onChange={(n) => update("budget", n)}
              />
              {value.weeklyBudget === null ? (
                <ChunkyButton
                  type="button"
                  tone="neutral"
                  onClick={() => update("weeklyBudget", 10000)}
                >
                  Add weekly budget (optional)
                </ChunkyButton>
              ) : (
                <>
                  <NumberStepper
                    label="Weekly food budget (MWK)"
                    value={value.weeklyBudget}
                    min={1}
                    max={100000000}
                    step={1000}
                    suffix="MWK"
                    onChange={(n) => update("weeklyBudget", n)}
                  />
                  <ChunkyButton
                    type="button"
                    tone="neutral"
                    size="sm"
                    onClick={() => update("weeklyBudget", null)}
                  >
                    Remove weekly budget
                  </ChunkyButton>
                </>
              )}
            </section>
          </>
        )}
      </fieldset>
      {preview && (
        <section
          aria-label="Your starting plan"
          className="grid gap-3 rounded-3xl border-2 border-b-4 border-success bg-success-soft p-4"
        >
          <h2 className="text-xl font-black">Your starting plan</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              [preview.targets.kcal, "kcal / day"],
              [preview.targets.protein, "g protein / day"],
            ].map(([n, label]) => (
              <div key={label} className="min-w-0 rounded-2xl bg-card p-3">
                <p className="break-words text-xl font-black">{n}</p>
                <p className="text-xs font-bold">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-sm font-bold">
            {preview.rough ? "A rough starting estimate. " : ""}We’ll use your logs to guide later
            changes.
          </p>
          <InfoCard title="How we built your starting plan">
            <p>{preview.explanation}</p>
            <p className="mt-3">
              Your goal implies about {preview.weeklyGoal} kg per week. A common gradual starting
              pace is 0.25–0.5% of body weight per week; a longer timeline may be more practical.
            </p>
          </InfoCard>
          <InfoCard title="Other nutrition targets">
            <p>
              {preview.targets.carbs} g carbs · {preview.targets.fat} g fat per day
            </p>
          </InfoCard>
        </section>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-2xl border-2 border-danger bg-danger-soft p-3 text-sm font-bold"
        >
          {error}
        </p>
      )}
      <div className="grid gap-3">
        {step > 0 && (
          <ChunkyButton
            type="button"
            tone="neutral"
            disabled={locked}
            onClick={() => {
              setPreview(null);
              setError("");
              setStep(step - 1);
            }}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            Back
          </ChunkyButton>
        )}
        <ChunkyButton type="submit" disabled={locked} full>
          {locked
            ? "Working…"
            : step < 4
              ? "Continue"
              : preview
                ? "Save my plan"
                : "Show my starting plan"}
          {preview ? (
            <Check className="h-5 w-5 shrink-0" aria-hidden="true" />
          ) : (
            <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
          )}
        </ChunkyButton>
      </div>
    </form>
  );
}

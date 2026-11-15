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
export function SetupForm({
  save,
  pending,
}: {
  save: (path: string, body: unknown) => Promise<boolean>;
  pending: boolean;
}) {
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget),
          n = (k: string) => Number(f.get(k));
        void save("/api/profile", {
          profile: {
            name: String(f.get("name")),
            height: n("height"),
            weight: n("weight"),
            goal: n("goal"),
          },
          targets: { kcal: n("kcal"), protein: n("protein"), carbs: n("carbs"), fat: n("fat") },
          equipment: ["bodyweight", ...f.getAll("equipment")],
        });
      }}
    >
      <h1 className="text-2xl font-extrabold">Make the plan yours</h1>
      <p>
        Enter your current measurements and confirm your initial daily targets. Weekly reviews will
        suggest changes as your logs build up.
      </p>
      <label>
        Name
        <input className={inputClass} name="name" defaultValue="Gift" maxLength={80} required />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <NumberField name="height" label="Height (cm)" min={50} max={260} />
        <NumberField name="weight" label="Starting weight (kg)" min={20} max={500} />
        <NumberField name="goal" label="Goal weight (kg)" min={20} max={500} />
        <NumberField name="kcal" label="Daily calories" min={500} max={10000} step="1" />
        <NumberField name="protein" label="Protein (g)" min={1} max={500} step="1" />
        <NumberField name="carbs" label="Carbs (g)" min={0} max={1500} step="1" />
        <NumberField name="fat" label="Fat (g)" min={1} max={500} step="1" />
      </div>
      <fieldset>
        <legend className="font-bold">Equipment you have</legend>
        <p className="text-sm">Bodyweight is included. Select only equipment you can use.</p>
        {["barbell", "dumbbell", "cable", "machine", "pullup_bar"].map((v) => (
          <label key={v} className="mr-4 inline-flex min-h-11 items-center gap-2">
            <input type="checkbox" name="equipment" value={v} />
            {v}
          </label>
        ))}
      </fieldset>
      <p className="text-sm">
        Initial schedule: Upper / Lower on Monday, Tuesday, Thursday and Friday. You can change the
        days in Settings.
      </p>
      <ChunkyButton disabled={pending}>Save my plan</ChunkyButton>
    </form>
  );
}

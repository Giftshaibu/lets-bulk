import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, Plus, Trash2, Utensils, Check } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, ChunkyButton } from "@/components/kit";
import { DateField } from "@/components/date-field";
import { NumberStepper } from "@/components/stepper";
import { ChoiceField, SelectionScreen } from "@/components/selection-screen";
import { useAppData } from "@/features/app-data";
export const Route = createFileRoute("/saved-meals")({ component: SavedMeals });
function SavedMeals() {
  const { data, act, pending } = useAppData();
  const [edit, setEdit] = useState<string | null>(null),
    [query, setQuery] = useState(""),
    [date, setDate] = useState(data.date),
    [slot, setSlot] = useState("lunch"),
    [adding, setAdding] = useState(""),
    [added, setAdded] = useState<string[]>([]),
    [error, setError] = useState("");
  const attempts = useRef<Record<string, string>>({});
  if (edit !== null) return <MealEditor key={edit} id={edit} onBack={() => setEdit(null)} />;
  return (
    <AppShell title="Saved meals" subtitle="Your familiar meals, ready when you are">
      <Link to="/food" className="my-2 inline-flex min-h-11 items-center gap-2 font-bold">
        <ArrowLeft className="h-5 w-5" />
        Back to Food
      </Link>
      <ChunkyButton type="button" full onClick={() => setEdit("new")}>
        <Plus className="h-5 w-5" />
        Create meal
      </ChunkyButton>
      <div className="my-4 flex flex-wrap items-center gap-2">
        <DateField
          aria-label="Meal date"
          value={date}
          max={data.date}
          onChange={(e) => {
            setDate(e.target.value);
            setAdded([]);
            attempts.current = {};
          }}
        />
        <ChoiceField
          aria-label="Add meal to"
          value={slot}
          onChange={(e) => {
            setSlot(e.target.value);
            setAdded([]);
            attempts.current = {};
          }}
        >
          {["breakfast", "lunch", "snack", "dinner"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </ChoiceField>
      </div>
      <input
        aria-label="Search saved meals"
        placeholder="Find a saved meal"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-4 min-h-12 w-full rounded-2xl border-2 bg-card p-3 font-bold"
      />
      {error && (
        <p role="alert" className="my-3 rounded-xl bg-danger-soft p-3 font-bold">
          {error}
        </p>
      )}
      <div className="grid gap-4">
        {!data.mealTemplates.length && (
          <Card>
            <Utensils className="mb-3 h-8 w-8 text-primary" />
            <h2 className="text-xl font-black">Your meals live here</h2>
            <p className="mt-2 text-sm">
              Create a meal once, then add its ingredients together whenever you eat it.
            </p>
          </Card>
        )}
        {data.mealTemplates
          .filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
          .map((m) => {
            const available =
              m.items.length > 0 &&
              m.items.every((i) => data.foodLibrary.some((f) => f.id === i.food_id));
            const totals = m.items.reduce(
              (n, i) => {
                const f = data.foodLibrary.find((f) => f.id === i.food_id);
                return {
                  kcal: n.kcal + ((f?.calories_per_100g ?? 0) * i.grams) / 100,
                  protein: n.protein + ((f?.protein_per_100g ?? 0) * i.grams) / 100,
                };
              },
              { kcal: 0, protein: 0 },
            );
            return (
              <Card key={m.id}>
                <h2 className="text-xl font-black">{m.name}</h2>
                <p className="my-2 font-black text-primary">
                  {available
                    ? `${Math.round(totals.kcal)} kcal · ${Math.round(totals.protein)} g protein`
                    : "Review unavailable ingredients"}
                </p>
                <ul className="my-3 space-y-2 text-sm">
                  {m.items.map((i) => (
                    <li key={i.id}>
                      {i.grams} g ·{" "}
                      {data.foodLibrary.find((f) => f.id === i.food_id)?.name ??
                        "Unavailable ingredient"}
                    </li>
                  ))}
                </ul>
                <div className="grid gap-2">
                  <ChunkyButton
                    type="button"
                    disabled={pending || added.includes(m.id) || !available}
                    onClick={async () => {
                      setAdding(m.id);
                      setError("");
                      const id = attempts.current[m.id] ?? crypto.randomUUID();
                      attempts.current[m.id] = id;
                      try {
                        if (await act("/api/meals/log", { id, mealId: m.id, date, slot }))
                          setAdded((v) => [...v, m.id]);
                        else setError("Adding wasn’t confirmed. Retry this meal safely.");
                      } finally {
                        setAdding("");
                      }
                    }}
                  >
                    {adding === m.id ? "Adding…" : added.includes(m.id) ? "Added" : "Add meal"}
                    {added.includes(m.id) && <Check className="h-5 w-5" />}
                  </ChunkyButton>
                  <ChunkyButton
                    type="button"
                    tone="neutral"
                    disabled={pending}
                    onClick={() => setEdit(m.id)}
                  >
                    Edit meal
                  </ChunkyButton>
                </div>
              </Card>
            );
          })}
      </div>
    </AppShell>
  );
}
function MealEditor({ id, onBack }: { id: string; onBack: () => void }) {
  const { data, act, pending } = useAppData(),
    meal = data.mealTemplates.find((m) => m.id === id);
  const [saveId] = useState(() => meal?.id ?? crypto.randomUUID()),
    [name, setName] = useState(meal?.name ?? ""),
    [slot, setSlot] = useState(meal?.meal_type ?? "lunch"),
    [items, setItems] = useState(
      () =>
        meal?.items.map((i) => ({
          key: crypto.randomUUID(),
          food_id: i.food_id,
          grams: i.grams,
        })) ?? [],
    ),
    [picker, setPicker] = useState(false),
    [error, setError] = useState("");
  if (id !== "new" && !meal)
    return (
      <AppShell title="Meal unavailable">
        <ChunkyButton type="button" onClick={onBack}>
          Back to saved meals
        </ChunkyButton>
      </AppShell>
    );
  return (
    <main className="mx-auto flex h-dvh max-w-2xl flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b-2 bg-card p-4">
        <button
          type="button"
          aria-label="Back to saved meals"
          disabled={pending}
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-black">{meal ? "Edit meal" : "Create a meal"}</h1>
      </header>
      <form
        id="meal-editor"
        className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!items.length || pending) return;
          setError("");
          if (
            await act(
              "/api/meals",
              {
                id: saveId,
                name,
                meal_type: slot,
                items: items.map(({ food_id, grams }) => ({ food_id, grams })),
              },
              meal ? "PATCH" : "POST",
            )
          )
            onBack();
          else setError("Your meal wasn’t saved. Your edits are still here; try again.");
        }}
      >
        <label className="block font-bold">
          Meal name
          <input
            aria-label="Meal name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
            className="mt-2 min-h-12 w-full rounded-2xl border-2 p-3"
          />
        </label>
        <ChoiceField
          aria-label="Meal slot"
          value={slot}
          onChange={(e) => setSlot(e.target.value as typeof slot)}
        >
          {["breakfast", "lunch", "snack", "dinner"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </ChoiceField>
        {items.map((i) => (
          <Card key={i.key}>
            <h2 className="mb-3 font-black">
              {data.foodLibrary.find((f) => f.id === i.food_id)?.name ?? "Unavailable food"}
            </h2>
            <NumberStepper
              label="Grams"
              value={i.grams}
              step={10}
              min={0.1}
              max={10000}
              suffix="g"
              disabled={pending}
              onChange={(n) =>
                setItems((old) => old.map((x) => (x.key === i.key ? { ...x, grams: n } : x)))
              }
            />
            <button
              type="button"
              disabled={pending}
              className="mt-3 inline-flex min-h-11 items-center gap-2 font-bold text-danger"
              onClick={() => setItems((old) => old.filter((x) => x.key !== i.key))}
            >
              <Trash2 className="h-5 w-5" />
              Remove ingredient
            </button>
          </Card>
        ))}
        <ChunkyButton
          type="button"
          full
          tone="neutral"
          disabled={pending || items.length >= 30}
          onClick={() => setPicker(true)}
        >
          <Plus className="h-5 w-5" />
          Add ingredient
        </ChunkyButton>
        {error && (
          <p role="alert" className="rounded-xl bg-danger-soft p-3 font-bold">
            {error}
          </p>
        )}
      </form>
      <footer className="shrink-0 border-t-2 bg-card p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        <ChunkyButton form="meal-editor" type="submit" full disabled={pending || !items.length}>
          {pending ? "Saving…" : "Save meal"}
          <Check className="h-5 w-5" />
        </ChunkyButton>
      </footer>
      <SelectionScreen
        title="Choose ingredient"
        options={data.foodLibrary.map((f) => ({
          value: f.id,
          label: `${f.name} · ${f.preparation_state}`,
        }))}
        value={[]}
        open={picker}
        onOpenChange={setPicker}
        onChange={(v) => {
          if (v[0])
            setItems((old) => [...old, { key: crypto.randomUUID(), food_id: v[0]!, grams: 100 }]);
        }}
      />
    </main>
  );
}

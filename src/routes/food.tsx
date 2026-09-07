import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Plus, Search, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Bar, BigStat, Card, ChunkyButton, Pill, SectionTitle } from "@/components/kit";
import { getFoods, getMeals, getTargets, sumMeals } from "@/lib/data/service";
import type { FoodItem, LoggedFood, Meal } from "@/lib/data/types";

export const Route = createFileRoute("/food")({
  head: () => ({
    meta: [
      { title: "Food — Gift Bulk Training Companion" },
      {
        name: "description",
        content: "Log meals, track calories and macros, and see exactly what's left to eat today.",
      },
      { property: "og:title", content: "Food — Gift Bulk Training Companion" },
      {
        property: "og:description",
        content: "Meal timeline, remaining targets and quick-add favourites.",
      },
    ],
  }),
  component: FoodPage,
});

function FoodPage() {
  const targets = getTargets();
  const foods = getFoods();
  const [meals, setMeals] = useState<Meal[]>(() => getMeals().map((m) => ({ ...m })));
  const [sheetMealId, setSheetMealId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [multiplier, setMultiplier] = useState(1);

  const eaten = useMemo(() => sumMeals(meals), [meals]);
  const remaining = {
    kcal: Math.max(targets.kcal - eaten.kcal, 0),
    protein: Math.max(targets.protein - eaten.protein, 0),
    carbs: Math.max(targets.carbs - eaten.carbs, 0),
    fat: Math.max(targets.fat - eaten.fat, 0),
  };

  const results = foods.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()));

  function addFood(mealId: string, food: FoodItem, mult: number) {
    const item: LoggedFood = {
      id: `${food.id}-${Date.now()}`,
      foodId: food.id,
      name: food.name,
      portion: mult === 1 ? food.serving : `${mult}× ${food.serving}`,
      kcal: Math.round(food.kcal * mult),
      protein: Math.round(food.protein * mult),
      carbs: Math.round(food.carbs * mult),
      fat: Math.round(food.fat * mult),
    };
    setMeals((prev) =>
      prev.map((m) => (m.id === mealId ? { ...m, logged: true, items: [...m.items, item] } : m)),
    );
    setSheetMealId(null);
    setSelected(null);
    setMultiplier(1);
    setQuery("");
  }

  function removeItem(mealId: string, itemId: string) {
    setMeals((prev) =>
      prev.map((m) =>
        m.id === mealId
          ? { ...m, items: m.items.filter((i) => i.id !== itemId), logged: m.items.length > 1 }
          : m,
      ),
    );
  }

  const nextOpenMeal = meals.find((m) => !m.logged) ?? meals[meals.length - 1];

  return (
    <AppShell title="Food" subtitle={`${eaten.kcal.toLocaleString()} of ${targets.kcal} kcal`}>
      <div className="flex flex-col gap-4">
        <Card tone={remaining.kcal === 0 ? "success" : "default"}>
          <SectionTitle>Remaining today</SectionTitle>
          <div className="flex items-end justify-between">
            <BigStat
              value={remaining.kcal.toLocaleString()}
              label="Calories left"
              tone={remaining.kcal === 0 ? "success" : "primary"}
            />
            <Pill tone={remaining.protein === 0 ? "success" : "neutral"}>
              {Math.round(remaining.protein)}g protein left
            </Pill>
          </div>
          <Bar className="mt-3" value={eaten.kcal} max={targets.kcal} />
          <div className="mt-4 grid grid-cols-3 gap-3">
            <MacroMini label="Protein" left={remaining.protein} />
            <MacroMini label="Carbs" left={remaining.carbs} />
            <MacroMini label="Fat" left={remaining.fat} />
          </div>
        </Card>

        <div>
          <SectionTitle>Quick add</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {foods
              .filter((f) => f.frequent)
              .map((f) => (
                <button
                  key={f.id}
                  onClick={() => addFood(nextOpenMeal.id, f, 1)}
                  className="press inline-flex items-center gap-1.5 rounded-full border-2 border-b-4 border-border bg-card px-3.5 py-2 text-[13px] font-extrabold"
                >
                  <Plus className="h-4 w-4 text-primary" strokeWidth={3} />
                  {f.name}
                  <span className="text-muted-foreground">{f.kcal}</span>
                </button>
              ))}
          </div>
        </div>

        <div>
          <SectionTitle>Meal timeline</SectionTitle>
          <div className="flex flex-col gap-3">
            {meals.map((meal) => {
              const total = meal.items.reduce((a, i) => a + i.kcal, 0);
              return (
                <Card key={meal.id} tone={meal.logged ? "success" : "default"}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[18px] font-extrabold">{meal.title}</span>
                        {meal.logged && <Check className="h-5 w-5 text-success" strokeWidth={3} />}
                      </div>
                      <div className="text-[13px] font-bold text-muted-foreground">
                        {meal.time} · target {meal.targetKcal} kcal
                      </div>
                    </div>
                    <div className="text-[22px] font-extrabold">{total}</div>
                  </div>

                  {meal.items.length > 0 ? (
                    <ul className="mt-3 flex flex-col gap-1.5">
                      {meal.items.map((i) => (
                        <li
                          key={i.id}
                          className="flex items-center justify-between rounded-xl bg-card/70 px-3 py-2"
                        >
                          <div>
                            <div className="text-[14px] font-extrabold">{i.name}</div>
                            <div className="text-[12px] font-bold text-muted-foreground">
                              {i.portion} · {i.protein}g P
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-extrabold">{i.kcal}</span>
                            <button
                              aria-label={`Remove ${i.name}`}
                              onClick={() => removeItem(meal.id, i.id)}
                              className="rounded-lg p-1 text-faint hover:text-danger"
                            >
                              <X className="h-4 w-4" strokeWidth={3} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-[14px] font-bold text-muted-foreground">
                      Nothing logged yet — add something to stay on pace.
                    </p>
                  )}

                  <ChunkyButton
                    tone="neutral"
                    size="sm"
                    full
                    className="mt-3"
                    onClick={() => setSheetMealId(meal.id)}
                  >
                    <Plus className="h-4 w-4" strokeWidth={3} /> Add food
                  </ChunkyButton>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {sheetMealId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[85vh] w-full max-w-[520px] overflow-y-auto rounded-t-3xl border-2 border-border bg-card p-4 sm:rounded-3xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[20px] font-extrabold">
                {selected ? selected.name : "Add food"}
              </h3>
              <button
                aria-label="Close"
                onClick={() => {
                  setSheetMealId(null);
                  setSelected(null);
                  setMultiplier(1);
                }}
                className="rounded-xl border-2 border-border p-2"
              >
                <X className="h-5 w-5" strokeWidth={3} />
              </button>
            </div>

            {!selected ? (
              <>
                <div className="flex items-center gap-2 rounded-2xl border-2 border-border bg-muted px-3">
                  <Search className="h-5 w-5 text-faint" strokeWidth={3} />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search foods"
                    className="min-h-[52px] w-full bg-transparent text-[16px] font-bold outline-none"
                  />
                </div>
                <ul className="mt-3 flex flex-col gap-2">
                  {results.map((f) => (
                    <li key={f.id}>
                      <button
                        onClick={() => setSelected(f)}
                        className="press flex w-full items-center justify-between rounded-2xl border-2 border-b-4 border-border bg-card px-4 py-3 text-left"
                      >
                        <div>
                          <div className="text-[15px] font-extrabold">{f.name}</div>
                          <div className="text-[12px] font-bold text-muted-foreground">
                            {f.serving} · {f.protein}g P
                          </div>
                        </div>
                        <span className="text-[16px] font-extrabold">{f.kcal}</span>
                      </button>
                    </li>
                  ))}
                  {results.length === 0 && (
                    <li className="py-6 text-center text-[14px] font-bold text-muted-foreground">
                      No food matches "{query}".
                    </li>
                  )}
                </ul>
              </>
            ) : (
              <>
                <div className="rounded-2xl border-2 border-b-4 border-primary bg-primary-soft p-4">
                  <BigStat
                    value={Math.round(selected.kcal * multiplier)}
                    label={`${multiplier}× ${selected.serving}`}
                    tone="primary"
                  />
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <MacroMini label="Protein" left={selected.protein * multiplier} />
                    <MacroMini label="Carbs" left={selected.carbs * multiplier} />
                    <MacroMini label="Fat" left={selected.fat * multiplier} />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[0.5, 1, 1.5, 2, 3].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMultiplier(m)}
                      className={`press min-h-[48px] flex-1 rounded-2xl border-2 border-b-4 px-3 text-[15px] font-extrabold ${
                        multiplier === m
                          ? "border-primary bg-primary-soft text-primary-shadow"
                          : "border-border bg-card"
                      }`}
                    >
                      {m}×
                    </button>
                  ))}
                </div>
                <ChunkyButton
                  full
                  className="mt-4"
                  onClick={() => addFood(sheetMealId, selected, multiplier)}
                >
                  Add to meal
                </ChunkyButton>
              </>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function MacroMini({ label, left }: { label: string; left: number }) {
  return (
    <div className="rounded-xl bg-muted px-3 py-2">
      <div className="text-[16px] font-extrabold">
        {Math.round(left)}
        <span className="text-[12px]">g</span>
      </div>
      <div className="text-[11px] font-extrabold tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
    </div>
  );
}

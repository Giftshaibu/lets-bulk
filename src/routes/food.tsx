import { units, ML_PER_FL_OZ, volumeLabel } from "@/lib/domain/units";
import { MacroTiles, NutritionMascot } from "@/features/quest-ui";
import { Mascot } from "@/components/mascot";
import { FoodAIActions } from "@/features/food-ai";
import { searchFoods, gramsPerMl } from "@/lib/domain/food-catalog";
import { TargetExplanation } from "@/features/target-explanation";
import { FoodActions } from "@/features/food-actions";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Plus, Search, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Bar, BigStat, Card, ChunkyButton, Pill, SectionTitle } from "@/components/kit";
import { useAppData } from "@/features/app-data";
import { Link } from "@tanstack/react-router";
import type { FoodItem, LoggedFood, Meal } from "@/lib/data/types";

export const Route = createFileRoute("/food")({
  head: () => ({
    meta: [
      { title: "Food — Chiuli Training Companion" },
      {
        name: "description",
        content: "Log meals, track calories and macros, and see exactly what's left to eat today.",
      },
      { property: "og:title", content: "Food — Chiuli Training Companion" },
      {
        property: "og:description",
        content: "Meal timeline, remaining targets and quick-add favourites.",
      },
    ],
  }),
  component: FoodPage,
});

function FoodPage() {
  const { data, act, pending } = useAppData();
  const preferred = units(data.preferences);
  const { targets, foods, meals, eaten, remaining } = data;
  const [sheetMealId, setSheetMealId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [multiplier, setMultiplier] = useState(1);

  const [amountUnit, setAmountUnit] = useState<"g" | "ml" | "fl_oz">("g");
  const allResults = searchFoods(foods, query);
  const results = allResults.slice(0, 50);
  const density = selected ? gramsPerMl(selected) : null;

  async function addFood(mealId: string, food: FoodItem, mult: number) {
    if (
      await act("/api/nutrition/logs", {
        id: crypto.randomUUID(),
        date: data.date,
        slot: mealId,
        foodId: food.id,
        grams: 100 * mult,
      })
    ) {
      setSheetMealId(null);
      setSelected(null);
      setMultiplier(1);
      setQuery("");
      setAmountUnit("g");
    }
  }
  function removeItem(_mealId: string, itemId: string) {
    void act(`/api/nutrition/items/${itemId}`, undefined, "DELETE");
  }

  const nextOpenMeal = meals.find((m) => !m.logged) ?? meals[meals.length - 1]!;

  return (
    <AppShell title="Food" subtitle={`${eaten.kcal.toLocaleString()} of ${targets.kcal} kcal`}>
      <div className="flex flex-col gap-4">
        <Card tone={remaining.kcal === 0 ? "success" : "default"}>
          <SectionTitle action={<NutritionMascot />}>Remaining today</SectionTitle>
          <div className="flex items-end justify-between">
            <BigStat
              value={remaining.kcal.toLocaleString()}
              label="kcal to grow"
              tone={remaining.kcal === 0 ? "success" : "primary"}
            />
            <Pill tone={remaining.protein === 0 ? "success" : "neutral"}>
              {Math.round(remaining.protein)}g protein quest
            </Pill>
          </div>
          <Bar className="mt-3" value={eaten.kcal} max={targets.kcal} />
          <TargetExplanation />
          <MacroTiles remaining />
        </Card>

        <div>
          <SectionTitle>Find a food</SectionTitle>
          <FoodAIActions onManualSearch={() => setSheetMealId(nextOpenMeal.id)} />
          <ChunkyButton full onClick={() => setSheetMealId(nextOpenMeal.id)}>
            <Search className="h-5 w-5" /> Search foods
          </ChunkyButton>
          <div className="flex flex-wrap gap-2">
            {foods
              .filter((f) => f.frequent)
              .slice(0, 8)
              .map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setAmountUnit("g");
                    setSelected(f);
                    setSheetMealId(nextOpenMeal.id);
                  }}
                  className="press inline-flex items-center gap-1.5 rounded-full border-2 border-b-4 border-border bg-card px-3.5 py-2 text-[13px] font-extrabold"
                >
                  <Plus className="h-4 w-4 text-primary" strokeWidth={3} />
                  {f.name}
                  <span className="text-muted-foreground">{f.kcal}</span>
                  {f.kcal >= 200 && (
                    <span className="text-[10px] text-primary">15 XP on first meal-slot log</span>
                  )}
                </button>
              ))}
          </div>
        </div>

        <div>
          <SectionTitle>Meal timeline</SectionTitle>
          {meals.every((m) => m.logged) && (
            <div className="my-3 flex items-center gap-3 rounded-2xl bg-success-soft p-3">
              <Mascot expression="happy" className="h-16 w-16" interactive />
              <p className="text-sm font-bold">
                Full day fed! All four meal slots logged. Your first full day earns a 40 XP bonus.
              </p>
            </div>
          )}
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
                      {
                        (
                          {
                            breakfast: "Morning refuel — build your day with breakfast.",
                            lunch: "Midday refuel — choose what works for you.",
                            snack: "A snack is an option if it fits your remaining targets.",
                            dinner: "Evening meal — check what’s left in your daily targets.",
                          } as Record<string, string>
                        )[meal.id]
                      }
                    </p>
                  )}

                  {meal.items.length > 0 && <SaveMeal meal={meal} />}
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

      <Link
        to="/food-library"
        className="my-4 inline-flex min-h-11 items-center font-bold underline"
      >
        Saved meals, custom foods and prices →
      </Link>
      <Dialog.Root
        open={!!sheetMealId}
        onOpenChange={(open) => {
          if (!open) {
            setSheetMealId(null);
            setSelected(null);
            setMultiplier(1);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed bottom-0 left-1/2 z-50 max-h-[85vh] w-full max-w-[520px] -translate-x-1/2 overflow-y-auto rounded-t-3xl border-2 border-border bg-card p-4 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <Dialog.Title className="text-[20px] font-extrabold">
                {selected ? selected.name : "Add food"}
              </Dialog.Title>
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

            {selected && (
              <p className="mb-3 text-sm">
                {selected.preparation} · {selected.source}
                {selected.reference?.startsWith("https://") && (
                  <>
                    {" "}
                    ·{" "}
                    <a
                      href={selected.reference}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold underline"
                    >
                      Nutrient source
                    </a>
                  </>
                )}
              </p>
            )}
            {!selected ? (
              <>
                <div className="flex items-center gap-2 rounded-2xl border-2 border-border bg-muted px-3">
                  <Search className="h-5 w-5 text-faint" strokeWidth={3} />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Search foods"
                    placeholder="Search bread, wheat, rice, beer…"
                    className="min-h-[52px] w-full bg-transparent text-[16px] font-bold outline-none"
                  />
                </div>
                <p className="mt-2 text-sm">
                  {allResults.length} matches · {foods.length} foods with verified nutrition
                  {allResults.length > 50
                    ? ". Showing the first 50; type to narrow your search."
                    : "."}
                </p>
                <ul className="mt-3 flex flex-col gap-2">
                  {results.map((f) => (
                    <li key={f.id} className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelected(f);
                          setAmountUnit("g");
                        }}
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
                      {data.foodLibrary.find((food) => food.id === f.id) && (
                        <FoodActions food={data.foodLibrary.find((food) => food.id === f.id)!} />
                      )}
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
                    label={
                      amountUnit !== "g" && density !== null
                        ? volumeLabel(
                            (multiplier * 100) / density,
                            amountUnit === "fl_oz" ? "fl_oz" : "ml",
                          )
                        : `${Math.round(multiplier * 100 * 10) / 10} g`
                    }
                    tone="primary"
                  />
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <MacroMini label="Protein" left={selected.protein * multiplier} />
                    <MacroMini label="Carbs" left={selected.carbs * multiplier} />
                    <MacroMini label="Fat" left={selected.fat * multiplier} />
                  </div>
                </div>
                {(selected.alcoholPer100g ?? 0) > 0 && (
                  <p className="mt-3 rounded-xl bg-muted p-3 text-sm">
                    Beer and other alcoholic drinks can be logged. Calories include alcohol energy.
                    Alcohol can affect sleep and recovery; it does not replace food or protein.
                    Generic values vary by brand and strength.
                  </p>
                )}
                {density !== null && (
                  <label className="mt-3 block font-bold">
                    Measure
                    <select
                      aria-label="Measure"
                      className="mt-1 min-h-11 w-full rounded-xl border-2 border-border p-3"
                      value={amountUnit}
                      onChange={(e) => setAmountUnit(e.target.value as "g" | "ml" | "fl_oz")}
                    >
                      <option value="g">Grams</option>
                      <option value="ml">Millilitres</option>
                      <option value="fl_oz">US fluid ounces</option>
                    </select>
                  </label>
                )}
                <label className="mt-3 block font-bold">
                  {amountUnit === "ml"
                    ? "Amount in millilitres"
                    : amountUnit === "fl_oz"
                      ? "Amount in US fluid ounces"
                      : "Amount in grams"}
                  <input
                    className="mt-1 min-h-11 w-full rounded-xl border-2 border-border p-3"
                    type="number"
                    min="1"
                    max="10000"
                    step="any"
                    value={Number(
                      (
                        (multiplier * 100) /
                        (amountUnit !== "g"
                          ? (density ?? 1) * (amountUnit === "fl_oz" ? ML_PER_FL_OZ : 1)
                          : 1)
                      ).toFixed(3),
                    )}
                    onChange={(e) =>
                      setMultiplier(
                        (Number(e.target.value) *
                          (amountUnit !== "g"
                            ? (density ?? 1) * (amountUnit === "fl_oz" ? ML_PER_FL_OZ : 1)
                            : 1)) /
                          100,
                      )
                    }
                  />
                </label>
                {selected.servingGrams && selected.servingGrams !== 100 && (
                  <button
                    className="mt-3 min-h-11 rounded-xl border-2 border-border px-3 font-bold"
                    onClick={() => {
                      setAmountUnit("g");
                      setMultiplier(selected.servingGrams! / 100);
                    }}
                  >
                    Use {selected.servingName} ({selected.servingGrams} g)
                  </button>
                )}
                {density !== null && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[330, 500].map((ml) => (
                      <button
                        key={ml}
                        className="min-h-11 rounded-xl border-2 border-border px-3 font-bold"
                        onClick={() => {
                          setAmountUnit(preferred.volume === "fl_oz" ? "fl_oz" : "ml");
                          setMultiplier((ml * density) / 100);
                        }}
                      >
                        {volumeLabel(ml, preferred.volume)}
                      </button>
                    ))}
                    <p className="w-full text-xs">
                      Volume uses the source’s measured portion weight.
                    </p>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {[0.5, 1, 1.5, 2, 3].map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setAmountUnit("g");
                        setMultiplier(m);
                      }}
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
                <label className="mt-3 block font-bold">
                  Meal
                  <select
                    className="mt-1 min-h-11 w-full rounded-xl border-2 border-border p-3"
                    aria-label="Meal"
                    value={sheetMealId ?? "lunch"}
                    onChange={(e) => setSheetMealId(e.target.value)}
                  >
                    {meals.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </label>
                <ChunkyButton
                  full
                  className="mt-4"
                  disabled={pending || multiplier <= 0 || multiplier > 100}
                  onClick={() => {
                    if (sheetMealId) void addFood(sheetMealId, selected, multiplier);
                  }}
                >
                  {pending ? "Saving…" : "Add to meal"}
                </ChunkyButton>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
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

function SaveMeal({ meal }: { meal: Meal }) {
  const { act, pending } = useAppData();
  const [name, setName] = useState("");
  return (
    <form
      aria-label={`Save ${meal.title} as meal`}
      className="mt-3 flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (
          await act("/api/meals", {
            name,
            meal_type: meal.slot,
            items: meal.items.map((i) => ({
              food_id: i.foodId,
              grams: i.grams,
            })),
          })
        )
          setName("");
      }}
    >
      <input
        aria-label={`Name for saved ${meal.title}`}
        className="min-h-11 min-w-0 flex-1 rounded-xl border-2 border-border px-3"
        placeholder="Name this meal"
        maxLength={100}
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <ChunkyButton size="sm" disabled={pending}>
        Save meal
      </ChunkyButton>
    </form>
  );
}

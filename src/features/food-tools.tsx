import { FoodActions } from "./food-actions";
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
export function FoodTools() {
  const { data, act, pending } = useAppData();
  const [view, setView] = useState("meals");
  const [selected, setSelected] = useState(""),
    [templateId, setTemplateId] = useState("");
  const budget = useQuery({
    queryKey: ["budget", data.prices.length, data.foodLibrary.length],
    queryFn: () =>
      api<{
        items: ReturnType<typeof budgetSuggestions>;
        summary: ReturnType<typeof budgetSummary>;
      }>("/api/budget"),
  });
  const subs = useQuery({
    queryKey: ["substitutions", selected, data.prices.length],
    queryFn: () =>
      api<ReturnType<typeof substitutions>>(`/api/substitutions?foodId=${selected}&grams=100`),
    enabled: !!selected,
  });
  const template = data.mealTemplates.find((m) => m.id === templateId);
  return (
    <Card>
      <SectionTitle>Saved meals and food preferences</SectionTitle>
      <nav className="my-3 flex gap-2" aria-label="Food tools">
        {[
          ["meals", "Saved meals"],
          ["foods", "Custom foods"],
          ["costs", "Compare costs"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={view === key}
            className={`min-h-11 rounded-xl border-2 px-3 font-bold ${view === key ? "border-primary bg-primary-soft" : "border-border"}`}
            onClick={() => setView(key!)}
          >
            {label}
          </button>
        ))}
      </nav>
      {view === "foods" && (
        <div className="my-4 grid gap-2">
          {data.foodLibrary.map((food) => (
            <div
              className="flex items-center justify-between gap-3 rounded-xl border-2 border-border p-3"
              key={food.id}
            >
              <div>
                <p className="font-bold">{food.name}</p>
                <p className="text-sm">
                  {food.preparation_state} · {food.user_id ? "Custom food" : food.source}
                </p>
              </div>
              <FoodActions food={food} />
            </div>
          ))}
        </div>
      )}
      {view === "foods" && (
        <section aria-label="Add a food from a label or verified source">
          <h3 className="my-3 font-bold">Add a food from a label or verified source</h3>
          <p className="text-sm">
            Nutrients are per 100 g for the preparation state you enter. Unverified Malawi
            placeholders stay unavailable for logging.
          </p>
          <form
            className="mt-3 grid grid-cols-2 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void act("/api/foods", {
                name: String(f.get("name")),
                category: String(f.get("category")),
                preparation_state: String(f.get("preparation")),
                source_reference: String(f.get("source")),
                calories_per_100g: num(f, "calories"),
                protein_per_100g: num(f, "protein"),
                carbs_per_100g: num(f, "carbs"),
                fat_per_100g: num(f, "fat"),
                common_in_malawi: true,
              });
            }}
          >
            <label className="col-span-2">
              Name
              <input className={inputClass} name="name" maxLength={160} required />
            </label>
            <label>
              Category
              <select className={inputClass} name="category">
                {[
                  "staple",
                  "legume",
                  "meat",
                  "fish",
                  "dairy",
                  "vegetable",
                  "fruit",
                  "fat",
                  "snack",
                  "other",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Preparation
              <input className={inputClass} name="preparation" placeholder="e.g. boiled" required />
            </label>
            <NumberField name="calories" label="Calories / 100 g" max={1000} />
            <NumberField name="protein" label="Protein / 100 g" max={100} />
            <NumberField name="carbs" label="Carbs / 100 g" max={100} />
            <NumberField name="fat" label="Fat / 100 g" max={100} />
            <label className="col-span-2">
              Source or product label
              <input className={inputClass} name="source" required maxLength={500} />
            </label>
            <ChunkyButton disabled={pending}>Save food</ChunkyButton>
          </form>
        </section>
      )}
      {view === "meals" && (
        <section aria-label="Save or edit a reusable meal">
          <h3 className="my-3 font-bold">Save or edit a reusable meal</h3>
          <label>
            Saved meal
            <select
              className={inputClass}
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              <option value="">New meal</option>
              {data.mealTemplates.map((m) => (
                <option value={m.id} key={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <MealEditor key={templateId} template={template} />
          {data.mealTemplates.map((m) => (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2" key={m.id}>
              <span>{m.name}</span>
              <ChunkyButton
                size="sm"
                disabled={pending}
                onClick={() => {
                  void act("/api/meals/log", {
                    id: crypto.randomUUID(),
                    mealId: m.id,
                    date: data.date,
                    slot: m.meal_type,
                  });
                }}
              >
                Log meal
              </ChunkyButton>
            </div>
          ))}
        </section>
      )}
      {view === "costs" && (
        <section aria-label="Compare costs & substitutions">
          <h3 className="my-3 font-bold">Compare costs & substitutions</h3>
          {budget.data && (
            <p className="my-3 text-sm">
              Estimated from your latest prices: today{" "}
              {budget.data.summary.daily.knownCost.toLocaleString()} MWK (
              {budget.data.summary.daily.missingPrices} items unpriced); last 7 days{" "}
              {budget.data.summary.weekly.knownCost.toLocaleString()} MWK. Monthly estimate:{" "}
              {budget.data.summary.estimatedMonthlyCost === null
                ? "needs complete prices and logs"
                : `${budget.data.summary.estimatedMonthlyCost.toLocaleString()} MWK`}
              .
            </p>
          )}
          {budget.data && (
            <p className="my-2 text-sm">
              {budget.data.summary.substantiallyLoggedDays}/7 substantially logged, fully priced
              days. {budget.data.summary.monthlyReason}
            </p>
          )}
          {budget.isError && <p role="alert">Could not load prices.</p>}
          {!budget.data?.items.length && (
            <p className="text-sm">Record prices to compare food costs.</p>
          )}
          {budget.data?.items.map((b) => (
            <p className="my-2 text-sm" key={b.food.id}>
              {b.food.name}:{" "}
              {b.cost.per20gProtein === null
                ? "protein cost unavailable"
                : `${Math.round(b.cost.per20gProtein).toLocaleString()} MWK / 20 g protein`}{" "}
              ·{" "}
              {b.cost.per100Calories === null
                ? "calorie cost unavailable"
                : `${Math.round(b.cost.per100Calories).toLocaleString()} MWK / 100 kcal`}
            </p>
          ))}
          <label>
            Find a protein-aware replacement for 100 g
            <select
              className={inputClass}
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Choose food</option>
              {data.foods.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          {subs.isFetching && <p role="status">Finding substitutes…</p>}
          {selected && subs.data?.length === 0 && (
            <p>No suitable sourced substitute is available yet.</p>
          )}
          {subs.data?.map((s) => (
            <p key={s.food.id} className="my-2 text-sm">
              {s.grams} g {s.food.name} · {s.calories} kcal · {s.protein} g protein ·{" "}
              {s.cost === null ? "price unknown" : `${s.cost} MWK`}
            </p>
          ))}
        </section>
      )}
    </Card>
  );
}
function FoodSelect({ name }: { name: string }) {
  const { data } = useAppData();
  return (
    <label>
      Food
      <select className={inputClass} name={name} required>
        <option value="">Choose food</option>
        {data.foods.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
    </label>
  );
}
function MealEditor({
  template,
}: {
  template: ReturnType<typeof useAppData>["data"]["mealTemplates"][number] | undefined;
}) {
  const { act, pending } = useAppData();
  const [count, setCount] = useState(template?.items.length ?? 1);
  return (
    <form
      className="mt-3 grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget),
          items = Array.from({ length: count }, (_, i) => ({
            food_id: String(f.get(`food-${i}`)),
            grams: num(f, `grams-${i}`),
          }));
        void act(
          "/api/meals",
          {
            ...(template ? { id: template.id } : {}),
            name: String(f.get("name")),
            meal_type: String(f.get("slot")),
            items,
          },
          template ? "PATCH" : "POST",
        );
      }}
    >
      <label>
        Meal name
        <input
          className={inputClass}
          name="name"
          defaultValue={template?.name}
          maxLength={100}
          required
        />
      </label>
      <label>
        Meal slot
        <select
          className={inputClass}
          name="slot"
          defaultValue={template?.meal_type ?? "breakfast"}
        >
          {["breakfast", "lunch", "snack", "dinner"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      {Array.from({ length: count }, (_, i) => (
        <MealItem
          key={i}
          index={i}
          foodId={template?.items[i]?.food_id}
          grams={template?.items[i]?.grams}
        />
      ))}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="min-h-11 underline"
          disabled={count >= 30}
          onClick={() => setCount((n) => n + 1)}
        >
          Add ingredient
        </button>
        <button
          type="button"
          disabled={count <= 1}
          className="min-h-11 underline"
          onClick={() => setCount((n) => n - 1)}
        >
          Remove last
        </button>
        <ChunkyButton disabled={pending}>Save meal</ChunkyButton>
      </div>
    </form>
  );
}
function MealItem({
  index,
  foodId,
  grams,
}: {
  index: number;
  foodId: string | undefined;
  grams: number | undefined;
}) {
  const { data } = useAppData();
  return (
    <div className="grid grid-cols-2 gap-3">
      <label>
        Ingredient {index + 1}
        <select className={inputClass} name={`food-${index}`} defaultValue={foodId ?? ""} required>
          <option value="">Choose food</option>
          {data.foods.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
      <NumberField name={`grams-${index}`} label="Grams" value={grams ?? 100} min={1} />
    </div>
  );
}

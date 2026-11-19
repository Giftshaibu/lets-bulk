import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChunkyButton } from "@/components/kit";
import { useAppData } from "./app-data";
import { useAIAction } from "./use-ai-action";
import { inputClass } from "./setup";
import type { AIResult, MealCandidate } from "@/lib/ai/types";
import type { Output } from "@/lib/ai/schemas";
import { portionGrams } from "@/lib/ai/portions";
import { mealReady } from "@/lib/ai/meal-ranking";
import { matchesFoodQuery } from "@/lib/domain/food-catalog";
import { X } from "lucide-react";
import { MascotFeedback } from "./mascot-feedback";
import { helperMascot } from "@/lib/domain/mascot";
type Match = {
  id: string;
  name: string;
  preparation: string;
  servingName: string | null;
  servingGrams: number | null;
  servingVolumeMl: number | null;
};
type Draft = {
  id: string;
  query: string;
  foodId: string;
  quantity: string;
  unit: string;
  slot: string;
  skip: boolean;
  matches: Match[];
};
type Parsed = AIResult<
  Omit<Output<"parseFoodLog">, "items"> & {
    items: (Output<"parseFoodLog">["items"][number] & { matches: Match[] })[];
  }
>;
type Suggested = AIResult<Output<"suggestMeals">> & {
  candidates: MealCandidate[];
  message?: string;
};
const slots = ["breakfast", "lunch", "snack", "dinner"];
function match(food: ReturnType<typeof useAppData>["data"]["foodLibrary"][number]): Match {
  return {
    id: food.id,
    name: food.name,
    preparation: food.preparation_state,
    servingName: food.serving_name,
    servingGrams: food.serving_grams,
    servingVolumeMl: food.serving_volume_ml,
  };
}
export function FoodAIActions({ onManualSearch }: { onManualSearch: () => void }) {
  const { data } = useAppData();
  const [mode, setMode] = useState<"parse" | "meals" | null>(null),
    [text, setText] = useState(""),
    [date, setDate] = useState(data.date),
    [slot, setSlot] = useState("lunch"),
    [draft, setDraft] = useState<Draft[]>([]),
    [search, setSearch] = useState("");
  const context = data.preferences?.onboarding_context;
  const preferred =
    context &&
    typeof context === "object" &&
    !Array.isArray(context) &&
    Array.isArray(context["foods"])
      ? context["foods"].filter((f): f is string => typeof f === "string")
      : [];
  const [available, setAvailable] = useState<string[]>(() =>
    data.foodLibrary
      .filter(
        (f) =>
          mealReady(f) &&
          preferred.some((q) => matchesFoodQuery({ name: f.name, aliases: f.local_name }, q)),
      )
      .slice(0, 8)
      .map((f) => f.id),
  );
  const parse = useAIAction<Parsed>(),
    meals = useAIAction<Suggested>();
  const close = () => {
    parse.reset();
    meals.reset();
    setMode(null);
    setDraft([]);
  };
  function review(candidate: MealCandidate) {
    setDraft(
      candidate.items.map((i) => ({
        id: crypto.randomUUID(),
        query: i.name,
        foodId: i.foodId,
        quantity: String(i.grams),
        unit: "g",
        slot,
        skip: false,
        matches: [match(data.foodLibrary.find((f) => f.id === i.foodId)!)],
      })),
    );
  }
  return (
    <>
      <div className="my-3 flex flex-wrap gap-2">
        <ChunkyButton
          tone="neutral"
          size="sm"
          onClick={() => {
            parse.reset();
            meals.reset();
            setMode("parse");
            setDraft([]);
          }}
        >
          Describe what you ate
        </ChunkyButton>
        <ChunkyButton
          tone="neutral"
          size="sm"
          onClick={() => {
            parse.reset();
            meals.reset();
            setMode("meals");
            setDate(data.date);
            setDraft([]);
          }}
        >
          Suggest a meal
        </ChunkyButton>
      </div>
      <Dialog.Root
        open={mode !== null}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border-2 border-border bg-card p-4"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <Dialog.Title className="min-w-0 text-xl font-extrabold">
                {mode === "parse" ? "Describe what you ate" : "Suggest a meal"}
              </Dialog.Title>
              <Dialog.Close
                aria-label="Close"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Dialog.Close>
            </div>
            <MascotFeedback
              state={
                mode === "parse"
                  ? helperMascot(parse.pending, parse.error, !!parse.value)
                  : helperMascot(meals.pending, meals.error, !!meals.value)
              }
              label="Food helper encouragement"
            />
            {!draft.length && (
              <>
                <label className="mb-4 block font-bold">
                  Date
                  <input
                    className={`${inputClass} min-h-12 min-w-0 px-3`}
                    type="date"
                    disabled={mode === "meals"}
                    value={date}
                    max={data.date}
                    onChange={(e) => {
                      parse.reset();
                      setDate(e.target.value);
                    }}
                    required
                  />
                </label>
                <label className="mb-4 block font-bold">
                  Meal
                  <select
                    aria-label="Helper meal"
                    className={`${inputClass} field-select min-h-12 px-3`}
                    value={slot}
                    onChange={(e) => {
                      parse.reset();
                      meals.reset();
                      setSlot(e.target.value);
                    }}
                  >
                    {slots.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                {mode === "parse" && (
                  <form
                    className="grid gap-3"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const response = await parse.run("/api/ai/parse-food-log", { text, date });
                      if (response?.result.items.length)
                        setDraft(
                          response.result.items.map((i) => ({
                            id: crypto.randomUUID(),
                            query: i.query,
                            foodId: "",
                            quantity: i.quantity === null ? "" : String(i.quantity),
                            unit: i.unit ?? "",
                            slot: i.mealType ?? slot,
                            skip: false,
                            matches: i.matches,
                          })),
                        );
                    }}
                  >
                    <label className="font-bold">
                      Food description
                      <textarea
                        aria-label="Food description"
                        className={inputClass}
                        value={text}
                        onChange={(e) => {
                          parse.reset();
                          setText(e.target.value);
                        }}
                        required
                        maxLength={1000}
                        placeholder="I had nsima, beans and two eggs"
                      />
                    </label>
                    <p className="text-sm">
                      This creates a draft only. You choose the matching foods and confirm every
                      amount before anything is logged.
                    </p>
                    <ChunkyButton disabled={parse.pending}>
                      {parse.pending ? "Interpreting…" : "Interpret food description"}
                    </ChunkyButton>
                    {parse.error && <p role="status">{parse.error}</p>}
                    {parse.value?.result.clarificationNeeded && (
                      <p role="status">{parse.value.result.clarificationQuestion}</p>
                    )}
                    <button
                      type="button"
                      className="min-h-11 font-bold underline"
                      onClick={() => {
                        close();
                        onManualSearch();
                      }}
                    >
                      Search foods manually instead
                    </button>
                  </form>
                )}
                {mode === "meals" && (
                  <form
                    className="grid gap-3"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await meals.run("/api/ai/meal-suggestions", {
                        mealType: slot,
                        availableFoodIds: available,
                      });
                    }}
                  >
                    <p>
                      Confirm the foods you have ready to eat, including their preparation.
                      Suggestions use these foods and your saved preferences.
                    </p>
                    <label className="font-bold">
                      Find available foods
                      <input
                        className={inputClass}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search your foods"
                      />
                    </label>
                    <fieldset className="max-h-56 overflow-y-auto rounded-xl border-2 border-border p-3">
                      <legend className="font-bold">Available foods ({available.length})</legend>
                      {data.foodLibrary
                        .filter(
                          (f) =>
                            mealReady(f) &&
                            matchesFoodQuery({ name: f.name, aliases: f.local_name }, search),
                        )
                        .map((f) => (
                          <label
                            key={f.id}
                            className="flex min-h-11 items-start gap-2 py-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={available.includes(f.id)}
                              disabled={!available.includes(f.id) && available.length >= 50}
                              onChange={(e) => {
                                meals.reset();
                                setAvailable((old) =>
                                  e.target.checked
                                    ? [...old, f.id]
                                    : old.filter((id) => id !== f.id),
                                );
                              }}
                            />
                            <span>
                              {f.name} · {f.preparation_state}
                            </span>
                          </label>
                        ))}
                    </fieldset>
                    <ChunkyButton disabled={meals.pending || !available.length}>
                      {meals.pending ? "Preparing…" : "Suggest from these foods"}
                    </ChunkyButton>
                    {meals.error && <p role="status">{meals.error}</p>}
                    {meals.value?.message && <p role="status">{meals.value.message}</p>}
                    {meals.value?.result.suggestions.map((s) => {
                      const c = meals.value!.candidates.find((c) => c.id === s.candidateId)!;
                      return (
                        <section
                          key={s.candidateId}
                          className="rounded-xl border-2 border-border p-3"
                        >
                          <h3 className="font-bold">{s.title}</h3>
                          <p>{s.explanation}</p>
                          <ul className="my-2 list-disc pl-5">
                            {c.items.map((i) => (
                              <li key={i.foodId}>
                                {Math.round(i.grams * 10) / 10} g {i.name}
                              </li>
                            ))}
                          </ul>
                          <p className="font-bold">
                            {Math.round(c.kcal)} kcal · {Math.round(c.protein)} g protein ·{" "}
                            {c.cost === null ? "Price not known" : `${Math.round(c.cost)} MWK`}
                          </p>
                          <button
                            type="button"
                            className="mt-2 min-h-11 font-bold underline"
                            onClick={() => review(c)}
                          >
                            Review this meal
                          </button>
                        </section>
                      );
                    })}
                  </form>
                )}
              </>
            )}
            {draft.length > 0 && (
              <FoodDraft
                key={draft.map((d) => d.id).join()}
                initial={draft}
                date={date}
                onSaved={close}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
function FoodDraft({
  initial,
  date,
  onSaved,
}: {
  initial: Draft[];
  date: string;
  onSaved: () => void;
}) {
  const { data, act, pending } = useAppData();
  const [items, setItems] = useState(initial),
    [attempted, setAttempted] = useState(false),
    [error, setError] = useState("");
  const update = (id: string, change: Partial<Draft>) =>
    setItems((old) => old.map((i) => (i.id === id ? { ...i, ...change } : i)));
  const confirmed = items
    .filter((i) => !i.skip)
    .map((i) => {
      const f = i.matches.find((f) => f.id === i.foodId);
      return { item: i, food: f, grams: f ? portionGrams(f, Number(i.quantity), i.unit) : null };
    });
  const valid = confirmed.length > 0 && confirmed.every((i) => i.grams !== null);
  const totals = confirmed.reduce(
    (n, i) => {
      const f = data.foodLibrary.find((f) => f.id === i.item.foodId);
      return f && i.grams !== null
        ? {
            kcal: n.kcal + ((f.calories_per_100g ?? 0) * i.grams) / 100,
            protein: n.protein + ((f.protein_per_100g ?? 0) * i.grams) / 100,
          }
        : n;
    },
    { kcal: 0, protein: 0 },
  );
  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        setAttempted(true);
        setError("");
        if (
          await act("/api/nutrition/logs/batch", {
            date,
            items: confirmed.map(({ item, grams }) => ({
              id: item.id,
              foodId: item.foodId,
              grams: grams!,
              slot: item.slot,
            })),
          })
        )
          onSaved();
        else setError("Save wasn’t confirmed. Retry this same draft; retries are safe.");
      }}
    >
      <h3 className="font-bold">Confirm your food draft</h3>
      <p>
        No food has been logged by interpreting or suggesting it. Choose exact records and review
        the amounts below.
      </p>
      {items.map((i) => {
        const f = i.matches.find((f) => f.id === i.foodId),
          grams = f ? portionGrams(f, Number(i.quantity), i.unit) : null;
        return (
          <fieldset
            key={i.id}
            disabled={pending || attempted}
            className="grid gap-2 rounded-xl border-2 border-border p-3"
          >
            <legend className="font-bold">{i.query}</legend>
            <label>
              <input
                type="checkbox"
                checked={i.skip}
                onChange={(e) => update(i.id, { skip: e.target.checked })}
              />{" "}
              Skip this item — do not log it
            </label>
            {!i.skip && (
              <>
                <label>
                  Matching food
                  <select
                    aria-label={`Food match for ${i.query}`}
                    className={inputClass}
                    value={i.foodId}
                    onChange={(e) => update(i.id, { foodId: e.target.value })}
                  >
                    <option value="">Choose the exact food and preparation</option>
                    {i.matches.map((f) => (
                      <option value={f.id} key={f.id}>
                        {f.name} · {f.preparation}
                      </option>
                    ))}
                  </select>
                </label>
                {!i.matches.length && (
                  <p>
                    No verified match is available. Skip this item or use manual search; unknown
                    dishes cannot be given guessed nutrients.
                  </p>
                )}
                <label>
                  Quantity
                  <input
                    aria-label={`Quantity for ${i.query}`}
                    className={inputClass}
                    type="number"
                    min="0.001"
                    max="10000"
                    step="any"
                    value={i.quantity}
                    onChange={(e) => update(i.id, { quantity: e.target.value })}
                  />
                </label>
                <label>
                  Unit
                  <select
                    aria-label={`Unit for ${i.query}`}
                    className={inputClass}
                    value={i.unit}
                    onChange={(e) => update(i.id, { unit: e.target.value })}
                  >
                    <option value="">Choose a unit</option>
                    {["g", "kg", "ml", "cup", "piece", "tablespoon", "teaspoon"].map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                    {f?.servingGrams && (
                      <option value="portion">
                        Source portion: {f.servingName} ({f.servingGrams} g)
                      </option>
                    )}
                  </select>
                </label>
                {f && (
                  <p className="text-sm">
                    Source portion: {f.servingName} · {f.servingGrams} g.{" "}
                    {grams === null
                      ? "This unit/amount needs clarification; choose a compatible source portion or weighed grams."
                      : `Confirmed weight: ${Math.round(grams * 10) / 10} g.`}
                  </p>
                )}
                <label>
                  Meal
                  <select
                    aria-label={`Meal for ${i.query}`}
                    className={inputClass}
                    value={i.slot}
                    onChange={(e) => update(i.id, { slot: e.target.value })}
                  >
                    {slots.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </fieldset>
        );
      })}
      <p className="font-bold">
        Calculated from selected records: {Math.round(totals.kcal)} kcal ·{" "}
        {Math.round(totals.protein)} g protein.
      </p>
      <p>
        {items.filter((i) => i.skip).length} explicitly skipped; {confirmed.length} items selected
        for {date}.
      </p>
      {error && <p role="alert">{error}</p>}
      <ChunkyButton disabled={pending || !valid}>
        {pending ? "Saving…" : "Log confirmed foods"}
      </ChunkyButton>
    </form>
  );
}

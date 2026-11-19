import { ChoiceField } from "@/components/selection-screen";
import { DateField } from "@/components/date-field";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { SelectionScreen } from "@/components/selection-screen";
import { Mascot } from "@/components/mascot";
import { ArrowLeft, Send, Check } from "lucide-react";
import { ChunkyButton } from "@/components/kit";
import { useAppData } from "./app-data";
import { useAIAction } from "./use-ai-action";
import { inputClass } from "./setup";
import type { AIResult, MealCandidate } from "@/lib/ai/types";
import type { Output } from "@/lib/ai/schemas";
import { portionGrams } from "@/lib/ai/portions";
import { mealReady } from "@/lib/ai/meal-ranking";
import { matchesFoodQuery } from "@/lib/domain/food-catalog";
import { X, Sparkles, Utensils } from "lucide-react";
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
export function FoodAIActions({ onManualSearch: _onManualSearch }: { onManualSearch: () => void }) {
  return (
    <div className="my-4 grid gap-3">
      <Link
        to="/food-helper"
        search={{ mode: "parse" }}
        className="press flex min-h-16 items-center gap-3 rounded-2xl border-2 border-b-4 border-[#FFD699] bg-[#FFF6E8] p-4 font-black"
      >
        <Sparkles className="h-6 w-6 shrink-0 text-primary" />
        Describe what you ate
      </Link>
      <Link
        to="/food-helper"
        search={{ mode: "meals" }}
        className="press flex min-h-16 items-center gap-3 rounded-2xl border-2 border-b-4 border-[#E3CBB5] bg-[#FAF3EC] p-4 font-black"
      >
        <Utensils className="h-6 w-6 shrink-0 text-[#60351F]" />
        Suggest a meal
      </Link>
    </div>
  );
}
export function FoodHelper({ mode }: { mode: "parse" | "meals" }) {
  const { data } = useAppData();
  const [text, setText] = useState(""),
    [date, setDate] = useState(data.date),
    [slot, setSlot] = useState("lunch"),
    [draft, setDraft] = useState<Draft[]>([]),
    [stage, setStage] = useState<"chat" | "results" | "draft" | "added">("chat"),
    [picker, setPicker] = useState(false),
    [messages, setMessages] = useState<{ who: "you" | "chiuli"; text: string }[]>([]);
  const [available, setAvailable] = useState<string[]>([]);
  const parse = useAIAction<Parsed>(),
    meals = useAIAction<Suggested>();
  const working = parse.pending || meals.pending;
  async function send() {
    if (working) return;
    if (mode === "meals") {
      setStage("results");
      await meals.run("/api/ai/meal-suggestions", { mealType: slot, availableFoodIds: available });
      return;
    }
    if (!text.trim()) return;
    const sent = text.trim();
    setMessages((old) => [...old, { who: "you", text: sent }]);
    setText("");
    const response = await parse.run("/api/ai/parse-food-log", { text: sent, date });
    if (response?.result.items.length) {
      setDraft(
        response.result.items.map((i) => ({
          id: crypto.randomUUID(),
          query: i.query,
          foodId: "",
          quantity: i.quantity === null ? "" : String(i.quantity),
          unit: i.unit ?? "g",
          slot: i.mealType ?? slot,
          skip: false,
          matches: i.matches,
        })),
      );
      setMessages((old) => [
        ...old,
        {
          who: "chiuli",
          text: "I found a food draft. Choose the exact foods and amounts before adding.",
        },
      ]);
      setStage("draft");
    } else if (response)
      setMessages((old) => [
        ...old,
        {
          who: "chiuli",
          text:
            response.result.clarificationQuestion ||
            "I couldn’t match that yet. Try specific foods and weighed amounts, or search manually.",
        },
      ]);
  }
  function review(c: MealCandidate) {
    setDraft(
      c.items.map((i) => ({
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
    setStage("draft");
  }
  return (
    <main
      className="mx-auto flex h-dvh max-w-2xl flex-col bg-[#FFF9EE]"
      aria-label="Chiuli food chat"
    >
      <header className="shrink-0 border-b-2 bg-card p-4 pt-[max(16px,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          {stage === "chat" ? (
            <Link
              to="/food"
              aria-label="Back to Food"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          ) : (
            <button
              type="button"
              disabled={working}
              aria-label="Back to conversation"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted"
              onClick={() => setStage(stage === "draft" && mode === "meals" ? "results" : "chat")}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <Mascot
            variant="face"
            expression={working ? "thinking" : stage === "added" ? "happy" : "confident"}
            className="h-10 w-10 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-xs font-black text-primary">Chiuli food helper</p>
            <h1 className="text-lg font-black leading-tight">
              {stage === "results"
                ? "Your meal ideas"
                : stage === "draft"
                  ? "Review and add"
                  : stage === "added"
                    ? "Food added"
                    : mode === "parse"
                      ? "Describe what you ate"
                      : "Suggest a meal"}
            </h1>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <DateField
            aria-label="Food date"
            value={mode === "meals" ? data.date : date}
            max={data.date}
            disabled={mode === "meals" || working || stage === "draft"}
            onChange={(e) => {
              setDate(e.target.value);
              parse.reset();
              setDraft([]);
            }}
          />
          <span className="rounded-full bg-[#FAF3EC] px-3 py-2 text-xs font-bold capitalize">
            {slot}
            {mode === "meals" ? " · today’s remaining targets" : ""}
          </span>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        {stage === "chat" && (
          <div className="grid gap-4">
            <Bubble>
              {" "}
              {mode === "parse"
                ? "Tell me what you ate. I’ll help you choose the foods and check the amounts."
                : "Let’s build a meal from foods you have ready to eat. Choose your meal and ingredients below."}
            </Bubble>
            {draft.length > 0 && (
              <ChunkyButton type="button" tone="neutral" onClick={() => setStage("draft")}>
                Resume food draft
              </ChunkyButton>
            )}
            {messages.map((m, i) => (
              <Bubble key={i} from={m.who}>
                {m.text}
              </Bubble>
            ))}
            <ChoiceField
              aria-label="Helper meal"
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
            >
              {slots.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </ChoiceField>
            {mode === "meals" && (
              <>
                <button
                  type="button"
                  className="press min-h-16 rounded-2xl border-2 border-b-4 border-primary bg-card p-4 text-left font-black"
                  onClick={() => setPicker(true)}
                >
                  Choose available foods · {available.length} selected
                </button>
                <div className="flex flex-wrap gap-2">
                  {available.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAvailable((v) => v.filter((x) => x !== id))}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-sm font-bold"
                    >
                      <span className="min-w-0">
                        {data.foodLibrary.find((f) => f.id === id)?.name}
                      </span>
                      <X className="h-4 w-4 shrink-0" />
                    </button>
                  ))}
                </div>
              </>
            )}
            {working && <Bubble>Thinking through your foods…</Bubble>}
            {parse.error && (
              <p role="alert" className="rounded-2xl bg-danger-soft p-4 font-bold">
                {parse.error} Send your description again to retry.
              </p>
            )}
            <Link
              to="/food"
              className="inline-flex min-h-11 items-center gap-2 font-bold text-primary"
            >
              <Utensils className="h-5 w-5" />
              Search foods manually
            </Link>
            <p className="text-xs text-muted-foreground">
              Nothing is logged until you confirm a food and amount. When AI is unavailable, Chiuli
              uses its available matching tools.
            </p>
          </div>
        )}
        {stage === "results" && (
          <div className="grid gap-4">
            {meals.pending && <Bubble>Preparing your meal ideas…</Bubble>}
            {meals.error && (
              <p role="alert" className="rounded-2xl bg-danger-soft p-4 font-bold">
                {meals.error}
              </p>
            )}
            {meals.value?.message && <Bubble>{meals.value.message}</Bubble>}
            {meals.value?.result.suggestions.map((s) => {
              const c = meals.value!.candidates.find((c) => c.id === s.candidateId);
              if (!c) return null;
              return (
                <article
                  key={c.id}
                  className="rounded-3xl border-2 border-b-4 border-[#FFD699] bg-card p-4"
                >
                  <h2 className="text-xl font-black">{s.title}</h2>
                  <p className="my-2 text-sm">{s.explanation}</p>
                  <ul className="my-3 space-y-2 text-sm font-bold">
                    {c.items.map((i) => (
                      <li key={i.foodId}>
                        {Math.round(i.grams * 10) / 10} g · {i.name}
                      </li>
                    ))}
                  </ul>
                  <p className="mb-4 font-black text-primary">
                    {Math.round(c.kcal)} kcal · {Math.round(c.protein)} g protein
                  </p>
                  <ChunkyButton type="button" full onClick={() => review(c)}>
                    Review and add meal
                  </ChunkyButton>
                </article>
              );
            })}
            {!meals.pending && !meals.value?.result.suggestions.length && !meals.error && (
              <Bubble>No suitable meals yet. Choose more ready-to-eat foods and try again.</Bubble>
            )}
          </div>
        )}
        {draft.length > 0 && (
          <div hidden={stage !== "draft"}>
            <FoodDraft
              key={draft.map((d) => d.id).join()}
              initial={draft}
              date={date}
              onSaved={() => setStage("added")}
            />
          </div>
        )}
        {stage === "added" && (
          <div className="grid gap-4">
            <Mascot expression="happy" className="mx-auto h-36 w-36" />
            <Bubble>
              Your confirmed foods have been added. You can see them in your food log.
            </Bubble>
            <Link
              to="/food"
              className="press rounded-2xl border-2 border-b-4 border-primary-shadow bg-primary p-4 text-center font-black text-white"
            >
              View food log
            </Link>
          </div>
        )}
      </div>
      {stage === "chat" && (
        <form
          className="shrink-0 border-t-2 bg-card px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          {mode === "parse" ? (
            <div className="flex items-end gap-2">
              <textarea
                aria-label="Food description"
                placeholder="I had beans, rice and two eggs…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
                maxLength={1000}
                rows={2}
                className="min-w-0 flex-1 resize-none rounded-2xl border-2 border-border bg-background p-3 text-sm font-bold"
              />
              <ChunkyButton
                type="submit"
                aria-label="Send food description"
                disabled={working || !text.trim()}
                className="h-14 w-14 shrink-0 px-0"
              >
                <Send className="h-5 w-5" />
              </ChunkyButton>
            </div>
          ) : (
            <ChunkyButton type="submit" full disabled={working || !available.length}>
              {working ? "Preparing…" : "Suggest meals"}
              <Sparkles className="h-5 w-5" />
            </ChunkyButton>
          )}
        </form>
      )}
      {stage === "results" && (
        <footer className="shrink-0 border-t-2 bg-card p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <ChunkyButton
            type="button"
            full
            tone="neutral"
            disabled={working}
            onClick={() => setStage("chat")}
          >
            Change choices
          </ChunkyButton>
          {meals.error && (
            <ChunkyButton type="button" full className="mt-2" onClick={() => void send()}>
              Retry suggestions
            </ChunkyButton>
          )}
        </footer>
      )}
      <SelectionScreen
        title="Available foods"
        options={data.foodLibrary
          .filter(mealReady)
          .map((f) => ({ value: f.id, label: `${f.name} · ${f.preparation_state}` }))}
        value={available}
        multiple
        max={50}
        open={picker}
        onOpenChange={setPicker}
        onChange={setAvailable}
      />
    </main>
  );
}
function Bubble({
  children,
  from = "chiuli",
}: {
  children: React.ReactNode;
  from?: "you" | "chiuli";
}) {
  return (
    <div
      className={`max-w-[94%] rounded-3xl border-2 p-4 text-sm font-bold leading-relaxed ${from === "you" ? "ml-auto rounded-br-lg border-primary-shadow bg-primary text-white" : "mr-auto rounded-bl-lg border-[#E3CBB5] bg-card text-[#60351F]"}`}
    >
      <p className="mb-1 text-[11px] font-black uppercase opacity-70">
        {from === "you" ? "You" : "Chiuli"}
      </p>
      <div>{children}</div>
    </div>
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
    [added, setAdded] = useState<string[]>([]),
    [locked, setLocked] = useState<string[]>([]),
    [adding, setAdding] = useState<string[]>([]),
    [error, setError] = useState(""),
    [pick, setPick] = useState<string | null>(null);
  const update = (id: string, change: Partial<Draft>) =>
    setItems((old) => old.map((i) => (i.id === id ? { ...i, ...change } : i)));
  const grams = (i: Draft) => {
    const f = i.matches.find((f) => f.id === i.foodId);
    return f ? portionGrams(f, Number(i.quantity), i.unit) : null;
  };
  const remaining = items.filter((i) => !i.skip && !added.includes(i.id));
  async function add(rows: Draft[]) {
    if (pending || adding.length || !rows.length || rows.some((i) => grams(i) === null)) return;
    setAdding(rows.map((i) => i.id));
    setLocked((old) => [...new Set([...old, ...rows.map((i) => i.id)])]);
    setError("");
    try {
      if (
        await act("/api/nutrition/logs/batch", {
          date,
          items: rows.map((i) => ({ id: i.id, foodId: i.foodId, grams: grams(i)!, slot: i.slot })),
        })
      )
        setAdded((old) => [...new Set([...old, ...rows.map((i) => i.id)])]);
      else setError("Adding wasn’t confirmed. Retry the same item safely.");
    } finally {
      setAdding([]);
    }
  }
  return (
    <div className="grid gap-4">
      <Bubble>
        Check each food and amount. Add one item or add all remaining confirmed foods.
      </Bubble>
      {items.map((i) => {
        const done = added.includes(i.id),
          fixed = locked.includes(i.id),
          g = grams(i),
          selectedFood = data.foodLibrary.find((f) => f.id === i.foodId),
          sourcePortion = i.matches.find((f) => f.id === i.foodId);
        return (
          <article
            key={i.id}
            className="rounded-3xl border-2 border-b-4 border-[#FFD699] bg-card p-4"
          >
            <h2 className="mb-3 font-black">{i.query}</h2>
            {done ? (
              <p role="status" className="flex items-center gap-2 font-black text-success">
                <Check className="h-5 w-5" />
                Added
              </p>
            ) : (
              <>
                <fieldset disabled={pending || fixed} className="grid gap-3">
                  <ChoiceField
                    aria-label={`Food match for ${i.query}`}
                    value={i.foodId}
                    onChange={(e) => update(i.id, { foodId: e.target.value })}
                  >
                    <option value="">Choose exact food</option>
                    {i.matches.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} · {f.preparation}
                      </option>
                    ))}
                  </ChoiceField>
                  {!i.matches.length && (
                    <p className="text-sm">
                      No verified match yet. Find an exact food or skip this item.
                    </p>
                  )}
                  <button
                    type="button"
                    className="min-h-11 rounded-xl border-2 p-2 font-bold text-primary"
                    onClick={() => setPick(i.id)}
                  >
                    Find another food
                  </button>
                  <label className="text-sm font-bold">
                    Quantity
                    <input
                      aria-label={`Quantity for ${i.query}`}
                      type="number"
                      className={inputClass}
                      min="0.001"
                      max="10000"
                      step="any"
                      value={i.quantity}
                      onChange={(e) => update(i.id, { quantity: e.target.value })}
                    />
                  </label>
                  <ChoiceField
                    aria-label={`Unit for ${i.query}`}
                    value={i.unit}
                    onChange={(e) => update(i.id, { unit: e.target.value })}
                  >
                    <option value="">Choose unit</option>
                    {["g", "kg", "ml", "cup", "piece", "tablespoon", "teaspoon"].map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                    {i.matches.find((f) => f.id === i.foodId)?.servingGrams && (
                      <option value="portion">Source portion</option>
                    )}
                  </ChoiceField>
                  <ChoiceField
                    aria-label={`Meal for ${i.query}`}
                    value={i.slot}
                    onChange={(e) => update(i.id, { slot: e.target.value })}
                  >
                    {slots.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </ChoiceField>
                  <p className="text-sm font-bold">
                    {g === null
                      ? "Choose a compatible source portion or weighed grams."
                      : `${Math.round(g * 10) / 10} g confirmed`}
                  </p>
                  {sourcePortion && (
                    <p className="text-xs text-muted-foreground">
                      Source portion: {sourcePortion.servingName ?? "weighed grams"}
                      {sourcePortion.servingGrams ? ` · ${sourcePortion.servingGrams} g` : ""}
                    </p>
                  )}
                  {g !== null &&
                    selectedFood?.calories_per_100g != null &&
                    selectedFood.protein_per_100g != null && (
                      <p className="font-black text-primary">
                        {Math.round((selectedFood.calories_per_100g * g) / 100)} kcal ·{" "}
                        {Math.round((selectedFood.protein_per_100g * g) / 100)} g protein
                      </p>
                    )}
                </fieldset>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ChunkyButton
                    type="button"
                    size="sm"
                    disabled={pending || g === null || i.skip}
                    onClick={() => void add([i])}
                  >
                    {adding.includes(i.id) ? "Adding…" : "Add food"}
                  </ChunkyButton>
                  <ChunkyButton
                    type="button"
                    tone="neutral"
                    size="sm"
                    disabled={pending || fixed}
                    onClick={() => update(i.id, { skip: !i.skip })}
                  >
                    {i.skip ? "Include" : "Skip"}
                  </ChunkyButton>
                </div>
              </>
            )}
          </article>
        );
      })}
      {error && (
        <p role="alert" className="rounded-2xl bg-danger-soft p-4 font-bold">
          {error}
        </p>
      )}
      <div className="sticky bottom-0 grid gap-2 rounded-2xl border-2 bg-card p-3">
        {remaining.length > 0 && (
          <ChunkyButton
            type="button"
            full
            disabled={pending || remaining.some((i) => grams(i) === null)}
            onClick={() => void add(remaining)}
          >
            {adding.length ? "Adding…" : "Add all confirmed foods"}
          </ChunkyButton>
        )}
        {!remaining.length && (
          <ChunkyButton type="button" full onClick={onSaved}>
            Done · {added.length} added
          </ChunkyButton>
        )}
      </div>
      <SelectionScreen
        title="Find exact food"
        options={data.foodLibrary.map((f) => ({
          value: f.id,
          label: `${f.name} · ${f.preparation_state}`,
        }))}
        value={[]}
        open={pick !== null}
        onOpenChange={(v) => {
          if (!v) setPick(null);
        }}
        onChange={(v) => {
          const f = data.foodLibrary.find((f) => f.id === v[0]);
          if (f && pick) update(pick, { foodId: f.id, matches: [match(f)] });
        }}
      />
    </div>
  );
}

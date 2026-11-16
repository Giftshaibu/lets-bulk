import type { Snapshot } from "../repositories/app.repository";
import type { MealCandidate } from "./types";
type Food = Snapshot["foods"][number];
export function mealReady(food: Food) {
  const n = food.name.toLowerCase();
  if (
    Number(food.alcohol_g_per_100g ?? 0) > 0 ||
    /\b(beer|wine|cider|vodka|whisk[ey]+|rum)\b/i.test(food.name) ||
    food.calories_per_100g === null ||
    food.protein_per_100g === null ||
    food.carbs_per_100g === null ||
    food.fat_per_100g === null ||
    food.calories_per_100g <= 0 ||
    food.availability === "unavailable"
  )
    return false;
  if (/flour|germ, crude|bran, crude|milk, dry/.test(n)) return false;
  if (
    /^(wheat|cornmeal|millet|sorghum|barley|rice|pasta|noodles|beans|lentils|chickpeas|cowpeas|pigeon peas|soybeans|potatoes|sweet potato,|cassava|plantains|egg,|chicken|beef|pork|lamb|fish)/.test(
      n,
    ) &&
    !/cooked|boiled|roasted|baked|fried|scrambled|canned|toasted/.test(n)
  )
    return false;
  return true;
}
export function rankMeals(
  s: Snapshot,
  ids: string[],
  remaining: { kcal: number; protein: number },
): MealCandidate[] {
  if (remaining.kcal <= 0 && remaining.protein <= 0) return [];
  const diet = s.preferences?.diet_type,
    budget = s.preferences?.budget_mode === "budget";
  const prices = new Map(s.prices.map((p) => [p.food_id, p] as const).reverse());
  const eligible = s.foods.filter(
    (f) =>
      ids.includes(f.id) &&
      mealReady(f) &&
      !(
        diet === "vegan" &&
        (["meat", "fish", "dairy"].includes(f.category) || /\beggs?\b|\bmazira\b/i.test(f.name))
      ) &&
      !(diet === "vegetarian" && ["meat", "fish"].includes(f.category)),
  );
  const score = (c: MealCandidate) => [
    Math.abs(c.protein - remaining.protein) / Math.max(remaining.protein, 1),
    Math.abs(c.kcal - remaining.kcal) / Math.max(remaining.kcal, 100),
    budget ? (c.cost === null ? 1 : 0) : 0,
    budget ? (c.cost ?? 0) : 0,
  ];
  const compare = (a: MealCandidate, b: MealCandidate) => {
    const av = score(a),
      bv = score(b);
    for (let i = 0; i < av.length; i++) {
      const d = av[i]! - bv[i]!;
      if (Math.abs(d) > 0.000001) return d;
    }
    return JSON.stringify(a.items).localeCompare(JSON.stringify(b.items));
  };
  const make = (items: { food: Food; grams: number }[]): MealCandidate => ({
    id: "",
    foodIds: items.map((i) => i.food.id),
    items: items.map((i) => ({ foodId: i.food.id, name: i.food.name, grams: i.grams })),
    kcal: items.reduce((n, i) => n + (i.food.calories_per_100g! * i.grams) / 100, 0),
    protein: items.reduce((n, i) => n + (i.food.protein_per_100g! * i.grams) / 100, 0),
    cost: items.every((i) => prices.has(i.food.id))
      ? items.reduce((n, i) => {
          const p = prices.get(i.food.id)!;
          return n + (p.price_mwk / p.quantity) * i.grams;
        }, 0)
      : null,
  });
  const foods = eligible
    .sort((a, b) =>
      compare(
        make([{ food: a, grams: a.serving_grams ?? 100 }]),
        make([{ food: b, grams: b.serving_grams ?? 100 }]),
      ),
    )
    .slice(0, 8);
  const candidates: MealCandidate[] = [];
  function enumerate(start: number, items: { food: Food; grams: number }[]) {
    if (items.length && items.some((i) => !["fat", "snack", "beverage"].includes(i.food.category)))
      candidates.push(make(items));
    if (items.length === 3) return;
    for (let i = start; i < foods.length; i++)
      for (const multiple of [0.5, 1, 1.5, 2]) {
        const food = foods[i]!,
          grams = (food.serving_grams ?? 100) * multiple;
        if (grams >= 5 && grams <= 1000) enumerate(i + 1, [...items, { food, grams }]);
      }
  }
  enumerate(0, []);
  const seen = new Set<string>();
  return candidates
    .sort(compare)
    .filter((c) => {
      const key = [...c.foodIds].sort().join();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3)
    .map((c, i) => ({ ...c, id: `meal-${i}` }));
}

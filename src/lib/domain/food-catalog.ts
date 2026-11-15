import type { FoodItem } from "../data/types";
function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
export function matchesFoodQuery(
  food: { name: string; aliases?: string | null; category?: string },
  query: string,
) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const text = normalize(`${food.name} ${food.aliases ?? ""} ${food.category ?? ""}`);
  return terms.every((term) => text.includes(term));
}
export function searchFoods(foods: FoodItem[], query: string) {
  return foods.filter((food) => matchesFoodQuery(food, query));
}
export function gramsPerMl(food: Pick<FoodItem, "servingGrams" | "servingVolumeMl">) {
  return food.servingGrams &&
    food.servingVolumeMl &&
    food.servingGrams > 0 &&
    food.servingVolumeMl > 0
    ? food.servingGrams / food.servingVolumeMl
    : null;
}

export type PortionFood = {
  servingName: string | null;
  servingGrams: number | null;
  servingVolumeMl: number | null;
};
export function portionGrams(food: PortionFood, quantity: number, unit: string): number | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  let grams: number | null = null;
  const count = Number(food.servingName?.match(/^([\d.]+)/)?.[1] ?? 1);
  if (unit === "g") grams = quantity;
  else if (unit === "kg") grams = quantity * 1000;
  else if (unit === "ml" && food.servingGrams && food.servingVolumeMl)
    grams = (quantity * food.servingGrams) / food.servingVolumeMl;
  else if (unit === "portion" && food.servingGrams) grams = quantity * food.servingGrams;
  else if (food.servingGrams && count > 0) {
    const name = food.servingName?.toLowerCase() ?? "";
    const compatible =
      unit === "cup"
        ? /\bcup\b/.test(name)
        : unit === "tablespoon"
          ? /\b(tbsp|tablespoon)\b/.test(name)
          : unit === "teaspoon"
            ? /\b(tsp|teaspoon)\b/.test(name)
            : unit === "piece"
              ? /\b(piece|large|medium|small|slice|egg|pita|fruit)\b/.test(name)
              : false;
    if (compatible) grams = (quantity * food.servingGrams) / count;
  }
  return grams !== null && Number.isFinite(grams) && grams > 0 && grams <= 10000 ? grams : null;
}

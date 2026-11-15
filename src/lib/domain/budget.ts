export function foodCost(
  price: number,
  quantityGrams: number,
  food: { calories_per_100g: number | null; protein_per_100g: number | null },
) {
  const per100g = (price / quantityGrams) * 100;
  return {
    per100g,
    per100Calories: food.calories_per_100g ? (per100g / food.calories_per_100g) * 100 : null,
    per20gProtein: food.protein_per_100g ? (per100g / food.protein_per_100g) * 20 : null,
    proteinPerKwacha: food.protein_per_100g === null ? null : food.protein_per_100g / per100g,
    caloriesPerKwacha: food.calories_per_100g === null ? null : food.calories_per_100g / per100g,
    per1000Calories: food.calories_per_100g ? (per100g / food.calories_per_100g) * 1000 : null,
    per25gProtein: food.protein_per_100g ? (per100g / food.protein_per_100g) * 25 : null,
  };
}

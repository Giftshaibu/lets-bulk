import { substitutions } from "../src/lib/services/review.service";
import type { Snapshot } from "../src/lib/repositories/app.repository";
import { describe, it, expect } from "vitest";
import { searchFoods, gramsPerMl } from "../src/lib/domain/food-catalog";
import manifest from "../docs/FOOD_SOURCE_RECORDS.json";
import type { FoodItem } from "../src/lib/data/types";
const foods: FoodItem[] = manifest.map((row) => ({
  id: String(row.fdc_id),
  name: row.name,
  aliases: row.aliases,
  category: row.category,
  serving: "100 g",
  kcal: Number(row.values_per_100g["1008"]),
  protein: Number(row.values_per_100g["1003"]),
  carbs: Number(row.values_per_100g["1005"]),
  fat: Number(row.values_per_100g["1004"]),
  servingGrams: Number(row.serving_grams),
  servingVolumeMl: row.serving_volume_ml ? Number(row.serving_volume_ml) : null,
}));
describe("sourced food catalog", () => {
  it("contains 200 unique, licensed and traceable foods without missing or invented primary macros", () => {
    expect(manifest).toHaveLength(200);
    expect(new Set(manifest.map((row) => row.fdc_id)).size).toBe(200);
    for (const row of manifest) {
      expect(row.license).toBe("CC0-1.0");
      expect(row.reference).toContain(String(row.fdc_id));
      for (const nutrient of ["1008", "1003", "1005", "1004"] as const)
        expect(Number(row.values_per_100g[nutrient])).toBeGreaterThanOrEqual(0);
    }
  });
  it("finds wheat, bread and synonyms regardless of word order or hyphens", () => {
    expect(searchFoods(foods, "bread").length).toBeGreaterThanOrEqual(12);
    expect(searchFoods(foods, "wheat").length).toBeGreaterThan(20);
    expect(searchFoods(foods, "whole wheat bread").map((f) => f.id)).toContain("172688");
    expect(searchFoods(foods, "groundnuts").some((f) => f.name.startsWith("Peanuts"))).toBe(true);
    expect(searchFoods(foods, "nonsense food that does not exist")).toHaveLength(0);
  });
  it("logs regular beer using its measured source density and calorie value, including alcohol", () => {
    const beer = foods.find((f) => f.id === "168746")!;
    const density = gramsPerMl(beer)!;
    const grams = 500 * density;
    expect((beer.kcal * grams) / 100).toBeCloseTo(215.9, 0);
    expect(beer.kcal).toBe(43);
    expect(((beer.protein * 4 + beer.carbs * 4 + beer.fat * 9) * grams) / 100).toBeLessThan(
      (beer.kcal * grams) / 100 - 100,
    );
    expect(gramsPerMl({ servingGrams: 29, servingVolumeMl: null })).toBeNull();
  });
  it("uses a sourced slice weight for bread rather than guessing a slice size", () => {
    const bread = foods.find((f) => f.id === "174924")!;
    expect(bread.servingGrams).toBe(29);
    expect((bread.kcal * bread.servingGrams!) / 100).toBeCloseTo(77.14, 2);
  });
});

it("keeps alcoholic drinks out of nutritional food replacement suggestions", () => {
  const s = {
    foods: [
      {
        id: "bread",
        name: "Bread",
        category: "staple",
        calories_per_100g: 266,
        protein_per_100g: 8.85,
        alcohol_g_per_100g: 0,
      },
      {
        id: "beer",
        name: "Beer",
        category: "beverage",
        calories_per_100g: 43,
        protein_per_100g: 0.46,
        alcohol_g_per_100g: 3.9,
      },
      {
        id: "banana",
        name: "Banana",
        category: "fruit",
        calories_per_100g: 89,
        protein_per_100g: 1.09,
        alcohol_g_per_100g: 0,
      },
    ],
    prices: [],
    preferences: null,
  } as unknown as Snapshot;
  expect(substitutions(s, "bread", 100).map((r) => r.food.id)).toEqual(["banana"]);
});

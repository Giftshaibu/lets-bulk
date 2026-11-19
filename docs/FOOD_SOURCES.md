# Food reference sources

The app seeds **200 loggable USDA FoodData Central SR Legacy foods** under
**CC0-1.0**, with exact source IDs, source descriptions, publication dates,
preparation states, per-100-g nutrients, local search synonyms and available
source-measured portions. The ten old unverified local placeholders remain
non-loggable; personal foods and historical nutrient snapshots are preserved.

This is a practical general catalog, including:

| Group | Records | Examples |
| --- | ---: | --- |
| Grains and staples | 64 | White, wheat, whole-wheat and rye bread; chapati/roti; wheat/maize flours; pasta; oats; rice; potatoes |
| Legumes, nuts and seeds | 30 | Kidney/pinto/black/white beans, cowpeas, pigeon peas, chickpeas, lentils, groundnuts, peanut butter |
| Vegetables | 33 | Cabbage, spinach, pumpkin leaves, sweet-potato leaves, tomatoes, onions, okra |
| Fruit | 18 | Bananas, mango, papaya, pineapple, guava, avocado, apples, oranges |
| Meat, fish and eggs | 20 | Chicken, beef, pork, lamb, tilapia, sardines, tuna, eggs |
| Dairy and fats | 15 | Milk, milk powder, plain yogurt, cheese, butter, cooking oils |
| Snacks | 10 | Crackers, sugar, honey, jam, chocolate, biscuits, crisps, popcorn |
| Drinks | 10 | Regular/light beer, red/white wine, cola, juice, tea, coffee, water |

These are generic reference foods, **not brand labels or measurements of a
particular Malawian recipe**. Raw and cooked preparations have separate records.
Flour is not substituted for cooked nsima, and generic tilapia/sardines are not
relabeled chambo/usipa. Unknown recipes still need a verified source or a weighed
recipe built from suitable ingredients. The actual source description is shown
when choosing a food.

## Provenance and reproduction

Official archive:
https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip

USDA's licensing statement:
https://fdc.nal.usda.gov/api-guide

USDA states that FoodData Central data are public domain, not copyrighted, and
published under CC0-1.0; it requests source attribution. No permission is required.
The CSV publication date is **2019-04-01**. The archive filename reflects the
underlying SR Legacy release rather than overriding the publication date.

- `scripts/food-catalog.csv` is the reviewed selection of 200 exact source IDs,
  expected descriptions, aliases and preferred portion names.
- `scripts/import-usda.py` reads energy (1008), protein (1003), carbohydrate
  (1005), fat (1004), fiber (1079), and alcohol (1018) directly from source CSVs.
  Missing primary macros or invalid values fail the import. Zero is a valid value.
- `docs/FOOD_SOURCE_RECORDS.json` preserves the source values and full selected
  `food_portion.csv` rows, including gram weights. These are weighed source
  portions, not estimates invented for this app.
- The generated migration records the archive SHA256. Its MERGE is idempotent;
  it adds missing shared foods and updates source/portion metadata on existing
  references without changing their nutrient values, any personal foods, or logs.

```sh
python scripts/import-usda.py path/to/archive.zip work/expanded-food-seed.sql \
  --catalog scripts/food-catalog.csv
```

The generated SQL expects the current foods schema. Review its SQL/JSON, then
create a migration using `supabase migration new` before applying it.

## Bread and wheat

A plain white slice (FDC 174924) has a source portion of **29 g**, and whole-wheat
bread (FDC 172688) has a **32 g** slice. Slice size varies by loaf: select the
source portion or enter weighed grams. Search accepts aliases and word order,
so "whole wheat bread", "bread", "wheat", "flour", "pasta", and "chapati" work.

## Beer and alcohol

Beer is loggable. FDC **168746** is generic regular beer: **43 kcal / 100 g**,
including its measured **3.9 g alcohol / 100 g**. FDC **168749** is generic light
beer: **29 kcal / 100 g**, including **3.1 g alcohol / 100 g**. Calories come
directly from the source, not a 4/4/9 macro calculation that would omit alcohol.

The source gives regular beer **29.7 g per US fluid ounce** and light beer
**29.5 g per US fluid ounce**. The exact US conversion is
**1 fl oz = 29.5735295625 ml** (NIST SP 811, Appendix B.8):
https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b8

Millilitre amounts use that measured density; the app does not assume 1 ml = 1 g.
A 500 ml generic regular beer is therefore about **216 kcal**. Brand, recipe and
alcohol strength vary; a verified product label is preferable for an exact brand.
The app explains that alcohol can affect sleep/recovery and does not replace
food/protein. Alcoholic drinks are not suggested as nutritional food replacements.

## MAFOODS 2019 review

FAO's Africa INFOODS catalog links the official MAFOODS first edition:
https://dl.tufts.edu/downloads/g158bw806?filename=d217r336d.pdf

The Tufts record (https://dl.tufts.edu/concern/pdfs/d217r336d) reports Copyright Not
Evaluated, rather than an open reuse license. The MAFOODS compilation import is
still pending verification of reuse rights. This does not prevent the 200-food
CC0 fallback catalog from being seeded. USDA rows are never labeled MAFOODS.
See `PRODUCT_CORRECTIONS.md` for the source checksum and remaining Malawi-first
requirement.

## Soya pieces / chunks (dry)

An additional generic **dry textured vegetable protein** entry comes from
[USDA FNDDS food 2707451](https://fdc.nal.usda.gov/food-details/2707451/nutrients),
published 2024-10-31, CC0-1.0. Exact retrieved values and source portions are in
`docs/SOYA_SOURCE_RECORD.json`. This is separate from the 200 SR Legacy records.
Search aliases include soya pieces/chunks, soy pieces/chunks, TVP and TSP.
Log the dry weight before soaking; log added oil or sauces separately. The app
does not invent cooked yields, piece weights, or brand-specific nutrient values.

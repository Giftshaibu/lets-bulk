# Food reference sources

The common-food import uses USDA FoodData Central **SR Legacy** as a fallback.
These are reference foods, not laboratory measurements of Malawian recipes or
national average prices. Match the preparation state and weigh edible food in grams.

Official archive:
https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip

The CSV publication date is **2019-04-01**. The archive filename refers to the
underlying SR Legacy release; it does not override the publication dates in the
source records. Source rows and exact macro values are saved in
`FOOD_SOURCE_RECORDS.json`. The migration records the downloaded archive's SHA256.

| FDC ID | Reference preparation                                 |
| ------ | ----------------------------------------------------- |
| 173944 | Bananas, raw                                          |
| 168878 | White long-grain rice, enriched, cooked               |
| 173806 | Peanuts, dry-roasted, without salt                    |
| 175194 | Red kidney beans, boiled, without salt                |
| 172217 | Whole milk, 3.25% milkfat, without added vitamins A/D |
| 173424 | Whole egg, hard-boiled                                |
| 168484 | Sweet potato, boiled, without skin                    |

The importer reads energy (nutrient 1008), protein (1003), carbohydrate (1005), fat
(1004), and fiber (1079) directly from `food_nutrient.csv`, per 100 g. It refuses to
emit a food with missing primary nutrients. To reproduce the migration using a
fresh download of the archive:

```sh
python scripts/import-usda.py path/to/archive.zip work/usda-reference.sql
```

Review the generated SQL/JSON and the source record before creating a migration.
The importer never overwrites nutrients in previously logged meals. Nsima, usipa,
chambo and other unsupported preparations stay unverified until a suitable validated
composition source is supplied. User-entered label values are identified as personal
entries rather than USDA references.

## MAFOODS 2019 review

FAO's Africa INFOODS catalog links the official first-edition MAFOODS publication
at https://dl.tufts.edu/downloads/g158bw806?filename=d217r336d.pdf . The Tufts record
(https://dl.tufts.edu/concern/pdfs/d217r336d) reports Copyright Not Evaluated, not
an open reuse license. The numeric table import is pending verification of reuse
rights. See `PRODUCT_CORRECTIONS.md` for the source checksum and outstanding
Malawi-first requirement. Existing USDA rows are never labeled MAFOODS.

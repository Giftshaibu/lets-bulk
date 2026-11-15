"""Generate source-backed food seed SQL and provenance from USDA's SR Legacy CSV.

python scripts/import-usda.py ARCHIVE OUTPUT_SQL [--catalog scripts/food-catalog.csv]
Requires the current foods schema. Never updates historical nutrient snapshots.
"""
import argparse
import csv
import hashlib
import io
import json
import re
from decimal import Decimal
from pathlib import Path
from zipfile import ZipFile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("archive", type=Path)
parser.add_argument("output", type=Path)
parser.add_argument("--catalog", type=Path)
args = parser.parse_args()
quote = lambda value: "'" + str(value).replace("'", "''") + "'"
if args.catalog:
    with args.catalog.open() as handle:
        selection = list(csv.DictReader(handle))
else:
    selection = [dict(fdc_id=key, category=category, aliases="", preferred_portion="", common_in_malawi="true") for key, category in [(173944, "fruit"), (168878, "staple"), (173806, "legume"), (175194, "legume"), (172217, "dairy"), (173424, "other"), (168484, "staple")]]
selected = {int(row["fdc_id"]): row for row in selection}
assert len(selected) == len(selection), "Duplicate source IDs in catalog"
with ZipFile(args.archive) as archive:
    prefix = next(name for name in archive.namelist() if name.endswith("/food.csv")).removesuffix("food.csv")
    def rows(name):
        return csv.DictReader(io.TextIOWrapper(archive.open(prefix + name)))
    foods = {int(row["fdc_id"]): row for row in rows("food.csv") if int(row["fdc_id"]) in selected}
    nutrients = {key: {} for key in selected}
    for row in rows("food_nutrient.csv"):
        key, nutrient = int(row["fdc_id"]), int(row["nutrient_id"])
        if key in nutrients and nutrient in (1008, 1003, 1005, 1004, 1079, 1018):
            amount = Decimal(row["amount"])
            assert amount.is_finite() and amount >= 0, f"Invalid source value: {key}/{nutrient}"
            nutrients[key][nutrient] = str(amount)
    portions = {key: [] for key in selected}
    for row in rows("food_portion.csv"):
        key = int(row["fdc_id"])
        if key in portions and Decimal(row["gram_weight"]) > 0:
            portions[key].append(row)

manifest, values = [], []
for key, choice in selected.items():
    source, macros = foods[key], nutrients[key]
    assert all(nutrient in macros for nutrient in (1008, 1003, 1005, 1004)), f"Missing macros for {key}"
    assert not choice.get("source_name") or choice["source_name"] == source["description"], f"Source name changed: {key}"
    preferred = choice.get("preferred_portion", "")
    candidates = sorted(portions[key], key=lambda row: int(row["seq_num"]))
    portion = next((row for row in candidates if preferred and row["modifier"].lower().startswith(preferred.lower())), None)
    serving_name, serving_grams, serving_ml = "100 g", "100", None
    if portion:
        serving_name = f'{Decimal(portion["amount"]):g} {portion["modifier"]}'
        serving_grams = portion["gram_weight"]
        # Exact US fluid ounce conversion (NIST SP 811, Appendix B.8).
        # Only the explicitly named fl oz portion is converted, never arbitrary cups/cans.
        if portion["modifier"] == "fl oz":
            serving_ml = str(Decimal(portion["amount"]) * Decimal("29.5735295625"))
    name = source["description"]
    states = [state for state in ("raw", "cooked", "boiled", "baked", "roasted", "fried", "toasted", "dried", "dry", "canned", "drained", "without salt", "with salt", "commercially prepared", "prepared from recipe") if re.search(r"\b" + state + r"\b", name, re.I)]
    preparation = ", ".join(states) or ("ready to drink" if choice["category"] == "beverage" else "as described in source")
    reference = f"https://fdc.nal.usda.gov/food-details/{key}/nutrients"
    common = choice["common_in_malawi"] == "true"
    row = [quote(name), quote(choice["aliases"]) if choice["aliases"] else "null", quote(choice["category"]), quote(preparation), macros[1008], macros[1003], macros[1005], macros[1004], macros.get(1079, "null"), quote(serving_name), serving_grams, "'USDA SR Legacy'", quote(reference), source["publication_date"][:4], str(common).lower(), macros.get(1018, "null"), serving_ml or "null", "'CC0-1.0'"]
    values.append("(" + ",".join(row) + ")")
    manifest.append({"fdc_id": key, "name": name, "category": choice["category"], "aliases": choice["aliases"], "published": source["publication_date"], "values_per_100g": macros, "reference": reference, "license": "CC0-1.0", "portion": portion, "serving_name": serving_name, "serving_grams": serving_grams, "serving_volume_ml": serving_ml})
columns = "name,local_name,category,preparation_state,calories_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,fiber_per_100g,serving_name,serving_grams,source,source_reference,source_year,common_in_malawi,alcohol_g_per_100g,serving_volume_ml,source_license".split(",")
sql = "-- USDA FoodData Central SR Legacy, CC0-1.0; direct per-100-g source values.\n"
sql += f"-- Archive SHA256: {hashlib.sha256(args.archive.read_bytes()).hexdigest()}\n"
sql += "-- Idempotent: existing reference nutrients and all personal foods/logs stay intact.\n"
sql += "merge into public.foods as f using (values\n" + ",\n".join(values) + ") as s(" + ",".join(columns) + ")\n"
sql += "on f.user_id is null and f.source_reference=s.source_reference\n"
sql += "when matched then update set local_name=s.local_name,serving_name=s.serving_name,serving_grams=s.serving_grams,serving_volume_ml=s.serving_volume_ml,alcohol_g_per_100g=s.alcohol_g_per_100g,source_license=s.source_license\n"
sql += "when not matched then insert (" + ",".join(columns) + ") values (" + ",".join("s." + column for column in columns) + ");\n"
args.output.write_text(sql)
args.output.with_suffix(".json").write_text(json.dumps(manifest, indent=2) + "\n")
print(f"Generated {len(manifest)} source-backed foods with provenance and portions")

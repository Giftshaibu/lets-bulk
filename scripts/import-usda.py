"""Generate a reviewable food-data migration from the official SR Legacy CSV archive.
Download https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
Usage: python scripts/import-usda.py ARCHIVE OUTPUT_SQL
No nutrient values are embedded in this script; all values come from source CSV rows.
"""
import csv,io,json,sys,hashlib
from pathlib import Path
from zipfile import ZipFile
selected={173944:('fruit','raw'),168878:('staple','cooked'),173806:('legume','dry-roasted, without salt'),175194:('legume','boiled, without salt'),172217:('dairy','whole, 3.25% milkfat'),173424:('other','hard-boiled'),168484:('staple','boiled, without skin')}
archive,output=map(Path,sys.argv[1:3]);quote=lambda s:"'"+str(s).replace("'","''")+"'"
with ZipFile(archive) as z:
 prefix=next(n for n in z.namelist() if n.endswith('/food.csv')).removesuffix('food.csv')
 def rows(name):return csv.DictReader(io.TextIOWrapper(z.open(prefix+name)))
 foods={int(r['fdc_id']):r for r in rows('food.csv') if int(r['fdc_id']) in selected}
 values={key:{} for key in selected}
 for r in rows('food_nutrient.csv'):
  key=int(r['fdc_id']); nutrient=int(r['nutrient_id'])
  if key in values and nutrient in (1008,1003,1005,1004,1079):values[key][nutrient]=r['amount']
 sql=['-- Source: USDA FoodData Central SR Legacy CSV; publication dates and per-100g nutrients read from the archive.',f'-- Archive SHA256: {hashlib.sha256(archive.read_bytes()).hexdigest()}']
 manifest=[]
 for key,(category,state) in selected.items():
  row=foods[key];v=values[key]
  assert all(v.get(n) for n in [1008,1003,1005,1004]),f'Missing macros for {key}'
  ref=f'https://fdc.nal.usda.gov/food-details/{key}/nutrients'
  fields=[quote(row['description']),quote(category),quote(state),v[1008],v[1003],v[1005],v[1004],v.get(1079,'null'),"'USDA SR Legacy'",quote(ref),row['publication_date'][:4]]
  sql.append('insert into public.foods(name,category,preparation_state,calories_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,fiber_per_100g,source,source_reference,source_year,common_in_malawi) select '+','.join(fields)+',true where not exists(select 1 from public.foods where user_id is null and source_reference='+quote(ref)+');')
  manifest.append({'fdc_id':key,'name':row['description'],'published':row['publication_date'],'values_per_100g':v,'reference':ref})
 output.write_text('\n'.join(sql)+'\n')
 output.with_suffix('.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print(f'Generated {len(manifest)} sourced foods')

-- USDA FoodData Central FNDDS 2021-2023, food 2707451 (published 2024-10-31), CC0-1.0.
-- Dry TVP reference, not raw soybeans or a cooked recipe. Nutrients per 100 g dry.
-- Preserve personal foods, existing reference nutrients, and all historical logs.
merge into public.foods as f using (values
('Soya pieces / chunks (textured vegetable protein), dry','soya pieces soy pieces soya chunks soy chunks textured soy protein textured soya protein TVP TSP','legume','dry; weigh before soaking; add oil and sauces separately',366,51.1,32.9,3.33,17.5,'100 g dry',100,'USDA FNDDS','https://fdc.nal.usda.gov/food-details/2707451/nutrients',2024,true,'CC0-1.0')
) as s(name,local_name,category,preparation_state,calories_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,fiber_per_100g,serving_name,serving_grams,source,source_reference,source_year,common_in_malawi,source_license)
on f.user_id is null and f.source_reference=s.source_reference
when matched then update set local_name=s.local_name
when not matched then insert (name,local_name,category,preparation_state,calories_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,fiber_per_100g,serving_name,serving_grams,source,source_reference,source_year,common_in_malawi,source_license)
values(s.name,s.local_name,s.category,s.preparation_state,s.calories_per_100g,s.protein_per_100g,s.carbs_per_100g,s.fat_per_100g,s.fiber_per_100g,s.serving_name,s.serving_grams,s.source,s.source_reference,s.source_year,s.common_in_malawi,s.source_license);

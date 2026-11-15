create function public.log_meal(p_id uuid,p_meal uuid,p_date date,p_slot text) returns uuid language plpgsql security invoker set search_path='' as $$
declare item record; begin
 perform 1 from public.meals where id=p_meal;
 if not found then raise exception 'P0002'; end if;
 if exists(select 1 from public.nutrition_logs where id=p_id) then return p_id; end if;
 if not exists(select 1 from public.meal_items where meal_id=p_meal) then raise exception 'INVALID_INPUT'; end if;
 insert into public.nutrition_logs(id,user_id,date,meal_type,meal_id) values(p_id,auth.uid(),p_date,p_slot,p_meal);
 for item in select mi.grams,f.* from public.meal_items mi join public.foods f on f.id=mi.food_id where mi.meal_id=p_meal loop
 if item.calories_per_100g is null or item.protein_per_100g is null or item.carbs_per_100g is null or item.fat_per_100g is null then raise exception 'INVALID_INPUT'; end if;
 insert into public.nutrition_log_items(user_id,nutrition_log_id,food_id,grams,name,calories,protein_g,carbs_g,fat_g)
 values(auth.uid(),p_id,item.id,item.grams,item.name,item.calories_per_100g*item.grams/100,item.protein_per_100g*item.grams/100,item.carbs_per_100g*item.grams/100,item.fat_per_100g*item.grams/100);
 end loop; return p_id;
end $$;
create function public.initial_exercise_load(p_id uuid,p_weight numeric) returns void language plpgsql security invoker set search_path='' as $$
declare p public.workout_template_exercises; begin
 select * into strict p from public.workout_template_exercises where id=p_id for update;
 if exists(select 1 from public.workout_sessions where workout_template_id=p.workout_template_id) then raise exception 'CONFLICT'; end if;
 update public.workout_template_exercises set planned_weight_kg=p_weight where id=p_id;
end $$;
revoke all on function public.log_meal(uuid,uuid,date,text),public.initial_exercise_load(uuid,numeric) from public,anon;
grant execute on function public.log_meal(uuid,uuid,date,text),public.initial_exercise_load(uuid,numeric) to authenticated;

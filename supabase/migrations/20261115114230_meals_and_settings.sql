create function public.save_meal(p_id uuid,p_name text,p_slot text,p_items jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
begin
 insert into public.meals(id,user_id,name,meal_type) values(p_id,auth.uid(),p_name,p_slot)
 on conflict(id) do update set name=excluded.name,meal_type=excluded.meal_type;
 delete from public.meal_items where meal_id=p_id;
 insert into public.meal_items(user_id,meal_id,food_id,grams,sort_order)
 select auth.uid(),p_id,(item->>'food_id')::uuid,(item->>'grams')::numeric,ord::integer from jsonb_array_elements(p_items) with ordinality as x(item,ord);
 return p_id;
end $$;
create function public.save_settings(p_settings jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare t record; days integer[]; i integer:=1; pg public.training_programs; np uuid; wk record; nw uuid; nt uuid; wt record; begin
 update public.profiles set first_name=p_settings->>'first_name',water_target_ml=(p_settings->>'water_target_ml')::integer,updated_at=now() where user_id=auth.uid();
 update public.user_preferences set diet_type=p_settings->>'diet_type',budget_mode=p_settings->>'budget_mode' where user_id=auth.uid();
 select array_agg(value::integer order by ord) into days from jsonb_array_elements_text(p_settings->'days') with ordinality as x(value,ord);
 if array_length(days,1)<>4 then raise exception 'INVALID_INPUT'; end if;
 select * into strict pg from public.training_programs where user_id=auth.uid() and effective_to is null for update;
 -- A schedule change is a new version, so previous workouts retain their plan.
 if days=(select array_agg(day_of_week order by sort_order) from public.workout_templates where program_week_id in(select id from public.program_weeks where training_program_id=pg.id)) then return; end if;
 update public.training_programs set effective_to=greatest(effective_from,(now() at time zone 'Africa/Blantyre')::date) where id=pg.id;
 insert into public.training_programs(user_id,version,name,phase,effective_from) values(auth.uid(),pg.version+1,pg.name,pg.phase,(now() at time zone 'Africa/Blantyre')::date) returning id into np;
 for wk in select * from public.program_weeks where training_program_id=pg.id loop
 insert into public.program_weeks(user_id,training_program_id,week_number,phase_week,goal) values(auth.uid(),np,wk.week_number,wk.phase_week,wk.goal) returning id into nw;
 for wt in select * from public.workout_templates where program_week_id=wk.id order by sort_order loop
 insert into public.workout_templates(user_id,program_week_id,name,day_of_week,sort_order,estimated_minutes) values(auth.uid(),nw,wt.name,days[i],wt.sort_order,wt.estimated_minutes) returning id into nt;
 insert into public.workout_template_exercises(user_id,workout_template_id,exercise_id,sort_order,sets,rep_min,rep_max,target_rir,rest_seconds,planned_weight_kg)
 select auth.uid(),nt,exercise_id,sort_order,sets,rep_min,rep_max,target_rir,rest_seconds,planned_weight_kg from public.workout_template_exercises where workout_template_id=wt.id;
 i:=i+1;end loop;end loop;
end $$;
revoke all on function public.save_meal(uuid,text,text,jsonb),public.save_settings(jsonb) from public,anon;
grant execute on function public.save_meal(uuid,text,text,jsonb),public.save_settings(jsonb) to authenticated;
-- Supabase's pre-existing DDL event trigger is not an application RPC.
do $$ begin
 if to_regprocedure('public.rls_auto_enable()') is not null then
   revoke execute on function public.rls_auto_enable() from public,anon,authenticated;
 end if;
end $$;

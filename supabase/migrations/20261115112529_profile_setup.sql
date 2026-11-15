create function public.initialize_profile(p_profile jsonb,p_targets jsonb,p_equipment jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare pg uuid; wk uuid; wt uuid; d integer; n text; grp text; ex record; ord integer; begin
 if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,1));
 if exists(select 1 from public.profiles where user_id=auth.uid()) then return; end if;
 insert into public.profiles(user_id,first_name,height_cm,starting_weight_kg,goal_weight_kg,start_date,training_days_per_week)
 values(auth.uid(),p_profile->>'name',(p_profile->>'height')::numeric,(p_profile->>'weight')::numeric,(p_profile->>'goal')::numeric,(now() at time zone 'Africa/Blantyre')::date,4);
 insert into public.user_preferences(user_id) values(auth.uid());
 insert into public.nutrition_targets(user_id,version,effective_from,calories_target,protein_target_g,carbs_target_g,fat_target_g,reason)
 values(auth.uid(),1,(now() at time zone 'Africa/Blantyre')::date,(p_targets->>'kcal')::integer,(p_targets->>'protein')::integer,(p_targets->>'carbs')::integer,(p_targets->>'fat')::integer,'User-confirmed initial targets');
 insert into public.available_equipment(user_id,equipment_type) select auth.uid(),value from jsonb_array_elements_text(p_equipment);
 insert into public.training_programs(user_id,version,name,effective_from) values(auth.uid(),1,'Upper / Lower',(now() at time zone 'Africa/Blantyre')::date) returning id into pg;
 insert into public.program_weeks(user_id,training_program_id,week_number) values(auth.uid(),pg,1) returning id into wk;
 foreach d in array array[1,2,4,5] loop
 n:=case d when 1 then 'Upper A' when 2 then 'Lower A' when 4 then 'Upper B' else 'Lower B' end;
 insert into public.workout_templates(user_id,program_week_id,name,day_of_week,sort_order) values(auth.uid(),wk,n,d,d) returning id into wt;
 ord:=0;
 for grp in select unnest(case when d in (1,4) then array['Chest','Back','Shoulders','Biceps','Triceps'] else array['Quads','Hamstrings','Glutes','Calves','Core'] end) loop
 select e.* into ex from public.exercises e where e.primary_muscle=grp and e.equipment in(select value from jsonb_array_elements_text(p_equipment)) and e.slug<>'plank'
 order by case when e.equipment='bodyweight' then 1 else 0 end,e.slug limit 1;
 if ex.id is not null then
 insert into public.workout_template_exercises(user_id,workout_template_id,exercise_id,sort_order,sets,rep_min,rep_max,target_rir,rest_seconds)
 values(auth.uid(),wt,ex.id,ord,3,8,12,2,120); ord:=ord+1;
 end if; end loop; end loop;
 -- No fabricated equipment increments. The user supplies actual gym load options later.
end $$;
revoke all on function public.initialize_profile(jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.initialize_profile(jsonb,jsonb,jsonb) to authenticated;

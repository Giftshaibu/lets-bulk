create or replace function public.save_settings(p_settings jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare days integer[]; previous_days integer[]; old public.training_programs; current_profile public.profiles; count_days integer; np uuid; nw uuid; nt uuid; source_ids uuid[]; wt public.workout_templates; i integer; selected_equipment jsonb; policy jsonb; desired_name text; begin
 select * into strict current_profile from public.profiles where user_id=auth.uid() for update;
 select array_agg(value::integer order by ord) into days from jsonb_array_elements_text(p_settings->'days') with ordinality as x(value,ord);
 count_days:=array_length(days,1);
 if count_days is null or count_days<1 or count_days>7 or (select count(distinct d) from unnest(days) d)<>count_days or exists(select 1 from unnest(days) d where d<0 or d>6) then raise exception 'INVALID_INPUT';end if;
 policy:=coalesce(p_settings->'completion_policy',(select completion_policy from public.user_preferences where user_id=auth.uid()));
 if policy is null or exists(select 1 from unnest(array['weight','nutrition','workout','recovery','water']) key where jsonb_typeof(policy->key) is distinct from 'boolean') or not ((policy->>'weight')::boolean or (policy->>'nutrition')::boolean or (policy->>'recovery')::boolean or (policy->>'water')::boolean) then raise exception 'INVALID_INPUT';end if;
 update public.profiles set first_name=p_settings->>'first_name',water_target_ml=(p_settings->>'water_target_ml')::integer,training_days_per_week=count_days,
 height_cm=coalesce((p_settings->>'height_cm')::numeric,height_cm),goal_weight_kg=coalesce((p_settings->>'goal_weight_kg')::numeric,goal_weight_kg),
 target_date=case when p_settings?'target_date' then nullif(p_settings->>'target_date','')::date else target_date end,
 training_experience=coalesce(p_settings->>'training_experience',training_experience),updated_at=now() where user_id=auth.uid();
 update public.user_preferences set diet_type=p_settings->>'diet_type',budget_mode=p_settings->>'budget_mode',completion_policy=policy where user_id=auth.uid();
 if p_settings?'equipment' then
 selected_equipment:=p_settings->'equipment';
 if jsonb_array_length(selected_equipment)<1 or not selected_equipment?'bodyweight' or exists(select 1 from jsonb_array_elements_text(selected_equipment) e where e not in ('bodyweight','barbell','dumbbell','cable','machine','pullup_bar','bench','incline_bench','squat_rack','lat_pulldown','seated_row','leg_press','leg_extension','leg_curl','chest_press')) then raise exception 'INVALID_INPUT';end if;
 update public.available_equipment set is_available=false where user_id=auth.uid();
 insert into public.available_equipment(user_id,equipment_type,is_available) select auth.uid(),value,true from jsonb_array_elements_text(selected_equipment)
 on conflict(user_id,equipment_type) do update set is_available=true;
 end if;
 select * into strict old from public.training_programs where user_id=auth.uid() and effective_to is null for update;
 select array_agg(saved.day_of_week order by saved.sort_order),array_agg(saved.id order by saved.sort_order) into previous_days,source_ids from public.workout_templates saved join public.program_weeks w on w.id=saved.program_week_id where w.training_program_id=old.id;
 if days is distinct from previous_days then
 if old.phase='deload' then raise exception 'DELOAD_ACTIVE';end if;
 if exists(select 1 from public.workout_sessions where user_id=auth.uid() and status='in_progress') then raise exception 'WORKOUT_IN_PROGRESS';end if;
 update public.training_programs set effective_to=greatest(effective_from,(now() at time zone 'Africa/Blantyre')::date) where id=old.id;
 insert into public.training_programs(user_id,version,name,phase,effective_from) values(auth.uid(),old.version+1,old.name,'base',(now() at time zone 'Africa/Blantyre')::date) returning id into np;
 insert into public.program_weeks(user_id,training_program_id,week_number) values(auth.uid(),np,1) returning id into nw;
 for i in 1..count_days loop
 desired_name:=case when old.name='Full body' then 'Full body '||i::text else case when mod(i,2)=1 then 'Upper' else 'Lower' end||' '||chr(65+(i-1)/2) end;
 select saved.* into wt from public.workout_templates saved join public.program_weeks sw on sw.id=saved.program_week_id join public.training_programs sp on sp.id=sw.training_program_id where sp.user_id=auth.uid() and sp.id<>np and sp.phase<>'deload' and saved.name=desired_name order by sp.version desc limit 1;
 if wt.id is null then
 select saved.* into strict wt from public.workout_templates saved join public.program_weeks sw on sw.id=saved.program_week_id join public.training_programs sp on sp.id=sw.training_program_id where sp.user_id=auth.uid() and sp.id<>np and sp.phase<>'deload' and split_part(saved.name,' ',1)=split_part(desired_name,' ',1) order by sp.version desc,saved.sort_order limit 1;
 end if;
 insert into public.workout_templates(user_id,program_week_id,name,day_of_week,sort_order,estimated_minutes,lineage_id)
 values(auth.uid(),nw,desired_name,days[i],i,wt.estimated_minutes,case when wt.name=desired_name then wt.lineage_id else gen_random_uuid() end) returning id into nt;
 insert into public.workout_template_exercises(user_id,workout_template_id,exercise_id,sort_order,sets,rep_min,rep_max,target_rir,rest_seconds,planned_weight_kg,lineage_id)
 select auth.uid(),nt,exercise_id,sort_order,sets,rep_min,rep_max,target_rir,rest_seconds,planned_weight_kg,case when wt.name=desired_name then lineage_id else gen_random_uuid() end from public.workout_template_exercises where workout_template_id=wt.id;
 end loop;
 update public.recommendations set status='expired' where user_id=auth.uid() and status='pending' and payload->>'programId'=old.id::text;
 end if;
 perform public.refresh_completion((now() at time zone 'Africa/Blantyre')::date);
end $$;

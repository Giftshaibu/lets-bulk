alter table public.workout_templates add column lineage_id uuid not null default gen_random_uuid();
alter table public.workout_template_exercises add column lineage_id uuid not null default gen_random_uuid();
-- Reconcile existing versions into the same workout/exercise history streams.
with roots as (select t.id,first_value(t.id) over(partition by t.user_id,t.name order by p.version,t.id) root from public.workout_templates t join public.program_weeks w on w.id=t.program_week_id join public.training_programs p on p.id=w.training_program_id)
update public.workout_templates t set lineage_id=r.root from roots r where r.id=t.id;
with roots as (select e.id,first_value(e.id) over(partition by e.user_id,t.lineage_id,e.exercise_id order by p.version,e.sort_order,e.id) root from public.workout_template_exercises e join public.workout_templates t on t.id=e.workout_template_id join public.program_weeks w on w.id=t.program_week_id join public.training_programs p on p.id=w.training_program_id)
update public.workout_template_exercises e set lineage_id=r.root from roots r where r.id=e.id;
alter table public.training_programs add column resume_program_id uuid;
alter table public.training_programs add column planned_until date;
alter table public.training_programs add foreign key(resume_program_id,user_id) references public.training_programs(id,user_id);
create index program_resume_fk on public.training_programs(resume_program_id,user_id);
alter table public.user_preferences add column completion_policy jsonb not null default '{"weight":true,"nutrition":true,"workout":true,"recovery":true,"water":true}';
alter table public.daily_checkins add column completion_policy jsonb;
alter table public.recommendations alter column weekly_analysis_id drop not null;
alter table public.recommendations add column request_id uuid unique;
alter table public.user_preferences add constraint valid_completion_policy check (completion_policy ?& array['weight','nutrition','workout','recovery','water'] and 
 jsonb_typeof(completion_policy->'weight')='boolean' and jsonb_typeof(completion_policy->'nutrition')='boolean' and jsonb_typeof(completion_policy->'workout')='boolean' and jsonb_typeof(completion_policy->'recovery')='boolean' and jsonb_typeof(completion_policy->'water')='boolean' and ((completion_policy->>'weight')::boolean or (completion_policy->>'nutrition')::boolean or (completion_policy->>'recovery')::boolean or (completion_policy->>'water')::boolean));
update public.daily_checkins set completion_policy='{"weight":true,"nutrition":true,"workout":true,"recovery":true,"water":true}' where completion_policy is null;
create schema if not exists app_private;
grant usage on schema app_private to authenticated;
create function app_private.clone_program(p_source uuid,p_recommendation uuid default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare source public.training_programs; current_plan public.training_programs; np uuid; nw uuid; nt uuid; wk record; wt record; begin
 select * into strict current_plan from public.training_programs where user_id=auth.uid() and effective_to is null for update;
 select * into strict source from public.training_programs where id=p_source;
 if exists(select 1 from public.workout_sessions where user_id=auth.uid() and status='in_progress') then raise exception 'WORKOUT_IN_PROGRESS'; end if;
 update public.training_programs set effective_to=greatest(effective_from,(now() at time zone 'Africa/Blantyre')::date) where id=current_plan.id;
 insert into public.training_programs(user_id,version,name,phase,effective_from,created_from_recommendation_id,resume_program_id,planned_until)
 values(auth.uid(),current_plan.version+1,source.name,source.phase,(now() at time zone 'Africa/Blantyre')::date,p_recommendation,source.resume_program_id,source.planned_until) returning id into np;
 for wk in select * from public.program_weeks where training_program_id=source.id order by week_number loop
 insert into public.program_weeks(user_id,training_program_id,week_number,phase_week,goal) values(auth.uid(),np,wk.week_number,wk.phase_week,wk.goal) returning id into nw;
 for wt in select * from public.workout_templates where program_week_id=wk.id order by sort_order loop
 insert into public.workout_templates(user_id,program_week_id,name,day_of_week,sort_order,estimated_minutes,lineage_id) values(auth.uid(),nw,wt.name,wt.day_of_week,wt.sort_order,wt.estimated_minutes,wt.lineage_id) returning id into nt;
 insert into public.workout_template_exercises(user_id,workout_template_id,exercise_id,sort_order,sets,rep_min,rep_max,target_rir,rest_seconds,planned_weight_kg,lineage_id)
 select auth.uid(),nt,exercise_id,sort_order,sets,rep_min,rep_max,target_rir,rest_seconds,planned_weight_kg,lineage_id from public.workout_template_exercises where workout_template_id=wt.id;
 end loop;end loop;return np;
end $$;
revoke all on function app_private.clone_program(uuid,uuid) from public,anon;
grant execute on function app_private.clone_program(uuid,uuid) to authenticated;
create function public.expire_recommendations() returns integer language plpgsql security invoker set search_path='' as $$
declare count integer; begin
 update public.recommendations set status='expired' where user_id=auth.uid() and status='pending' and source_period_end<(now() at time zone 'Africa/Blantyre')::date-14;
 get diagnostics count=row_count;return count;
end $$;
revoke all on function public.expire_recommendations() from public,anon;
grant execute on function public.expire_recommendations() to authenticated;
create or replace function public.resolve_recommendation(p_id uuid,p_accept boolean) returns void language plpgsql security invoker set search_path='' as $$
declare r public.recommendations; t public.nutrition_targets; pg public.training_programs; pe public.workout_template_exercises; ex public.exercises; np uuid; new_ex public.exercises; value numeric; d date:=(now() at time zone 'Africa/Blantyre')::date; begin
 select * into strict r from public.recommendations where id=p_id for update;
 if r.status=(case when p_accept then 'accepted' else 'rejected' end) then return;end if;
 if r.status<>'pending' then raise exception 'RECOMMENDATION_ALREADY_RESOLVED';end if;
 if r.source_period_end<d-14 then update public.recommendations set status='expired' where id=r.id;return;end if;
 if p_accept and r.type='nutrition_adjustment' then
 select * into strict t from public.nutrition_targets where user_id=auth.uid() and effective_to is null for update;
 if t.id::text<>r.payload->>'targetId' then raise exception 'CONFLICT';end if;
 update public.nutrition_targets set effective_to=greatest(effective_from,d) where id=t.id;
 insert into public.nutrition_targets(user_id,version,effective_from,calories_target,protein_target_g,carbs_target_g,fat_target_g,reason,created_from_recommendation_id)
 values(auth.uid(),t.version+1,d,r.recommended_value,t.protein_target_g,greatest(0,t.carbs_target_g+round((r.recommended_value-t.calories_target)/4)),t.fat_target_g,r.reason,r.id);
 elsif p_accept and r.type in ('exercise_load_progression','training_volume_adjustment','deload','exercise_substitution') then
 select * into strict pg from public.training_programs where user_id=auth.uid() and effective_to is null for update;
 if pg.id::text<>r.payload->>'programId' then raise exception 'CONFLICT';end if;
 if r.payload->>'action'='restore' then
 if pg.phase<>'deload' or pg.resume_program_id::text<>r.payload->>'restoreFromProgramId' then raise exception 'CONFLICT';end if;
 np:=app_private.clone_program(pg.id,r.id);
 update public.workout_template_exercises changed set sets=original.sets
 from public.workout_templates changed_template,public.workout_template_exercises original,public.workout_templates original_template,public.program_weeks original_week
 where changed.workout_template_id=changed_template.id and original.workout_template_id=original_template.id and original_template.program_week_id=original_week.id and original_week.training_program_id=pg.resume_program_id and changed_template.lineage_id=original_template.lineage_id and changed.sort_order=original.sort_order and changed_template.program_week_id in(select id from public.program_weeks where training_program_id=np);
 update public.training_programs set phase='base',planned_until=null,resume_program_id=null where id=np;
 elsif r.type='deload' then
 if pg.phase='deload' then raise exception 'CONFLICT';end if;
 np:=app_private.clone_program(pg.id,r.id);
 update public.training_programs set phase='deload',planned_until=d+7,resume_program_id=pg.id where id=np;
 update public.workout_template_exercises set sets=greatest(1,ceil(sets::numeric/2)::integer) where workout_template_id in(select wt.id from public.workout_templates wt join public.program_weeks w on w.id=wt.program_week_id where w.training_program_id=np);
 else
 select e.* into strict pe from public.workout_template_exercises e join public.workout_templates wt on wt.id=e.workout_template_id join public.program_weeks w on w.id=wt.program_week_id where e.id::text=r.payload->>'templateExerciseId' and w.training_program_id=pg.id;
 select * into strict ex from public.exercises where id=pe.exercise_id;
 value:=r.recommended_value;
 if r.type='exercise_load_progression' then
 if value is null or value<=pe.planned_weight_kg or not exists(select 1 from public.available_equipment where user_id=auth.uid() and equipment_type=ex.equipment and is_available) or not exists(select 1 from public.gym_load_options where user_id=auth.uid() and (exercise_id=ex.id or (exercise_id is null and equipment_type=ex.equipment)) and value between minimum_kg and maximum_kg and abs(mod(value-minimum_kg,increment_kg))<0.00001) then raise exception 'INVALID_INPUT';end if;
 elsif r.type='training_volume_adjustment' then
 if value is null or value<>floor(value) or value<1 or value>10 or abs(value-pe.sets)>1 then raise exception 'INVALID_INPUT';end if;
 elsif r.type='exercise_substitution' then
 select * into strict new_ex from public.exercises where id::text=r.payload->>'replacementExerciseId' and is_active and primary_muscle=ex.primary_muscle and exists(select 1 from public.available_equipment where user_id=auth.uid() and equipment_type=public.exercises.equipment and is_available) and not exists(select 1 from public.workout_template_exercises existing where existing.workout_template_id=pe.workout_template_id and existing.exercise_id=public.exercises.id and existing.id<>pe.id);
 end if;
 np:=app_private.clone_program(pg.id,r.id);
 update public.workout_template_exercises set
 planned_weight_kg=case when r.type='exercise_load_progression' then value when r.type='exercise_substitution' then 0 else planned_weight_kg end,
 sets=case when r.type='training_volume_adjustment' then value::integer else sets end,
 exercise_id=case when r.type='exercise_substitution' then new_ex.id else exercise_id end,
 rep_min=case when r.type='exercise_substitution' then new_ex.default_rep_min else rep_min end,
 rep_max=case when r.type='exercise_substitution' then new_ex.default_rep_max else rep_max end,
 lineage_id=case when r.type='exercise_substitution' then gen_random_uuid() else lineage_id end
 where lineage_id=pe.lineage_id and workout_template_id in(select wt.id from public.workout_templates wt join public.program_weeks w on w.id=wt.program_week_id where w.training_program_id=np);
 end if;
 update public.recommendations set status='expired' where user_id=auth.uid() and status='pending' and id<>r.id and payload->>'programId'=pg.id::text;
 end if;
 update public.recommendations set status=case when p_accept then 'accepted' else 'rejected' end,accepted_at=case when p_accept then now() end,rejected_at=case when not p_accept then now() end where id=r.id;
 if p_accept then perform public.refresh_completion(d);end if;
end $$;
create or replace function public.save_settings(p_settings jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare days integer[]; previous_days integer[]; old public.training_programs; current_profile public.profiles; count_days integer; np uuid; nw uuid; nt uuid; source_ids uuid[]; wt public.workout_templates; i integer; selected_equipment jsonb; policy jsonb; begin
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
 if jsonb_array_length(selected_equipment)<1 or not selected_equipment?'bodyweight' or exists(select 1 from jsonb_array_elements_text(selected_equipment) e where e not in ('bodyweight','barbell','dumbbell','cable','machine','pullup_bar')) then raise exception 'INVALID_INPUT';end if;
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
 select * into strict wt from public.workout_templates where id=source_ids[1+mod(i-1,array_length(source_ids,1))];
 insert into public.workout_templates(user_id,program_week_id,name,day_of_week,sort_order,estimated_minutes,lineage_id)
 values(auth.uid(),nw,case when count_days<=array_length(source_ids,1) then wt.name else split_part(wt.name,' ',1)||' '||chr(65+(i-1)/2) end,days[i],i,wt.estimated_minutes,case when i<=array_length(source_ids,1) then wt.lineage_id else gen_random_uuid() end) returning id into nt;
 insert into public.workout_template_exercises(user_id,workout_template_id,exercise_id,sort_order,sets,rep_min,rep_max,target_rir,rest_seconds,planned_weight_kg,lineage_id)
 select auth.uid(),nt,exercise_id,sort_order,sets,rep_min,rep_max,target_rir,rest_seconds,planned_weight_kg,case when i<=array_length(source_ids,1) then lineage_id else gen_random_uuid() end from public.workout_template_exercises where workout_template_id=wt.id;
 end loop;
 update public.recommendations set status='expired' where user_id=auth.uid() and status='pending' and payload->>'programId'=old.id::text;
 end if;
 perform public.refresh_completion((now() at time zone 'Africa/Blantyre')::date);
end $$;
-- Refresh the cached day in the same transaction as the underlying log.
create or replace function public.refresh_completion(p_date date) returns void language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); target public.nutrition_targets; pg public.training_programs;
 calories numeric; water numeric; water_target integer; w boolean; n boolean; t boolean; r boolean; h boolean; training boolean; done integer; required integer; policy jsonb; begin
 if uid is null then return; end if;
 select * into target from public.nutrition_targets where user_id=uid and effective_from<=p_date and (effective_to is null or effective_to>=p_date) order by version desc limit 1;
 select * into pg from public.training_programs where user_id=uid and effective_from<=p_date and (effective_to is null or effective_to>=p_date) order by version desc limit 1;
 select coalesce(sum(i.calories),0) into calories from public.nutrition_log_items i join public.nutrition_logs l on l.id=i.nutrition_log_id and l.user_id=i.user_id where l.user_id=uid and l.date=p_date;
 select coalesce(sum(amount_ml),0) into water from public.water_logs where user_id=uid and date=p_date;
 select water_target_ml into water_target from public.profiles where user_id=uid;
 training:=exists(select 1 from public.workout_templates wt join public.program_weeks pw on pw.id=wt.program_week_id where pw.training_program_id=pg.id and wt.day_of_week=extract(dow from p_date)::integer);
 w:=exists(select 1 from public.weight_logs where user_id=uid and date=p_date);
 n:=target.id is not null and abs(calories-target.calories_target)<=target.calories_target*0.1;
 t:=not training or exists(select 1 from public.workout_sessions where user_id=uid and session_date=p_date and status='completed');
 r:=exists(select 1 from public.recovery_logs where user_id=uid and date=p_date);
 h:=water>=coalesce(water_target,2500);
 if p_date<(now() at time zone 'Africa/Blantyre')::date then select completion_policy into policy from public.daily_checkins where user_id=uid and date=p_date;end if;
 policy:=coalesce(policy,(select completion_policy from public.user_preferences where user_id=uid),'{"weight":true,"nutrition":true,"workout":true,"recovery":true,"water":true}');
 required:=(policy->>'weight')::boolean::integer+(policy->>'nutrition')::boolean::integer+(policy->>'recovery')::boolean::integer+(policy->>'water')::boolean::integer+(training and (policy->>'workout')::boolean)::integer;
 done:=(w and (policy->>'weight')::boolean)::integer+(n and (policy->>'nutrition')::boolean)::integer+(r and (policy->>'recovery')::boolean)::integer+(h and (policy->>'water')::boolean)::integer+(training and t and (policy->>'workout')::boolean)::integer;
 insert into public.daily_checkins(user_id,date,weight_logged,nutrition_logged,workout_requirement_met,recovery_logged,water_logged,completed_actions,required_actions,completion_percentage,day_completed,completed_at,completion_policy)
 values(uid,p_date,w,n,t,r,h,done,required,round(done::numeric/required*100),done=required,case when done=required then now() end,policy)
 on conflict(user_id,date) do update set completion_policy=policy,weight_logged=w,nutrition_logged=n,workout_requirement_met=t,recovery_logged=r,water_logged=h,completed_actions=done,required_actions=required,completion_percentage=round(done::numeric/required*100),day_completed=done=required,completed_at=case when done=required then coalesce(public.daily_checkins.completed_at,now()) end;
end $$;
create or replace function public.start_workout(p_template uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid; wt public.workout_templates; d date:=(now() at time zone 'Africa/Blantyre')::date; begin
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,2));
 select id into result from public.workout_sessions where user_id=auth.uid() and status='in_progress';
 if result is not null then return result; end if;
 select * into strict wt from public.workout_templates where id=p_template for update;
 if exists(select 1 from public.workout_template_exercises p join public.exercises e on e.id=p.exercise_id where p.workout_template_id=wt.id and not exists(select 1 from public.available_equipment a where a.user_id=auth.uid() and a.equipment_type=e.equipment and a.is_available)) then raise exception 'EQUIPMENT_UNAVAILABLE';end if;
 if wt.day_of_week<>extract(dow from d)::integer or not exists(select 1 from public.program_weeks w join public.training_programs p on p.id=w.training_program_id where w.id=wt.program_week_id and p.effective_to is null) then raise exception 'CONFLICT'; end if;
 select id into result from public.workout_sessions where user_id=auth.uid() and workout_template_id=p_template and session_date=d;
 if result is not null then
 update public.workout_sessions set status='in_progress' where id=result and status='abandoned';
 return result;
 end if;
 insert into public.workout_sessions(user_id,workout_template_id,session_date) values(auth.uid(),p_template,d) returning id into result;
 return result;
end $$;

insert into public.exercises(name,slug,primary_muscle,equipment,instructions) values('Self-Resisted Biceps Curl','self-resisted-biceps-curl','Biceps','bodyweight','["Use the opposite hand to provide controlled resistance as you curl."]') on conflict(slug) do nothing;

create or replace function public.save_set(p_session uuid,p_exercise uuid,p_number integer,p_weight numeric,p_reps integer,p_rir integer,p_done boolean)
returns uuid language plpgsql security invoker set search_path='' as $$
declare s public.workout_sessions; result uuid; begin
 select * into strict s from public.workout_sessions where id=p_session for update;
 if s.status<>'in_progress' then raise exception 'WORKOUT_ALREADY_COMPLETED'; end if;
 if not exists(select 1 from public.workout_template_exercises where workout_template_id=s.workout_template_id and exercise_id=p_exercise and p_number between 1 and sets) then raise exception 'INVALID_INPUT'; end if;
 insert into public.exercise_sets(user_id,workout_session_id,exercise_id,set_number,weight_kg,reps,rir,is_completed)
 values(auth.uid(),p_session,p_exercise,p_number,p_weight,p_reps,p_rir,p_done)
 on conflict(workout_session_id,exercise_id,set_number) do update set weight_kg=excluded.weight_kg,reps=excluded.reps,rir=excluded.rir,is_completed=excluded.is_completed,completed_at=now()
 returning id into result; return result;
end $$;

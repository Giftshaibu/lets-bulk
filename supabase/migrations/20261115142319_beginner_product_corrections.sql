-- Optional context does not reset any existing target or program.
alter table public.user_preferences add column onboarding_context jsonb not null default '{}'::jsonb;
-- This view derives only persisted intentional logs. Merely opening the app creates no activity.
create view public.logging_days with (security_invoker=true) as
 select user_id,date from public.weight_logs
 union select l.user_id,l.date from public.nutrition_logs l join public.nutrition_log_items i on i.nutrition_log_id=l.id and i.user_id=l.user_id
 union select user_id,date from public.recovery_logs
 union select user_id,date from public.water_logs where amount_ml>0
 union select s.user_id,s.session_date from public.workout_sessions s join public.exercise_sets e on e.workout_session_id=s.id and e.user_id=s.user_id where e.is_completed and e.reps>0
 union select user_id,date from public.body_measurements
 union select user_id,date from public.progress_photos;
revoke all on public.logging_days from anon,public;
grant select on public.logging_days to authenticated;
create function public.guided_initialize(p_input jsonb,p_targets jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare pg uuid; wk uuid; wt uuid; ex record; grp text; d integer; ord integer; idx integer:=0; days integer[]; eq jsonb; begin
 if auth.uid() is null then raise exception 'NOT_AUTHENTICATED';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,1));
 if exists(select 1 from public.profiles where user_id=auth.uid()) then return;end if;
 select array_agg(value::integer order by value::integer) into days from jsonb_array_elements_text(p_input->'days');
 if cardinality(days) not between 3 and 5 or (select count(distinct v) from unnest(days) v)<>cardinality(days) or exists(select 1 from unnest(days) v where v not between 0 and 6) then raise exception 'INVALID_INPUT';end if;
 eq:=p_input->'equipment';
 if not eq?'bodyweight' or exists(select 1 from jsonb_array_elements_text(eq) v where v not in ('bodyweight','barbell','dumbbell','cable','pullup_bar')) then raise exception 'INVALID_INPUT';end if;
 perform public.initialize_profile(jsonb_build_object('name',p_input->>'name','height',p_input->'height','weight',p_input->'weight','goal',p_input->'goal'),p_targets,eq);
 update public.profiles set target_date=(start_date+make_interval(months=>(p_input->>'months')::integer))::date,training_days_per_week=cardinality(days) where user_id=auth.uid();
 update public.user_preferences set onboarding_context=p_input-'name'-'weight'-'height'-'goal'-'equipment'-'days',budget_mode=p_input->>'budget' where user_id=auth.uid();
 update public.nutrition_targets set reason='Estimated starting targets; modest surplus, adjusted only from logged progress' where user_id=auth.uid() and version=1;
 select id into pg from public.training_programs where user_id=auth.uid() and effective_to is null;
 select id into wk from public.program_weeks where training_program_id=pg;
 -- Initial templates have no sessions/history. Replace only this new account's draft.
 delete from public.workout_templates where program_week_id=wk and user_id=auth.uid();
 foreach d in array days loop
 idx:=idx+1;
 insert into public.workout_templates(user_id,program_week_id,name,day_of_week,sort_order) values(auth.uid(),wk,case when cardinality(days)=3 then 'Full body '||idx else case when mod(idx,2)=1 then 'Upper ' else 'Lower ' end||idx end,d,idx) returning id into wt;
 ord:=0;
 for grp in select unnest(case when cardinality(days)=3 then array['Quads','Hamstrings','Chest','Back','Shoulders','Core'] when mod(idx,2)=1 then array['Chest','Back','Shoulders','Biceps','Triceps'] else array['Quads','Hamstrings','Glutes','Calves','Core'] end) loop
 select e.* into ex from public.exercises e where e.is_active and e.primary_muscle=grp and eq?e.equipment
 -- Starting plans conservatively exclude all exercises requiring support apparatus.
 and e.slug !~ '(bench|incline|decline|seated|preacher|rack|dip|step-up|bulgarian|chest-supported|machine|leg-press|leg-extension|leg-curl)'
 order by case when e.equipment='bodyweight' then 1 else 0 end,e.slug limit 1;
 if ex.id is not null then
 insert into public.workout_template_exercises(user_id,workout_template_id,exercise_id,sort_order,sets,rep_min,rep_max,target_rir,rest_seconds) values(auth.uid(),wt,ex.id,ord,case when cardinality(days)=3 then 2 else 3 end,ex.default_rep_min,ex.default_rep_max,2,ex.default_rest_seconds);ord:=ord+1;
 end if;end loop;end loop;
 update public.training_programs set name=case when cardinality(days)=3 then 'Full body' else 'Upper / Lower' end where id=pg;
end $$;
revoke all on function public.guided_initialize(jsonb,jsonb) from public,anon;
grant execute on function public.guided_initialize(jsonb,jsonb) to authenticated;

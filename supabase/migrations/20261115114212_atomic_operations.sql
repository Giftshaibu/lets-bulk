-- All RPCs use the caller's permissions and row policies. Never bypass RLS.
create function public.log_food(p_id uuid,p_date date,p_slot text,p_food uuid,p_grams numeric)
returns uuid language plpgsql security invoker set search_path='' as $$
declare f public.foods; begin
 if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
 select * into strict f from public.foods where id=p_food and is_active;
 if f.calories_per_100g is null or f.protein_per_100g is null or f.carbs_per_100g is null or f.fat_per_100g is null then raise exception 'INVALID_INPUT'; end if;
 insert into public.nutrition_logs(id,user_id,date,meal_type) values(p_id,auth.uid(),p_date,p_slot) on conflict(id) do nothing;
 if not exists(select 1 from public.nutrition_log_items where nutrition_log_id=p_id) then
 insert into public.nutrition_log_items(user_id,nutrition_log_id,food_id,grams,name,calories,protein_g,carbs_g,fat_g)
 values(auth.uid(),p_id,p_food,p_grams,f.name,f.calories_per_100g*p_grams/100,f.protein_per_100g*p_grams/100,f.carbs_per_100g*p_grams/100,f.fat_per_100g*p_grams/100);
 end if; return p_id;
end $$;
create function public.save_set(p_session uuid,p_exercise uuid,p_number integer,p_weight numeric,p_reps integer,p_rir integer,p_done boolean)
returns uuid language plpgsql security invoker set search_path='' as $$
declare s public.workout_sessions; result uuid; begin
 select * into strict s from public.workout_sessions where id=p_session for update;
 if s.status<>'in_progress' then raise exception 'WORKOUT_ALREADY_COMPLETED'; end if;
 if not exists(select 1 from public.workout_template_exercises where workout_template_id=s.workout_template_id and exercise_id=p_exercise) then raise exception 'INVALID_INPUT'; end if;
 insert into public.exercise_sets(user_id,workout_session_id,exercise_id,set_number,weight_kg,reps,rir,is_completed)
 values(auth.uid(),p_session,p_exercise,p_number,p_weight,p_reps,p_rir,p_done)
 on conflict(workout_session_id,exercise_id,set_number) do update set weight_kg=excluded.weight_kg,reps=excluded.reps,rir=excluded.rir,is_completed=excluded.is_completed,completed_at=now()
 returning id into result; return result;
end $$;
create function public.delete_set(p_id uuid) returns void language plpgsql security invoker set search_path='' as $$
declare sid uuid; begin
 select workout_session_id into strict sid from public.exercise_sets where id=p_id;
 perform 1 from public.workout_sessions where id=sid and status='in_progress' for update;
 if not found then raise exception 'WORKOUT_ALREADY_COMPLETED'; end if;
 delete from public.exercise_sets where id=p_id;
end $$;
create function public.complete_workout(p_session uuid) returns void language plpgsql security invoker set search_path='' as $$
declare s public.workout_sessions; begin
 select * into strict s from public.workout_sessions where id=p_session for update;
 if s.status='completed' then return; end if;
 if s.status<>'in_progress' then raise exception 'CONFLICT'; end if;
 if exists(select 1 from public.workout_template_exercises t where t.workout_template_id=s.workout_template_id and
 (select count(*) from public.exercise_sets es where es.workout_session_id=s.id and es.exercise_id=t.exercise_id and es.is_completed and not es.is_warmup)<t.sets) then raise exception 'INVALID_INPUT'; end if;
 update public.workout_sessions set status='completed',completed_at=now(),duration_seconds=greatest(0,extract(epoch from now()-started_at)::integer) where id=p_session;
 insert into public.daily_checkins(user_id,date,workout_requirement_met) values(auth.uid(),s.session_date,true)
 on conflict(user_id,date) do update set workout_requirement_met=true;
end $$;
create function public.resolve_recommendation(p_id uuid,p_accept boolean) returns void language plpgsql security invoker set search_path='' as $$
declare r public.recommendations; t public.nutrition_targets; pg public.training_programs; wk record; wt record; nw uuid; nt uuid; np uuid; base uuid; begin
 select * into strict r from public.recommendations where id=p_id for update;
 if r.status=(case when p_accept then 'accepted' else 'rejected' end) then return; end if;
 if r.status<>'pending' then raise exception 'RECOMMENDATION_ALREADY_RESOLVED'; end if;
 if r.source_period_end < (now() at time zone 'Africa/Blantyre')::date-14 then raise exception 'CONFLICT'; end if;
 if p_accept and r.type='nutrition_adjustment' then
 select * into strict t from public.nutrition_targets where user_id=auth.uid() and effective_to is null for update;
 if t.id::text<>r.payload->>'targetId' then raise exception 'CONFLICT'; end if;
 update public.nutrition_targets set effective_to=greatest(effective_from,(now() at time zone 'Africa/Blantyre')::date) where id=t.id;
 insert into public.nutrition_targets(user_id,version,effective_from,calories_target,protein_target_g,carbs_target_g,fat_target_g,reason,created_from_recommendation_id)
 values(auth.uid(),t.version+1,(now() at time zone 'Africa/Blantyre')::date,r.recommended_value,t.protein_target_g,greatest(0,t.carbs_target_g+round((r.recommended_value-t.calories_target)/4)),t.fat_target_g,r.reason,r.id);
 elsif p_accept and r.type='exercise_load_progression' then
 select * into strict pg from public.training_programs where user_id=auth.uid() and effective_to is null for update;
 if pg.id::text<>r.payload->>'programId' then raise exception 'CONFLICT'; end if;
 update public.training_programs set effective_to=greatest(effective_from,(now() at time zone 'Africa/Blantyre')::date) where id=pg.id;
 insert into public.training_programs(user_id,version,name,phase,effective_from,created_from_recommendation_id)
 values(auth.uid(),pg.version+1,pg.name,pg.phase,(now() at time zone 'Africa/Blantyre')::date,r.id) returning id into np;
 for wk in select * from public.program_weeks where training_program_id=pg.id loop
 insert into public.program_weeks(user_id,training_program_id,week_number,phase_week,goal) values(auth.uid(),np,wk.week_number,wk.phase_week,wk.goal) returning id into nw;
 for wt in select * from public.workout_templates where program_week_id=wk.id loop
 insert into public.workout_templates(user_id,program_week_id,name,day_of_week,sort_order,estimated_minutes) values(auth.uid(),nw,wt.name,wt.day_of_week,wt.sort_order,wt.estimated_minutes) returning id into nt;
 insert into public.workout_template_exercises(user_id,workout_template_id,exercise_id,sort_order,sets,rep_min,rep_max,target_rir,rest_seconds,planned_weight_kg)
 select auth.uid(),nt,exercise_id,sort_order,sets,rep_min,rep_max,target_rir,rest_seconds,
 case when id::text=r.payload->>'templateExerciseId' then r.recommended_value else planned_weight_kg end
 from public.workout_template_exercises where workout_template_id=wt.id;
 end loop; end loop;
 end if;
 update public.recommendations set status=case when p_accept then 'accepted' else 'rejected' end,
 accepted_at=case when p_accept then now() end,rejected_at=case when not p_accept then now() end where id=p_id;
end $$;
create function public.save_review(p_start date,p_end date,p_analysis jsonb,p_recommendations jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare rid uuid; item jsonb; begin
 -- Serialize per-user reviews, including concurrent first inserts.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select id into rid from public.weekly_analyses where user_id=auth.uid() and period_start=p_start and period_end=p_end;
 if rid is not null then return rid; end if;
 insert into public.weekly_analyses(user_id,period_start,period_end,raw_analysis,data_completeness,confidence)
 values(auth.uid(),p_start,p_end,p_analysis,(p_analysis->>'completeness')::numeric,(p_analysis->>'confidence')::numeric) returning id into rid;
 for item in select * from jsonb_array_elements(p_recommendations) loop
 insert into public.recommendations(user_id,weekly_analysis_id,type,title,reason,current_value,recommended_value,unit,confidence,source_period_start,source_period_end,payload)
 values(auth.uid(),rid,item->>'type',item->>'title',item->>'reason',(item->>'currentValue')::numeric,(item->>'recommendedValue')::numeric,item->>'unit',(p_analysis->>'confidence')::numeric,p_start,p_end,coalesce(item->'payload','{}'));
 end loop; return rid;
end $$;
-- These functions form an authenticated API and retain invoker RLS.
revoke all on function public.log_food(uuid,date,text,uuid,numeric) from public,anon;
revoke all on function public.save_set(uuid,uuid,integer,numeric,integer,integer,boolean) from public,anon;
revoke all on function public.delete_set(uuid) from public,anon;
revoke all on function public.complete_workout(uuid) from public,anon;
revoke all on function public.resolve_recommendation(uuid,boolean) from public,anon;
revoke all on function public.save_review(date,date,jsonb,jsonb) from public,anon;
grant execute on function public.log_food(uuid,date,text,uuid,numeric),public.save_set(uuid,uuid,integer,numeric,integer,integer,boolean),public.delete_set(uuid),public.complete_workout(uuid),public.resolve_recommendation(uuid,boolean),public.save_review(date,date,jsonb,jsonb) to authenticated;

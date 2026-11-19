-- Explicit one-off starts keep the weekly plan unchanged. Preserve the legacy RPC signature.
create or replace function public.start_workout(p_template uuid,p_allow_unscheduled boolean) returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid; wt public.workout_templates; d date; tz text; begin
 if auth.uid() is null then raise exception 'INVALID_INPUT';end if;
 select timezone into tz from public.profiles where user_id=auth.uid();
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=tz) then tz:='Africa/Blantyre';end if;
 d:=(now() at time zone coalesce(tz,'Africa/Blantyre'))::date;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,2));
 select * into strict wt from public.workout_templates where id=p_template and user_id=auth.uid() for update;
 if not exists(select 1 from public.program_weeks w join public.training_programs p on p.id=w.training_program_id where w.id=wt.program_week_id and p.user_id=auth.uid() and p.effective_from<=d and (p.effective_to is null or p.effective_to>=d)) then raise exception 'CONFLICT';end if;
 select id into result from public.workout_sessions where user_id=auth.uid() and status='in_progress';
 if result is not null then return result;end if;
 if not coalesce(p_allow_unscheduled,false) and wt.day_of_week<>extract(dow from d)::integer then raise exception 'CONFLICT';end if;
 if not exists(select 1 from public.workout_template_exercises where workout_template_id=wt.id) then raise exception 'CONFLICT';end if;
 if exists(select 1 from public.workout_template_exercises p join public.exercises e on e.id=p.exercise_id where p.workout_template_id=wt.id and not public.can_use_exercise(e.id)) then raise exception 'EQUIPMENT_UNAVAILABLE';end if;
 select id into result from public.workout_sessions where user_id=auth.uid() and workout_template_id=p_template and session_date=d;
 if result is not null then
 update public.workout_sessions set status='in_progress' where id=result and status='abandoned';return result;
 end if;
 insert into public.workout_sessions(user_id,workout_template_id,session_date) values(auth.uid(),p_template,d) returning id into result;
 return result;
end $$;
create or replace function public.start_workout(p_template uuid) returns uuid language sql security invoker set search_path='' as $$select public.start_workout(p_template,false)$$;
revoke all on function public.start_workout(uuid,boolean) from public,anon;
grant execute on function public.start_workout(uuid,boolean) to authenticated;

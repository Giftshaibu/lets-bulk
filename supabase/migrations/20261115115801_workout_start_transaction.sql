create function public.start_workout(p_template uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid; wt public.workout_templates; d date:=(now() at time zone 'Africa/Blantyre')::date; begin
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,2));
 select id into result from public.workout_sessions where user_id=auth.uid() and status='in_progress';
 if result is not null then return result; end if;
 select * into strict wt from public.workout_templates where id=p_template for update;
 if wt.day_of_week<>extract(dow from d)::integer or not exists(select 1 from public.program_weeks w join public.training_programs p on p.id=w.training_program_id where w.id=wt.program_week_id and p.effective_to is null) then raise exception 'CONFLICT'; end if;
 select id into result from public.workout_sessions where user_id=auth.uid() and workout_template_id=p_template and session_date=d;
 if result is not null then return result; end if;
 insert into public.workout_sessions(user_id,workout_template_id,session_date) values(auth.uid(),p_template,d) returning id into result;
 return result;
end $$;
create or replace function public.initial_exercise_load(p_id uuid,p_weight numeric) returns void language plpgsql security invoker set search_path='' as $$
declare p public.workout_template_exercises; begin
 select * into strict p from public.workout_template_exercises where id=p_id;
 perform 1 from public.workout_templates where id=p.workout_template_id for update;
 if exists(select 1 from public.workout_sessions where workout_template_id=p.workout_template_id) then raise exception 'CONFLICT'; end if;
 update public.workout_template_exercises set planned_weight_kg=p_weight where id=p_id;
end $$;
revoke all on function public.start_workout(uuid) from public,anon;
grant execute on function public.start_workout(uuid) to authenticated;

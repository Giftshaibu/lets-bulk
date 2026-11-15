-- Refresh the cached day in the same transaction as the underlying log.
create function public.refresh_completion(p_date date) returns void language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); target public.nutrition_targets; pg public.training_programs;
 calories numeric; water numeric; water_target integer; w boolean; n boolean; t boolean; r boolean; h boolean; training boolean; done integer; required integer; begin
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
 required:=4+training::integer;done:=w::integer+n::integer+r::integer+h::integer+case when training then t::integer else 0 end;
 insert into public.daily_checkins(user_id,date,weight_logged,nutrition_logged,workout_requirement_met,recovery_logged,water_logged,completed_actions,required_actions,completion_percentage,day_completed,completed_at)
 values(uid,p_date,w,n,t,r,h,done,required,round(done::numeric/required*100),done=required,case when done=required then now() end)
 on conflict(user_id,date) do update set weight_logged=w,nutrition_logged=n,workout_requirement_met=t,recovery_logged=r,water_logged=h,completed_actions=done,required_actions=required,completion_percentage=round(done::numeric/required*100),day_completed=done=required,completed_at=case when done=required then coalesce(public.daily_checkins.completed_at,now()) end;
end $$;
create function public.refresh_log_day() returns trigger language plpgsql security invoker set search_path='' as $$
declare d date; begin
 if tg_table_name='nutrition_log_items' then
 select date into d from public.nutrition_logs where id=case when tg_op='DELETE' then old.nutrition_log_id else new.nutrition_log_id end;
 elsif tg_table_name='workout_sessions' then
 d:=case when tg_op='DELETE' then old.session_date else new.session_date end;
 else d:=case when tg_op='DELETE' then old.date else new.date end;
 end if;
 if d is not null then perform public.refresh_completion(d); end if;
 return null;
end $$;
create trigger weight_completion after insert or update or delete on public.weight_logs for each row execute function public.refresh_log_day();
create trigger recovery_completion after insert or update or delete on public.recovery_logs for each row execute function public.refresh_log_day();
create trigger water_completion after insert or update or delete on public.water_logs for each row execute function public.refresh_log_day();
create trigger nutrition_completion after insert or update or delete on public.nutrition_log_items for each row execute function public.refresh_log_day();
create trigger workout_completion after insert or update or delete on public.workout_sessions for each row execute function public.refresh_log_day();
revoke all on function public.refresh_completion(date),public.refresh_log_day() from public,anon;
grant execute on function public.refresh_completion(date),public.refresh_log_day() to authenticated;

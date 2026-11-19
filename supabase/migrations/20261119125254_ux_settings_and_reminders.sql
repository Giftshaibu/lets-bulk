alter table public.user_preferences add column mass_unit text not null default 'kg' check(mass_unit in ('kg','lb')),
 add column volume_unit text not null default 'ml' check(volume_unit in ('ml','fl_oz')),
 add column morning_reminder boolean not null default false,
 add column evening_reminder boolean not null default false,
 add column morning_time time not null default '07:00';

create table app_private.push_subscriptions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,
 endpoint text not null unique,p256dh text not null,auth text not null,enabled boolean not null default true,
 created_at timestamptz not null default now(),last_test_at timestamptz
);
alter table app_private.push_subscriptions enable row level security;
grant select,insert on app_private.push_subscriptions to authenticated;
grant update(enabled,p256dh,auth,last_test_at) on app_private.push_subscriptions to authenticated;
create policy push_owner on app_private.push_subscriptions for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create function public.save_push_subscription(p_endpoint text,p_p256dh text,p_auth text) returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid;begin
 if auth.uid() is null or p_endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/' or length(p_endpoint)>2048 or p_p256dh !~ '^[A-Za-z0-9_-]{87}=?$' or p_auth !~ '^[A-Za-z0-9_-]{22}={0,2}$' then raise exception 'INVALID_INPUT';end if;
 insert into app_private.push_subscriptions(user_id,endpoint,p256dh,auth) values(auth.uid(),p_endpoint,p_p256dh,p_auth)
 on conflict(endpoint) do update set p256dh=excluded.p256dh,auth=excluded.auth,enabled=true where app_private.push_subscriptions.user_id=auth.uid() returning id into result;
 if result is null then raise exception 'CONFLICT';end if;return result;
end $$;
create function public.remove_push_subscription(p_endpoint text) returns void language sql security invoker set search_path='' as $$update app_private.push_subscriptions set enabled=false where user_id=auth.uid() and endpoint=p_endpoint$$;
create function public.prepare_test_push(p_endpoint text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare s app_private.push_subscriptions;begin
 select * into strict s from app_private.push_subscriptions where user_id=auth.uid() and endpoint=p_endpoint and enabled for update;
 if s.last_test_at>now()-interval '1 minute' then raise exception 'RATE_LIMITED';end if;
 update app_private.push_subscriptions set last_test_at=now() where id=s.id;
 return jsonb_build_object('endpoint',s.endpoint,'keys',jsonb_build_object('p256dh',s.p256dh,'auth',s.auth));
end $$;
revoke all on function public.save_push_subscription(text,text,text),public.remove_push_subscription(text),public.prepare_test_push(text) from public,anon;
grant execute on function public.save_push_subscription(text,text,text),public.remove_push_subscription(text),public.prepare_test_push(text) to authenticated;

alter function public.save_settings(jsonb) set schema app_private;
create function public.save_settings(p_settings jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare old public.nutrition_targets; source public.nutrition_targets; proposed jsonb; kcal integer; protein integer; carbs numeric; d date:=(now() at time zone 'Africa/Blantyre')::date; begin
 perform 1 from public.profiles where user_id=auth.uid() for update;
 if p_settings?'mass_unit' and p_settings->>'mass_unit' not in ('kg','lb') then raise exception 'INVALID_INPUT';end if;
 if p_settings?'volume_unit' and p_settings->>'volume_unit' not in ('ml','fl_oz') then raise exception 'INVALID_INPUT';end if;
 if p_settings?'reminders' then
  if jsonb_typeof(p_settings->'reminders'->'morningEnabled') is distinct from 'boolean' or jsonb_typeof(p_settings->'reminders'->'eveningEnabled') is distinct from 'boolean' or coalesce(p_settings->'reminders'->>'morningTime','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'INVALID_INPUT';end if;
  if ((p_settings->'reminders'->>'morningEnabled')::boolean or (p_settings->'reminders'->>'eveningEnabled')::boolean) and not exists(select 1 from app_private.push_subscriptions where user_id=auth.uid() and enabled) then raise exception 'PUSH_NOT_SUBSCRIBED';end if;
 end if;
 proposed:=p_settings->'nutrition_targets';
 if proposed is not null then
  select * into strict source from public.nutrition_targets where user_id=auth.uid() and id=(proposed->>'sourceTargetId')::uuid;
  select * into strict old from public.nutrition_targets where user_id=auth.uid() and effective_to is null for update;
  kcal:=(proposed->>'kcal')::integer;protein:=(proposed->>'protein')::integer;
  carbs:=source.carbs_target_g+(kcal-source.calories_target-4*(protein-source.protein_target_g))/4.0;
  if kcal is null or protein is null or kcal<500 or kcal>10000 or protein<1 or protein>500 or carbs<0 or carbs>1500 then raise exception 'INVALID_TARGETS';end if;
  if old.calories_target<>kcal or old.protein_target_g<>protein or old.carbs_target_g<>round(carbs) or old.fat_target_g<>source.fat_target_g then
   if old.id<>source.id then raise exception 'CONFLICT';end if;
   update public.nutrition_targets set effective_to=greatest(effective_from,d) where id=old.id;
   insert into public.nutrition_targets(user_id,version,effective_from,calories_target,protein_target_g,carbs_target_g,fat_target_g,reason) values(auth.uid(),old.version+1,d,kcal,protein,round(carbs),source.fat_target_g,'Manual targets confirmed in Settings');
  end if;
 end if;
 perform app_private.save_settings(p_settings);
 update public.user_preferences set mass_unit=coalesce(p_settings->>'mass_unit',mass_unit),volume_unit=coalesce(p_settings->>'volume_unit',volume_unit),
 morning_reminder=coalesce((p_settings->'reminders'->>'morningEnabled')::boolean,morning_reminder),evening_reminder=coalesce((p_settings->'reminders'->>'eveningEnabled')::boolean,evening_reminder),morning_time=coalesce((p_settings->'reminders'->>'morningTime')::time,morning_time) where user_id=auth.uid();
end $$;
revoke all on function public.save_settings(jsonb) from public,anon;grant execute on function public.save_settings(jsonb) to authenticated;

create table app_private.reminder_deliveries (
 id uuid primary key default gen_random_uuid(),subscription_id uuid not null references app_private.push_subscriptions on delete cascade,
 user_id uuid not null references auth.users on delete cascade,reminder_date date not null,kind text not null check(kind in ('morning','evening')),
 status text not null default 'pending' check(status in ('pending','sending','sent','failed','suppressed')),attempts integer not null default 0,
 token uuid,lease_until timestamptz,next_attempt_at timestamptz not null default now(),expires_at timestamptz not null,
 unique(subscription_id,reminder_date,kind)
);
alter table app_private.reminder_deliveries enable row level security;
create index reminder_pending on app_private.reminder_deliveries(next_attempt_at) where status in ('pending','sending');
grant usage on schema app_private to service_role;
grant all on app_private.push_subscriptions,app_private.reminder_deliveries to service_role;
grant select on public.logging_days to service_role;
create function app_private.reminder_needed(p_uid uuid,p_day date,p_kind text) returns boolean language sql stable security invoker set search_path='' as $$
 select case p_kind when 'morning' then exists(select 1 from public.user_preferences where user_id=p_uid and morning_reminder) and not exists(select 1 from public.weight_logs where user_id=p_uid and date=p_day)
 when 'evening' then exists(select 1 from public.user_preferences where user_id=p_uid and evening_reminder) and exists(select 1 from public.logging_days where user_id=p_uid and date=p_day-1) and not exists(select 1 from public.logging_days where user_id=p_uid and date=p_day) else false end
$$;
revoke all on function app_private.reminder_needed(uuid,date,text) from public,anon,authenticated;grant execute on function app_private.reminder_needed(uuid,date,text) to service_role;
create function public.claim_due_reminders() returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;begin
 insert into app_private.reminder_deliveries(subscription_id,user_id,reminder_date,kind,expires_at)
 select s.id,s.user_id,d.reminder_date,k.kind,case k.kind when 'morning' then ((d.reminder_date+u.morning_time) at time zone p.timezone)+interval '30 minutes' else (d.reminder_date+1)::timestamp at time zone p.timezone end
 from app_private.push_subscriptions s join public.profiles p on p.user_id=s.user_id join public.user_preferences u on u.user_id=s.user_id
 cross join lateral (select (now() at time zone p.timezone)::date-offset_n reminder_date from generate_series(0,1) offset_n) d
 cross join (values('morning'),('evening')) k(kind)
 where s.enabled and app_private.reminder_needed(s.user_id,d.reminder_date,k.kind)
 and now()>=(d.reminder_date+case k.kind when 'morning' then u.morning_time else time '20:00' end) at time zone p.timezone
 and now()<case k.kind when 'morning' then ((d.reminder_date+u.morning_time) at time zone p.timezone)+interval '30 minutes' else (d.reminder_date+1)::timestamp at time zone p.timezone end
 on conflict(subscription_id,reminder_date,kind) do nothing;
 update app_private.reminder_deliveries set status='suppressed' where status in ('pending','sending') and (expires_at<=now() or not app_private.reminder_needed(user_id,reminder_date,kind));
 with due as (select id from app_private.reminder_deliveries where attempts<3 and expires_at>now() and (status='pending' and next_attempt_at<=now() or status='sending' and lease_until<now()) order by next_attempt_at limit 10 for update skip locked),claimed as (
 update app_private.reminder_deliveries r set status='sending',attempts=attempts+1,token=gen_random_uuid(),lease_until=now()+interval '2 minutes' from due where r.id=due.id returning r.*
 ) select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'token',r.token,'subscription',jsonb_build_object('endpoint',s.endpoint,'keys',jsonb_build_object('p256dh',s.p256dh,'auth',s.auth)),'payload',jsonb_build_object('title','Chiuli','body',case r.kind when 'morning' then 'Ready for your morning weigh-in?' else 'One intentional log can keep your streak going.' end,'tag',r.kind||':'||r.reminder_date,'url',case r.kind when 'morning' then '/progress-details?section=weight' else '/' end))), '[]'::jsonb) into result from claimed r join app_private.push_subscriptions s on s.id=r.subscription_id where s.enabled;
 return result;
end $$;
create function public.finish_reminder(p_id uuid,p_token uuid,p_status integer) returns void language plpgsql security invoker set search_path='' as $$
declare r app_private.reminder_deliveries;begin
 select * into r from app_private.reminder_deliveries where id=p_id and token=p_token and status='sending' for update;
 if r.id is null then return;end if;
 if p_status in (404,410) then update app_private.push_subscriptions set enabled=false where id=r.subscription_id;end if;
 update app_private.reminder_deliveries set status=case when p_status between 200 and 299 then 'sent' when (p_status=429 or p_status>=500 or p_status=0) and attempts<3 and expires_at>now()+interval '5 minutes' then 'pending' else 'failed' end,next_attempt_at=now()+interval '5 minutes',lease_until=null where id=r.id;
end $$;
revoke all on function public.claim_due_reminders(),public.finish_reminder(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.claim_due_reminders(),public.finish_reminder(uuid,uuid,integer) to service_role;
create function public.reminder_still_needed(p_id uuid,p_token uuid) returns boolean language plpgsql security invoker set search_path='' as $$
declare r app_private.reminder_deliveries; valid boolean;begin
 select * into r from app_private.reminder_deliveries where id=p_id and token=p_token and status='sending';
 valid:=r.id is not null and r.expires_at>now() and app_private.reminder_needed(r.user_id,r.reminder_date,r.kind) and exists(select 1 from app_private.push_subscriptions where id=r.subscription_id and enabled);
 if not coalesce(valid,false) then update app_private.reminder_deliveries set status='suppressed' where id=r.id and status='sending';end if;
 return coalesce(valid,false);
end $$;
revoke all on function public.reminder_still_needed(uuid,uuid) from public,anon,authenticated;grant execute on function public.reminder_still_needed(uuid,uuid) to service_role;

grant select on public.profiles,public.user_preferences,public.weight_logs,public.recovery_logs,public.water_logs,public.nutrition_logs,public.nutrition_log_items,public.exercise_sets,public.workout_sessions,public.body_measurements,public.progress_photos to service_role;

create or replace function app_private.reward_eligible(p_day date,p_kind text,p_slot text default '') returns boolean
language sql stable security invoker set search_path='' as $$
with settings as (
 select p.user_id,p.water_target_ml,
 (now() at time zone coalesce((select name from pg_timezone_names where name=p.timezone),'Africa/Blantyre'))::date today,
 case when (select count(*) from jsonb_each(case when jsonb_typeof(u.completion_policy)='object' then u.completion_policy else '{}'::jsonb end) e where e.key in ('weight','nutrition','workout','recovery','water') and jsonb_typeof(e.value)='boolean')=5 then u.completion_policy
 else '{"weight":true,"nutrition":true,"workout":true,"recovery":true,"water":true}'::jsonb end policy
 from public.profiles p left join public.user_preferences u on u.user_id=p.user_id where p.user_id=auth.uid()
), facts as (
 select s.*,
 exists(select 1 from public.weight_logs w where w.user_id=s.user_id and w.date=p_day) weight,
 exists(select 1 from public.recovery_logs r where r.user_id=s.user_id and r.date=p_day) recovery,
 coalesce((select sum(w.amount_ml) from public.water_logs w where w.user_id=s.user_id and w.date=p_day),0) water,
 exists(select 1 from public.workout_sessions w where w.user_id=s.user_id and w.session_date=p_day and w.status='completed' and exists(select 1 from public.exercise_sets es where es.workout_session_id=w.id and es.user_id=s.user_id and es.is_completed and not es.is_warmup)) workout,
 (select count(distinct n.meal_type) from public.nutrition_logs n join public.nutrition_log_items i on i.nutrition_log_id=n.id and i.user_id=n.user_id where n.user_id=s.user_id and n.date=p_day) meals,
 exists(select 1 from public.nutrition_logs n join public.nutrition_log_items i on i.nutrition_log_id=n.id and i.user_id=n.user_id where n.user_id=s.user_id and n.date=p_day and n.meal_type=p_slot) meal,
 exists(select 1 from public.nutrition_targets t where t.id=(select id from public.nutrition_targets where user_id=s.user_id and effective_from<=p_day and (effective_to is null or effective_to>=p_day) order by version desc limit 1) and t.user_id=s.user_id and t.effective_from<=p_day and (t.effective_to is null or t.effective_to>=p_day) and abs(coalesce((select sum(i.calories) from public.nutrition_logs n join public.nutrition_log_items i on i.nutrition_log_id=n.id and i.user_id=n.user_id where n.user_id=s.user_id and n.date=p_day),0)-t.calories_target)<=t.calories_target*0.1) nutrition,
 exists(select 1 from public.workout_templates t join public.program_weeks w on w.id=t.program_week_id join public.training_programs p on p.id=w.training_program_id where t.user_id=s.user_id and p.id=(select id from public.training_programs where user_id=s.user_id and effective_from<=p_day and (effective_to is null or effective_to>=p_day) order by version desc limit 1) and t.day_of_week=extract(dow from p_day)::integer) scheduled
 from settings s
)
select coalesce((select p_day>=date '2026-11-19' and p_day<=today and case p_kind
 when 'weight' then weight when 'recovery' then recovery when 'water' then water>0
 when 'workout' then workout when 'meal' then meal when 'meals' then meals=4
 when 'quests' then
 ((policy->>'weight')::boolean or (policy->>'nutrition')::boolean or ((policy->>'workout')::boolean and scheduled) or (policy->>'recovery')::boolean or (policy->>'water')::boolean)
 and (weight or recovery or water>0 or meals>0 or workout)
 and (not (policy->>'weight')::boolean or weight)
 and (not (policy->>'nutrition')::boolean or nutrition)
 and (not (policy->>'workout')::boolean or not scheduled or workout)
 and (not (policy->>'recovery')::boolean or recovery)
 and (not (policy->>'water')::boolean or water>=water_target_ml)
 else false end from facts),false)
$$;
revoke all on function app_private.reward_eligible(date,text,text) from public,anon;
grant execute on function app_private.reward_eligible(date,text,text) to authenticated;


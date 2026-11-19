-- Rewards accrue from the rollout date. No privileged writes or arbitrary XP claims.
create function app_private.reward_eligible(p_day date,p_kind text,p_slot text default '') returns boolean
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
 exists(select 1 from public.nutrition_targets t where t.user_id=s.user_id and t.effective_from<=p_day and (t.effective_to is null or t.effective_to>=p_day) and abs(coalesce((select sum(i.calories) from public.nutrition_logs n join public.nutrition_log_items i on i.nutrition_log_id=n.id and i.user_id=n.user_id where n.user_id=s.user_id and n.date=p_day),0)-t.calories_target)<=t.calories_target*0.1) nutrition,
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

create table app_private.reward_ledger (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users on delete cascade,
 reward_date date not null,kind text not null check(kind in ('weight','meal','water','recovery','workout','meals','quests')),
 slot text not null default '',
 points integer generated always as (case kind when 'weight' then 50 when 'meal' then 15 when 'water' then 15 when 'recovery' then 15 when 'workout' then 100 when 'meals' then 40 when 'quests' then 100 end) stored,
 created_at timestamptz not null default now(),
 check((kind='meal' and slot in ('breakfast','lunch','snack','dinner')) or (kind<>'meal' and slot='')),
 unique(user_id,reward_date,kind,slot)
);
alter table app_private.reward_ledger enable row level security;
grant select on app_private.reward_ledger to authenticated;
grant insert(user_id,reward_date,kind,slot) on app_private.reward_ledger to authenticated;
create policy reward_read on app_private.reward_ledger for select to authenticated using(user_id=(select auth.uid()));
create policy reward_insert on app_private.reward_ledger for insert to authenticated with check(user_id=(select auth.uid()) and app_private.reward_eligible(reward_date,kind,slot));

create function public.reconcile_rewards() returns jsonb
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); local_today date; earned jsonb;
begin
 if uid is null then raise exception 'NOT_AUTHENTICATED';end if;
 select (now() at time zone coalesce((select name from pg_timezone_names where name=p.timezone),'Africa/Blantyre'))::date into local_today from public.profiles p where p.user_id=uid;
 if local_today is null then return jsonb_build_object('totalXp',0,'todayXp',0,'grants','[]'::jsonb);end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,17));
 with days as (
 select date d from public.weight_logs where user_id=uid
 union select date from public.water_logs where user_id=uid
 union select date from public.recovery_logs where user_id=uid
 union select date from public.nutrition_logs where user_id=uid
 union select session_date from public.workout_sessions where user_id=uid and status='completed'
 ), candidates as (
 select d,kind,slot from days cross join (values('weight',''),('water',''),('recovery',''),('workout',''),('meals',''),('quests',''),('meal','breakfast'),('meal','lunch'),('meal','snack'),('meal','dinner')) k(kind,slot)
 where d>=date '2026-11-19' and d<=local_today
 ), inserted as (
 insert into app_private.reward_ledger(user_id,reward_date,kind,slot)
 select uid,c.d,c.kind,c.slot from candidates c where not exists(select 1 from app_private.reward_ledger r where r.user_id=uid and r.reward_date=c.d and r.kind=c.kind and r.slot=c.slot)
 and app_private.reward_eligible(c.d,c.kind,c.slot)
 on conflict(user_id,reward_date,kind,slot) do nothing
 returning id,reward_date,kind,slot,points
 ) select coalesce(jsonb_agg(jsonb_build_object('id',id,'date',reward_date,'kind',kind,'slot',slot,'points',points)),'[]'::jsonb) into earned from inserted;
 return jsonb_build_object('totalXp',(select coalesce(sum(points),0) from app_private.reward_ledger where user_id=uid),'todayXp',(select coalesce(sum(points),0) from app_private.reward_ledger where user_id=uid and reward_date=local_today),'grants',earned);
end $$;
revoke all on function public.reconcile_rewards() from public,anon;
grant execute on function public.reconcile_rewards() to authenticated;

-- Language-layer state is private, caller-owned, and not exposed by PostgREST.
create table app_private.ai_generations (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,
 task text not null check(task in ('explainRecommendation','parseFoodLog','suggestMeals','explainExercise','summarizeWeek')),
 context_hash text not null check(context_hash ~ '^[a-f0-9]{64}$'),model text not null,prompt_version text not null,
 status text not null default 'reserved' check(status in ('reserved','success','fallback')),
 created_at timestamptz not null default now(),completed_at timestamptz,error_code text
);
create index ai_generations_owner_created on app_private.ai_generations(user_id,created_at);
alter table app_private.ai_generations enable row level security;
create policy read_own_ai_generations on app_private.ai_generations for select to authenticated using((select auth.uid())=user_id);
create policy insert_own_ai_generations on app_private.ai_generations for insert to authenticated with check((select auth.uid())=user_id and created_at=transaction_timestamp() and status='reserved');
create policy update_own_ai_generations on app_private.ai_generations for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create table app_private.ai_cache (
 user_id uuid not null references auth.users on delete cascade,task text not null,context_hash text not null,
 model text not null,prompt_version text not null,output jsonb not null,expires_at timestamptz not null,
 primary key(user_id,task,context_hash,model,prompt_version)
);
alter table app_private.ai_cache enable row level security;
create policy own_ai_cache on app_private.ai_cache to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
grant usage on schema app_private to authenticated;
grant select,insert on app_private.ai_generations to authenticated;
grant update(status,completed_at,error_code) on app_private.ai_generations to authenticated;
grant select,insert,update,delete on app_private.ai_cache to authenticated;
create function public.ai_begin(p_task text,p_hash text,p_model text,p_version text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); cached jsonb; gid uuid;begin
 if uid is null or not exists(select 1 from public.profiles where user_id=uid) then raise exception 'NOT_AUTHENTICATED';end if;
 if p_task not in ('explainRecommendation','parseFoodLog','suggestMeals','explainExercise','summarizeWeek') or length(p_model)>200 or length(p_version)>20 then raise exception 'INVALID_INPUT';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,9));
 delete from app_private.ai_cache where user_id=uid and expires_at<=now();
 select output into cached from app_private.ai_cache where user_id=uid and task=p_task and context_hash=p_hash and model=p_model and prompt_version=p_version and expires_at>now();
 if cached is not null then return jsonb_build_object('state','cached','output',cached);end if;
 if exists(select 1 from app_private.ai_generations where user_id=uid and task=p_task and context_hash=p_hash and model=p_model and prompt_version=p_version and created_at>now()-interval '30 seconds') then return jsonb_build_object('state','pending');end if;
 if (select count(*) from app_private.ai_generations where user_id=uid and created_at>now()-interval '1 minute')>=5 or (select count(*) from app_private.ai_generations where user_id=uid and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')>=20 then return jsonb_build_object('state','limited');end if;
 insert into app_private.ai_generations(user_id,task,context_hash,model,prompt_version) values(uid,p_task,p_hash,p_model,p_version) returning id into gid;
 return jsonb_build_object('state','reserved','id',gid);
end $$;
create function public.ai_finish(p_id uuid,p_output jsonb,p_error text,p_ttl integer) returns void
language plpgsql security invoker set search_path='' as $$
declare g app_private.ai_generations;begin
 select * into strict g from app_private.ai_generations where id=p_id and user_id=auth.uid() for update;
 if g.status<>'reserved' then return;end if;
 if p_ttl<0 or p_ttl>2592000 or octet_length(p_output::text)>20000 then raise exception 'INVALID_INPUT';end if;
 update app_private.ai_generations set status=case when p_error is null then 'success' else 'fallback' end,error_code=left(p_error,80),completed_at=now() where id=p_id;
 if p_error is null and p_ttl>0 and g.task in ('explainRecommendation','summarizeWeek','explainExercise') then
 insert into app_private.ai_cache(user_id,task,context_hash,model,prompt_version,output,expires_at) values(g.user_id,g.task,g.context_hash,g.model,g.prompt_version,p_output,now()+make_interval(secs=>p_ttl))
 on conflict(user_id,task,context_hash,model,prompt_version) do update set output=excluded.output,expires_at=excluded.expires_at;
 end if;
end $$;
revoke all on function public.ai_begin(text,text,text,text),public.ai_finish(uuid,jsonb,text,integer) from public,anon;
grant execute on function public.ai_begin(text,text,text,text),public.ai_finish(uuid,jsonb,text,integer) to authenticated;

-- AI never calls this function: the user explicitly confirms a deterministic draft.
create function public.log_food_batch(p_date date,p_items jsonb) returns integer
language plpgsql security invoker set search_path='' as $$
declare item jsonb; f public.foods; prior public.nutrition_logs; lid uuid; amount numeric; slot text; count_items integer:=0;begin
 if auth.uid() is null then raise exception 'NOT_AUTHENTICATED';end if;
 if p_date is null or p_date>(now() at time zone 'Africa/Blantyre')::date or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 20 then raise exception 'INVALID_INPUT';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,10));
 if (select count(distinct value->>'id') from jsonb_array_elements(p_items))<>jsonb_array_length(p_items) then raise exception 'INVALID_INPUT';end if;
 for item in select value from jsonb_array_elements(p_items) loop
 lid:=(item->>'id')::uuid;amount:=(item->>'grams')::numeric;slot:=item->>'slot';
 if lid is null or amount is null or amount<=0 or amount>10000 or slot is null or slot not in ('breakfast','lunch','snack','dinner') then raise exception 'INVALID_INPUT';end if;
 select * into strict f from public.foods where id=(item->>'foodId')::uuid and is_active;
 if f.calories_per_100g is null or f.protein_per_100g is null or f.carbs_per_100g is null or f.fat_per_100g is null then raise exception 'INVALID_INPUT';end if;
 select * into prior from public.nutrition_logs where id=lid;
 if prior.id is not null then
 if prior.user_id<>auth.uid() or prior.date<>p_date or prior.meal_type<>slot or (select count(*) from public.nutrition_log_items where nutrition_log_id=lid)<>1 or not exists(select 1 from public.nutrition_log_items where nutrition_log_id=lid and food_id=f.id and grams=amount and user_id=auth.uid()) then raise exception 'CONFLICT';end if;
 else
 perform public.log_food(lid,p_date,slot,f.id,amount);
 if not exists(select 1 from public.nutrition_logs where id=lid and user_id=auth.uid()) then raise exception 'CONFLICT';end if;
 end if;
 count_items:=count_items+1;
 end loop;
 return count_items;
end $$;
revoke all on function public.log_food_batch(date,jsonb) from public,anon;
grant execute on function public.log_food_batch(date,jsonb) to authenticated;

-- Private bulking companion: reference data is read-only; all personal rows are owned.
create table public.profiles (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users on delete cascade,
 first_name text not null, height_cm numeric not null check(height_cm between 50 and 260),
 starting_weight_kg numeric not null check(starting_weight_kg>0), goal_weight_kg numeric not null check(goal_weight_kg>0),
 start_date date not null, target_date date, training_experience text default 'beginner',
 training_days_per_week integer not null default 4 check(training_days_per_week between 1 and 7),
 water_target_ml integer not null default 2500 check(water_target_ml>0), track_creatine boolean default false,
 currency text not null default 'MWK' check(currency='MWK'), timezone text not null default 'Africa/Blantyre' check(timezone='Africa/Blantyre'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.user_preferences (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users on delete cascade,
 diet_type text default 'omnivore', budget_mode text default 'balanced', meals_per_day integer default 4 check(meals_per_day between 1 and 8),
 units text default 'metric', notifications_enabled boolean default false
);
create table public.foods (
 id uuid primary key default gen_random_uuid(), user_id uuid references auth.users on delete cascade,
 name text not null, local_name text, category text not null, preparation_state text not null,
 calories_per_100g numeric check(calories_per_100g>=0), protein_per_100g numeric check(protein_per_100g>=0),
 carbs_per_100g numeric check(carbs_per_100g>=0), fat_per_100g numeric check(fat_per_100g>=0), fiber_per_100g numeric,
 serving_name text default '100 g', serving_grams numeric default 100 check(serving_grams>0),
 source text not null, source_reference text, source_year integer, common_in_malawi boolean default false,
 availability text default 'common', is_active boolean default true, created_at timestamptz default now()
);
create table public.food_prices (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 food_id uuid not null references public.foods, price_mwk numeric not null check(price_mwk>0),
 quantity numeric not null check(quantity>0), unit text not null check(unit='g'), place text,
 recorded_at timestamptz not null default now()
);
create table public.meals (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 name text not null, description text, meal_type text, is_favorite boolean default false, unique(id,user_id)
);
create table public.meal_items (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 meal_id uuid not null, food_id uuid not null references public.foods, grams numeric not null check(grams>0), sort_order integer default 0,
 foreign key(meal_id,user_id) references public.meals(id,user_id) on delete cascade
);
create table public.nutrition_targets (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 version integer not null check(version>0), effective_from date not null, effective_to date,
 calories_target integer not null check(calories_target between 500 and 10000), protein_target_g integer not null check(protein_target_g>0),
 carbs_target_g integer not null check(carbs_target_g>=0), fat_target_g integer not null check(fat_target_g>0),
 reason text, created_from_recommendation_id uuid, created_at timestamptz default now(), unique(user_id,version),
 check(effective_to is null or effective_to>=effective_from)
);
create unique index nutrition_one_active on public.nutrition_targets(user_id) where effective_to is null;
create table public.nutrition_logs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 date date not null, meal_type text not null check(meal_type in ('breakfast','lunch','dinner','snack')),
 meal_id uuid, logged_at timestamptz not null default now(), unique(id,user_id),
 foreign key(meal_id,user_id) references public.meals(id,user_id)
);
create table public.nutrition_log_items (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 nutrition_log_id uuid not null, food_id uuid not null references public.foods,
 grams numeric not null check(grams>0), name text not null,
 calories numeric not null check(calories>=0), protein_g numeric not null check(protein_g>=0),
 carbs_g numeric not null check(carbs_g>=0), fat_g numeric not null check(fat_g>=0),
 foreign key(nutrition_log_id,user_id) references public.nutrition_logs(id,user_id) on delete cascade
);
create table public.exercises (
 id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null,
 primary_muscle text not null, secondary_muscles jsonb default '[]', movement_pattern text,
 equipment text not null, exercise_type text default 'strength', difficulty text default 'beginner',
 instructions jsonb default '[]', common_mistakes jsonb default '[]',
 default_rep_min integer default 8, default_rep_max integer default 12, default_rest_seconds integer default 120,
 progression_increment_kg numeric default 2.5, illustration_url text, source text, source_license text, is_active boolean default true
);
create table public.available_equipment (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 equipment_type text not null, is_available boolean default true, notes text, unique(user_id,equipment_type)
);
create table public.gym_load_options (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 exercise_id uuid references public.exercises, equipment_type text not null,
 increment_kg numeric not null check(increment_kg>0), minimum_kg numeric not null default 0 check(minimum_kg>=0),
 maximum_kg numeric not null check(maximum_kg>minimum_kg)
);
create table public.training_programs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 version integer not null, name text not null, phase text not null default 'base', effective_from date not null, effective_to date,
 created_from_recommendation_id uuid, unique(user_id,version), unique(id,user_id), check(effective_to is null or effective_to>=effective_from)
);
create unique index training_one_active on public.training_programs(user_id) where effective_to is null;
create table public.program_weeks (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 training_program_id uuid not null, week_number integer not null, phase_week integer not null default 1, goal text,
 unique(id,user_id), foreign key(training_program_id,user_id) references public.training_programs(id,user_id) on delete cascade
);
create table public.workout_templates (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 program_week_id uuid not null, name text not null, day_of_week integer not null check(day_of_week between 0 and 6),
 sort_order integer not null default 0, estimated_minutes integer default 45, unique(id,user_id),
 foreign key(program_week_id,user_id) references public.program_weeks(id,user_id) on delete cascade
);
create table public.workout_template_exercises (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 workout_template_id uuid not null, exercise_id uuid not null references public.exercises,
 sort_order integer not null, sets integer not null check(sets between 1 and 10),
 rep_min integer not null check(rep_min>0), rep_max integer not null check(rep_max>=rep_min),
 target_rir integer default 2 check(target_rir between 0 and 5), rest_seconds integer default 120,
 planned_weight_kg numeric not null default 0 check(planned_weight_kg>=0),
 foreign key(workout_template_id,user_id) references public.workout_templates(id,user_id) on delete cascade
);
create table public.workout_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 workout_template_id uuid not null, session_date date not null, started_at timestamptz not null default now(),
 completed_at timestamptz, status text not null default 'in_progress' check(status in ('planned','in_progress','completed','abandoned')),
 duration_seconds integer, notes text, unique(id,user_id), unique(user_id,workout_template_id,session_date),
 foreign key(workout_template_id,user_id) references public.workout_templates(id,user_id)
);
create unique index one_running_workout on public.workout_sessions(user_id) where status='in_progress';
create table public.exercise_sets (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 workout_session_id uuid not null, exercise_id uuid not null references public.exercises,
 set_number integer not null check(set_number between 1 and 20), weight_kg numeric not null check(weight_kg>=0),
 reps integer not null check(reps between 0 and 1000), rir integer check(rir between 0 and 5),
 is_warmup boolean not null default false, is_completed boolean not null default true,
 completed_at timestamptz not null default now(), unique(workout_session_id,exercise_id,set_number),
 foreign key(workout_session_id,user_id) references public.workout_sessions(id,user_id) on delete cascade
);
create table public.weight_logs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 date date not null, weight_kg numeric not null check(weight_kg between 20 and 500), logged_at timestamptz default now(), unique(user_id,date)
);
create table public.body_measurements (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 date date not null, waist_cm numeric check(waist_cm>0), chest_cm numeric check(chest_cm>0),
 arm_cm numeric check(arm_cm>0), thigh_cm numeric check(thigh_cm>0), unique(user_id,date)
);
create table public.progress_photos (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 date date not null, view text not null check(view in ('front','side','back')), storage_path text not null unique,
 weight_kg numeric, phase text, check(split_part(storage_path,'/',1)=user_id::text)
);
create table public.recovery_logs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 date date not null, sleep_hours numeric not null check(sleep_hours between 0 and 24), energy integer not null check(energy between 1 and 5),
 soreness integer not null check(soreness between 1 and 5), stress integer not null check(stress between 1 and 5),
 recovery_score numeric not null check(recovery_score between 0 and 100), status text not null, unique(user_id,date)
);
create table public.water_logs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 date date not null, amount_ml integer not null check(amount_ml between 1 and 10000), logged_at timestamptz default now()
);
create table public.daily_checkins (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 date date not null, weight_logged boolean default false, nutrition_logged boolean default false,
 workout_requirement_met boolean default false, recovery_logged boolean default false, water_logged boolean default false,
 completed_actions integer default 0, required_actions integer default 5, completion_percentage numeric default 0,
 day_completed boolean default false, completed_at timestamptz, unique(user_id,date)
);
create table public.weekly_analyses (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 period_start date not null, period_end date not null, raw_analysis jsonb not null, data_completeness numeric not null,
 confidence numeric not null, created_at timestamptz default now(), unique(user_id,period_start,period_end), unique(id,user_id)
);
create table public.recommendations (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 weekly_analysis_id uuid not null, type text not null, status text not null default 'pending' check(status in ('pending','accepted','rejected','expired')),
 title text not null, description text, reason text not null, current_value numeric, recommended_value numeric, unit text,
 confidence numeric not null, source_period_start date not null, source_period_end date not null,
 payload jsonb not null default '{}', accepted_at timestamptz, rejected_at timestamptz, created_at timestamptz default now(),
 foreign key(weekly_analysis_id,user_id) references public.weekly_analyses(id,user_id),
 unique(weekly_analysis_id,type)
);
alter table public.profiles enable row level security;
grant select, insert, update, delete on public.profiles to authenticated;
create policy owner_access on public.profiles for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index profiles_owner_idx on public.profiles(user_id);
alter table public.user_preferences enable row level security;
grant select, insert, update, delete on public.user_preferences to authenticated;
create policy owner_access on public.user_preferences for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index user_preferences_owner_idx on public.user_preferences(user_id);
alter table public.food_prices enable row level security;
grant select, insert, update, delete on public.food_prices to authenticated;
create policy owner_access on public.food_prices for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index food_prices_owner_idx on public.food_prices(user_id);
alter table public.meals enable row level security;
grant select, insert, update, delete on public.meals to authenticated;
create policy owner_access on public.meals for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index meals_owner_idx on public.meals(user_id);
alter table public.meal_items enable row level security;
grant select, insert, update, delete on public.meal_items to authenticated;
create policy owner_access on public.meal_items for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index meal_items_owner_idx on public.meal_items(user_id);
alter table public.nutrition_targets enable row level security;
grant select, insert, update, delete on public.nutrition_targets to authenticated;
create policy owner_access on public.nutrition_targets for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index nutrition_targets_owner_idx on public.nutrition_targets(user_id);
alter table public.nutrition_logs enable row level security;
grant select, insert, update, delete on public.nutrition_logs to authenticated;
create policy owner_access on public.nutrition_logs for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index nutrition_logs_owner_idx on public.nutrition_logs(user_id);
alter table public.nutrition_log_items enable row level security;
grant select, insert, update, delete on public.nutrition_log_items to authenticated;
create policy owner_access on public.nutrition_log_items for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index nutrition_log_items_owner_idx on public.nutrition_log_items(user_id);
alter table public.available_equipment enable row level security;
grant select, insert, update, delete on public.available_equipment to authenticated;
create policy owner_access on public.available_equipment for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index available_equipment_owner_idx on public.available_equipment(user_id);
alter table public.gym_load_options enable row level security;
grant select, insert, update, delete on public.gym_load_options to authenticated;
create policy owner_access on public.gym_load_options for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index gym_load_options_owner_idx on public.gym_load_options(user_id);
alter table public.training_programs enable row level security;
grant select, insert, update, delete on public.training_programs to authenticated;
create policy owner_access on public.training_programs for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index training_programs_owner_idx on public.training_programs(user_id);
alter table public.program_weeks enable row level security;
grant select, insert, update, delete on public.program_weeks to authenticated;
create policy owner_access on public.program_weeks for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index program_weeks_owner_idx on public.program_weeks(user_id);
alter table public.workout_templates enable row level security;
grant select, insert, update, delete on public.workout_templates to authenticated;
create policy owner_access on public.workout_templates for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index workout_templates_owner_idx on public.workout_templates(user_id);
alter table public.workout_template_exercises enable row level security;
grant select, insert, update, delete on public.workout_template_exercises to authenticated;
create policy owner_access on public.workout_template_exercises for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index workout_template_exercises_owner_idx on public.workout_template_exercises(user_id);
alter table public.workout_sessions enable row level security;
grant select, insert, update, delete on public.workout_sessions to authenticated;
create policy owner_access on public.workout_sessions for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index workout_sessions_owner_idx on public.workout_sessions(user_id);
alter table public.exercise_sets enable row level security;
grant select, insert, update, delete on public.exercise_sets to authenticated;
create policy owner_access on public.exercise_sets for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index exercise_sets_owner_idx on public.exercise_sets(user_id);
alter table public.weight_logs enable row level security;
grant select, insert, update, delete on public.weight_logs to authenticated;
create policy owner_access on public.weight_logs for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index weight_logs_owner_idx on public.weight_logs(user_id);
alter table public.body_measurements enable row level security;
grant select, insert, update, delete on public.body_measurements to authenticated;
create policy owner_access on public.body_measurements for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index body_measurements_owner_idx on public.body_measurements(user_id);
alter table public.progress_photos enable row level security;
grant select, insert, update, delete on public.progress_photos to authenticated;
create policy owner_access on public.progress_photos for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index progress_photos_owner_idx on public.progress_photos(user_id);
alter table public.recovery_logs enable row level security;
grant select, insert, update, delete on public.recovery_logs to authenticated;
create policy owner_access on public.recovery_logs for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index recovery_logs_owner_idx on public.recovery_logs(user_id);
alter table public.water_logs enable row level security;
grant select, insert, update, delete on public.water_logs to authenticated;
create policy owner_access on public.water_logs for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index water_logs_owner_idx on public.water_logs(user_id);
alter table public.daily_checkins enable row level security;
grant select, insert, update, delete on public.daily_checkins to authenticated;
create policy owner_access on public.daily_checkins for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index daily_checkins_owner_idx on public.daily_checkins(user_id);
alter table public.weekly_analyses enable row level security;
grant select, insert, update, delete on public.weekly_analyses to authenticated;
create policy owner_access on public.weekly_analyses for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index weekly_analyses_owner_idx on public.weekly_analyses(user_id);
alter table public.recommendations enable row level security;
grant select, insert, update, delete on public.recommendations to authenticated;
create policy owner_access on public.recommendations for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index recommendations_owner_idx on public.recommendations(user_id);
alter table public.foods enable row level security;
grant select,insert,update,delete on public.foods to authenticated;
create policy read_foods on public.foods for select to authenticated using (user_id is null or (select auth.uid())=user_id);
create policy create_food on public.foods for insert to authenticated with check((select auth.uid())=user_id);
create policy edit_food on public.foods for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy delete_food on public.foods for delete to authenticated using((select auth.uid())=user_id);
create index foods_owner_idx on public.foods(user_id);
alter table public.exercises enable row level security;
grant select on public.exercises to authenticated;
create policy read_exercises on public.exercises for select to authenticated using(true);
create index nutrition_logs_date_idx on public.nutrition_logs(user_id,date);
create index weight_logs_date_idx on public.weight_logs(user_id,date);
create index recovery_logs_date_idx on public.recovery_logs(user_id,date);
create index workout_sessions_date_idx on public.workout_sessions(user_id,session_date);
create index water_logs_date_idx on public.water_logs(user_id,date);
create index daily_checkins_date_idx on public.daily_checkins(user_id,date);
create index body_measurements_date_idx on public.body_measurements(user_id,date);
create index weekly_analyses_date_idx on public.weekly_analyses(user_id,period_end);
create index exercise_sets_session_idx on public.exercise_sets(workout_session_id,exercise_id);
create index prices_recent_idx on public.food_prices(user_id,food_id,recorded_at desc);
create index pending_recommendations_idx on public.recommendations(user_id,status,created_at desc);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('progress-photos','progress-photos',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy personal_photo_read on storage.objects for select to authenticated using(bucket_id='progress-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy personal_photo_insert on storage.objects for insert to authenticated with check(bucket_id='progress-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy personal_photo_update on storage.objects for update to authenticated using(bucket_id='progress-photos' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='progress-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy personal_photo_delete on storage.objects for delete to authenticated using(bucket_id='progress-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);

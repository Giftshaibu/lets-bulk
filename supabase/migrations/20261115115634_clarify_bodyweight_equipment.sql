-- Bodyweight does not imply access to a pull-up bar.
update public.exercises set equipment='pullup_bar' where slug in ('pull-up','chin-up','hanging-leg-raise');
insert into public.exercises(name,slug,primary_muscle,equipment,instructions)
values('Prone Reverse Snow Angel','prone-reverse-snow-angel','Back','bodyweight','["Lie face down, lift your hands slightly and sweep your arms through a comfortable range with control."]') on conflict(slug) do nothing;

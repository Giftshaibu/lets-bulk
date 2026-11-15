insert into public.exercises(name,slug,primary_muscle,equipment) values
('Barbell Bench Press','barbell-bench-press','Chest','barbell'),
('Incline Dumbbell Press','incline-dumbbell-press','Chest','dumbbell'),
('Machine Chest Press','machine-chest-press','Chest','machine'),
('Cable Fly','cable-fly','Chest','cable'),
('Push-Up','push-up','Chest','bodyweight'),
('Lat Pulldown','lat-pulldown','Back','cable'),
('Pull-Up','pull-up','Back','bodyweight'),
('Barbell Row','barbell-row','Back','barbell'),
('Cable Row','cable-row','Back','cable'),
('Dumbbell Row','dumbbell-row','Back','dumbbell'),
('Chin-Up','chin-up','Back','bodyweight'),
('Overhead Press','overhead-press','Shoulders','barbell'),
('Dumbbell Shoulder Press','dumbbell-shoulder-press','Shoulders','dumbbell'),
('Lateral Raise','lateral-raise','Shoulders','dumbbell'),
('Rear Delt Fly','rear-delt-fly','Shoulders','dumbbell'),
('Pike Push-Up','pike-push-up','Shoulders','bodyweight'),
('Face Pull','face-pull','Shoulders','cable'),
('Barbell Curl','barbell-curl','Biceps','barbell'),
('Dumbbell Curl','dumbbell-curl','Biceps','dumbbell'),
('Hammer Curl','hammer-curl','Biceps','dumbbell'),
('Cable Curl','cable-curl','Biceps','cable'),
('Triceps Pushdown','triceps-pushdown','Triceps','cable'),
('Overhead Triceps Extension','overhead-triceps-extension','Triceps','dumbbell'),
('Close-Grip Push-Up','close-grip-push-up','Triceps','bodyweight'),
('Dumbbell Skullcrusher','dumbbell-skullcrusher','Triceps','dumbbell'),
('Back Squat','back-squat','Quads','barbell'),
('Leg Press','leg-press','Quads','machine'),
('Bulgarian Split Squat','bulgarian-split-squat','Quads','dumbbell'),
('Leg Extension','leg-extension','Quads','machine'),
('Bodyweight Squat','bodyweight-squat','Quads','bodyweight'),
('Goblet Squat','goblet-squat','Quads','dumbbell'),
('Romanian Deadlift','romanian-deadlift','Hamstrings','barbell'),
('Leg Curl','leg-curl','Hamstrings','machine'),
('Dumbbell Romanian Deadlift','dumbbell-romanian-deadlift','Hamstrings','dumbbell'),
('Single-Leg Glute Bridge','single-leg-glute-bridge','Hamstrings','bodyweight'),
('Hip Thrust','hip-thrust','Glutes','barbell'),
('Glute Bridge','glute-bridge','Glutes','bodyweight'),
('Reverse Lunge','reverse-lunge','Glutes','dumbbell'),
('Bodyweight Reverse Lunge','bodyweight-reverse-lunge','Glutes','bodyweight'),
('Standing Calf Raise','standing-calf-raise','Calves','bodyweight'),
('Seated Calf Raise','seated-calf-raise','Calves','dumbbell'),
('Plank','plank','Core','bodyweight'),
('Hanging Leg Raise','hanging-leg-raise','Core','bodyweight'),
('Cable Crunch','cable-crunch','Core','cable'),
('Dead Bug','dead-bug','Core','bodyweight'),
('Lying Leg Raise','lying-leg-raise','Core','bodyweight') on conflict(slug) do nothing;
insert into public.foods(name,category,preparation_state,source,source_reference,common_in_malawi) values('Nsima','staple','cooked','unverified placeholder','Nutrient values required before logging',true);
insert into public.foods(name,category,preparation_state,source,source_reference,common_in_malawi) values('Rice','staple','cooked','unverified placeholder','Nutrient values required before logging',true);
insert into public.foods(name,category,preparation_state,source,source_reference,common_in_malawi) values('Groundnuts','legume','roasted','unverified placeholder','Nutrient values required before logging',true);
insert into public.foods(name,category,preparation_state,source,source_reference,common_in_malawi) values('Beans','legume','cooked','unverified placeholder','Nutrient values required before logging',true);
insert into public.foods(name,category,preparation_state,source,source_reference,common_in_malawi) values('Usipa','fish','dried','unverified placeholder','Nutrient values required before logging',true);
insert into public.foods(name,category,preparation_state,source,source_reference,common_in_malawi) values('Chambo','fish','cooked','unverified placeholder','Nutrient values required before logging',true);
insert into public.foods(name,category,preparation_state,source,source_reference,common_in_malawi) values('Egg','other','boiled','unverified placeholder','Nutrient values required before logging',true);
insert into public.foods(name,category,preparation_state,source,source_reference,common_in_malawi) values('Milk','dairy','as sold','unverified placeholder','Nutrient values required before logging',true);
insert into public.foods(name,category,preparation_state,source,source_reference,common_in_malawi) values('Banana','fruit','raw','unverified placeholder','Nutrient values required before logging',true);
insert into public.foods(name,category,preparation_state,source,source_reference,common_in_malawi) values('Sweet potato','staple','boiled','unverified placeholder','Nutrient values required before logging',true);

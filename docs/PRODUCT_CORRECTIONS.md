# Beginner product corrections

The correction document is implemented within the existing TanStack Start,
Supabase and orange visual design. It is product input, not an instruction to
replace the framework or bypass data provenance.

## Implemented

- Five-step setup collects measurements, gaining goal, 6/8/12-month or custom
  timeline, optional adult estimation inputs, everyday activity, 3–5 selected
  training days, specific equipment, available foods and an optional MWK budget.
  The authenticated server estimates targets; users review energy/protein before
  saving. Adults supplying age/sex use Mifflin–St Jeor with activity factors;
  otherwise the app labels its weight/activity estimate as rough. Both start with
  a modest 250 kcal surplus. Changing a deadline never changes calories.
- Atomic initialization preserves existing accounts and plans. Three-day new
  plans use full-body sessions. Rescheduling retains exercise history through
  versioned plans. Benches, racks and individual machines have explicit
  requirements enforced in generation, substitutions and workout-start RPCs.
- Search → grams/portion → meal → add. Logged combinations can become saved meals.
  Custom creation is a fallback on a separate tools page. Food row menus expose
  nutrition and prices; custom foods also support editing and soft deletion.
  Historical logs keep nutrient snapshots. Food tools use labeled tabs rather
  than the former accordion hub.
- Settings has a dedicated route; the app-wide editable footer is removed.
- `logging_days` is a security-invoker view over persisted food, weight, completed
  sets, water, recovery, measurement and photo records. App views, draft workouts
  and profile creation cannot create logging days. Current/longest streaks remain
  distinct from full-plan completion. Historical completion records are retained.
- Progress opens on an original winding journey, with current, recorded-past,
  missed-past and locked-future states. Tapping a week opens evidence-based
  logging/workout/weight/photo/consistency details. Streak thresholds and recorded
  PR/photo/weigh-in counts are shown. Weight, Strength, Measurements and Photos
  have separate destinations. Quick weight logging has no measurements/photos
  accordions. Goal date and the implications of its pace remain visible.
- All 48 active exercises have locally hosted images, steps, mistakes, muscle and
  equipment guidance. Source, license, author and illustration style are stored
  in the database and the checked-in asset manifest. Source illustrations use the
  public-domain Free Exercise DB; exact variants without suitable reference art
  use original CC0 two-position schematics. A kettlebell reference variant is
  explicitly labeled for the dumbbell goblet squat. Bodyweight calf raises have
  bodyweight-specific art and steps. `EXERCISE_ASSET_LICENSE.txt` records terms.
- RIR is explained next to the workout logger. Energy and protein are the default
  nutrition view; carbohydrates/fats and plain-language target explanations are
  available on request. Existing explicit adaptation approvals remain intact.

## Outstanding external dependency: MAFOODS reuse rights

The official MAFOODS 2019 PDF was located from FAO's Africa INFOODS catalog:
https://www.fao.org/infoods/infoods/tables-and-databases/africa/en/

Source: https://dl.tufts.edu/downloads/g158bw806?filename=d217r336d.pdf
Repository record: https://dl.tufts.edu/concern/pdfs/d217r336d
Downloaded PDF SHA256:
`d26278b0ced953fc70b01d65e4051fa1ff8ca55d59a89f7137d0ba819cee908c`.
The PDF identifies MAFOODS 2019, first edition, July 2019, and the DNHA Malawi
Ministry of Health. The repository's rights statement is **Copyright Not
Evaluated** (http://rightsstatements.org/vocab/CNE/1.0/). The publication's
disclaimer is not a reuse license. No permission to redistribute the compilation
was established, so its numeric tables have **not** been imported or presented as
licensed. The Malawi-first seeded-food criterion is therefore **pending**.

The expanded 200-food USDA SR Legacy CC0 fallback catalog is loggable, including
bread, wheat products and generic beer. Local foods without verified nutrient values remain unavailable. No
USDA data is relabeled MAFOODS and no nsima/usipa/chambo nutrient values are
invented. Once reuse rights are established, import MAFOODS using food codes,
preparation states, per-100-g nutrients, source year and exact source references,
then prioritize those records ahead of regional and USDA fallbacks.

## Verification

55 automated tests cover domain behavior and real SQL migrations in PGlite,
including RLS isolation of logging days, generic/specific equipment distinction,
guided initialization idempotency, and full-body rescheduling. Playwright covers
onboarding, persistence, journey details, food logging/saved meals/contextual
menus, exercise image loading, Settings and mobile overflow. Only a disposable
account is used for hosted browser verification.

### Published verification

- Application commit: `e340e25` on `feat/persistent-bulking-app`.
- Live: https://giftshaibu-lets-bulk.giftshaibu.workers.dev
- Cloudflare version: `204fd4af-b237-4ed3-8760-cd9588a5255a`, deployed to 100%.
- TypeScript and ESLint pass (eight pre-existing Fast Refresh warnings).
- All 48 automated tests pass; Cloudflare production build/dry run passes.
- All three Playwright suites pass locally and on the live Worker. Live execution
  used a fresh disposable account and exercised the guided setup before testing
  persisted settings, sourced-food logging, accepted training changes, reloads,
  logging streaks, journey-week details, separate progress destinations, saved
  meals, contextual nutrition menus, every displayed exercise image and mobile
  overflow. The protected dashboard API returns HTTP 401 without authentication.
- Hosted reference-data verification reports 48/48 active exercises with complete
  image, license, author and instruction metadata. Test sessions were signed out
  globally, then only the two disposable test accounts and their synthetic rows
  were deleted. No disposable test accounts remain.

### Expanded food catalog verification

The catalog now has 200 loggable CC0 USDA reference foods, including bread,
wheat products, chapati/roti, common ingredients and generic regular/light beer.
Source-measured portions and aliases are documented in `FOOD_SOURCES.md` and the
200-record provenance manifest. Existing reference nutrient values, personal
foods, account state and historical logs are preserved by the idempotent seed.
MAFOODS-specific compilation reuse remains pending as described above.

Application commit: `1f8993b`; Cloudflare version:
`8d21169b-4d17-45b3-9385-9e58be94fef4` at 100% of traffic. TypeScript, ESLint
(no errors; eight existing warnings), the production build/dry run and all **55**
automated tests pass. All **four** browser suites pass on the live Worker. The new
browser case verifies whole-wheat search, a measured 32 g slice, 500 ml regular
beer (~216 kcal including alcohol), reload persistence, and saving a drink as a
meal using its actual gram quantity. Unit/SQL tests also verify source IDs,
idempotency, preservation of personal foods, aliases, source density, and keeping
alcoholic drinks out of nutritional replacement suggestions.

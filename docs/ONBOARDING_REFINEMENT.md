# Onboarding refinement

The five-step setup uses Chiuli's cream/orange/bark cards, tactile selection tiles, brown/orange number steppers, progress bar, mascot feedback, full-width Back/Continue actions, and informational bottom sheets. Weight, height, goal, timeline, optional age and optional weekly budget support direct value editing and stepping. Optional values remain absent until explicitly added. Training-day counts and goal weight are checked before advancing.

Changing an answer invalidates the preview. Back navigation preserves the entered answers. Preview/save controls lock while requests run, and stage headings receive focus after navigation. Narrow phones use one-column food/day options to keep labels readable. The onboarding gate shows only the contextual mascot.

Soya pieces are also an onboarding food preference and a shared loggable catalog entry. The entry is the USDA FNDDS dry TVP reference with everyday search aliases, separate from raw soybeans. Dry weight is required; no cooked yield or portion count was invented. See FOOD_SOURCES.md and SOYA_SOURCE_RECORD.json for provenance. Existing users and logs are preserved.

Validation: 139 unit/database tests passed, including migration loading and soya search/nutrient checks; TypeScript passed. The 320px browser test exercises all five stages, back-navigation persistence, training-day validation, equipment sheets, preview invalidation and final payloads. Production Worker build/dry run and live browser verification are recorded in the task result.

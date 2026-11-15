# Functionality requirement audit

Audit basis: the uploaded `CODEX_FUNCTIONALITY_IMPLEMENTATION.md` (SHA256
`517d82b94a4e4640d62c63a3cf5299bc25eac7f8c187f08ebc3738213f125878`). The user
chose TanStack Start and preservation of the existing UI. Next.js migration is
therefore superseded by the user's instruction.

## Core definition of done

| Requirement                                 | Status                         | Evidence                                                                                                 |
| ------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Profile persists                            | Implemented                    | `profiles`, setup and expanded Settings                                                                  |
| Nutrition targets persist and are versioned | Implemented                    | Atomic recommendation acceptance, PostgreSQL tests                                                       |
| Foods can be searched                       | Implemented                    | Food search; seven sourced reference entries plus personal foods                                         |
| Meals can be created and edited             | Implemented                    | Recipe editor and `save_meal` transaction                                                                |
| Food can be logged                          | Implemented                    | `log_food`, `log_meal`, nutrient snapshots and retry checks                                              |
| Daily nutrition totals are calculated       | Implemented                    | Dashboard service calculates totals from saved snapshots                                                 |
| Food prices can be recorded                 | Implemented                    | Gram-based prices in MWK                                                                                 |
| Budget metrics work                         | Implemented                    | Per-energy/protein costs, known-cost totals, missing-price counts, guarded monthly estimates             |
| Malawi-aware food substitutions             | Implemented with data boundary | Diet, availability, protein, energy, local-commonness and price ranking; no fabricated local-dish values |
| Workout program persists                    | Implemented                    | Versioned programs and workout/exercise lineage                                                          |
| Workout can start and resume                | Implemented                    | Transactional start, one active session, compatible-equipment checks                                     |
| Sets can be logged, edited and deleted      | Implemented                    | Set transaction; set-number limits; completed sessions are immutable                                     |
| RIR is stored                               | Implemented                    | Validated 0–5 RIR input                                                                                  |
| Workout can be completed                    | Implemented                    | Required working sets and atomic daily-completion refresh                                                |
| Previous performance loads correctly        | Implemented                    | Comparable history retains lineage through versions                                                      |
| Double progression works                    | Implemented                    | Comparable sessions, working sets, rep ranges, RIR and performance gate                                  |
| Next usable load works                      | Implemented                    | Exercise-specific increments and load bounds; specific options override generic ones                     |
| Weight can be logged                        | Implemented                    | Date upserts and local dates                                                                             |
| Weekly weight averages                      | Implemented                    | Domain engine and Progress cards                                                                         |
| Recovery logging and score                  | Implemented                    | Validated input and configurable weighted scoring                                                        |
| Measurements persist                        | Implemented                    | Partial updates preserve other measurements                                                              |
| Progress photos remain private              | Implemented                    | Private image-only bucket, UUID paths, sixty-second signed URLs                                          |
| Daily completion                            | Implemented                    | Configurable requirements, rest-day handling, transaction triggers                                       |
| Current and longest streaks                 | Implemented                    | Completed local dates; opening the app never counts                                                      |
| Dashboard reads real data                   | Implemented                    | Authenticated API and repository snapshot                                                                |
| Weekly analysis                             | Implemented                    | Immutable per-period review using a 28-day load window                                                   |
| Data completeness and confidence            | Implemented                    | Missing-day/adherence gates and explanations                                                             |
| Recommendations persist                     | Implemented                    | Automatic and explicitly requested proposals                                                             |
| Accept/reject recommendations               | Implemented                    | Idempotent resolution and stale-version guards                                                           |
| Accepted nutrition changes version targets  | Implemented                    | Tested transaction and rollback                                                                          |
| Accepted training changes version programs  | Implemented                    | Load, volume, seven-day deload, restoration and compatible exercise swaps                                |
| Frontend does not own adaptation rules      | Implemented                    | Pure domain engines and server summaries; React retains display/input state                              |
| Mutation input validation                   | Implemented                    | Zod and database constraints                                                                             |
| RLS protects private records                | Implemented                    | Owner predicates and composite child ownership; database isolation tests                                 |
| Domain and critical integration tests       | Implemented                    | Domain, service, PostgreSQL and browser regression suites                                                |

## Additional requested gaps

| Area                                              | Status                  | Evidence / boundary                                                                                    |
| ------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------ |
| Training frequency and equipment edits            | Implemented             | One-to-seven selected days; versioned schedule; compatible swaps remain proposals                      |
| Goal date, goal weight, height, experience        | Implemented             | Settings; a target date never forces faster gain                                                       |
| Configurable completion requirements              | Implemented             | At least one daily logging action; past days retain their evaluated policy                             |
| Weekly muscle volume and RIR trends               | Implemented             | Primary-muscle working sets/reps/added-load volume and RIR history                                     |
| Plateau and declining-performance handling        | Implemented             | Small volume proposals for stalls; declining performance prompts evaluation before added work          |
| Persistent recommendation expiry                  | Implemented             | Expiry transaction on reviews, expiry on acceptance, and stale/conflict handling                       |
| Deload restoration                                | Implemented             | Explicit proposal after seven days; no silent restoration or calorie overhaul                          |
| Observed maintenance calibration                  | Implemented             | At least 21 substantial food days, 10 sufficiently spread/recent weigh-ins, variability gate           |
| Weight projections                                | Implemented             | Conditional 4/8/12-week projections; hidden when history is insufficient                               |
| Source-backed common foods                        | Implemented             | Seven USDA SR Legacy fallback records with preparation, FDC IDs and source URLs                        |
| Verified nsima/usipa/chambo composition           | Requires validated data | Still explicitly unverified and unavailable for nutrient logging; regional composition is not invented |
| Exercise illustrations/animations                 | Optional assets absent  | The app does not fabricate licensed illustrations; storage is available for private progress images    |
| Scheduled reviews, AI explanations, wearable sync | Deferred by scope       | Manual deterministic review remains the V1 workflow                                                    |
| Separate backend/framework rewrite                | Excluded                | TanStack Start and Supabase are retained                                                               |

## Verification approach

PostgreSQL tests replay all migrations and exercise settings changes, schedule
expansion, private ownership, snapshots, lifecycle transactions, versioning,
substitution, expiry, deload/restore and historical completion rules. Domain and
service tests cover increments, lineage history, warm-ups, analytics, calibration
thresholds, incomplete prices and recommendation gating.

The expanded Chromium scenario uses a disposable account to verify onboarding,
settings persistence after reload, sourced food logging, a requested volume change,
explicit acceptance, and insufficient-history explanations. No owner records are
modified by test fixtures.

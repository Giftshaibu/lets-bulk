# Functionality implementation

The user explicitly chose **TanStack Start** over the attachment's Next.js proposal.
The existing shell, styling and route structure remain. The three referenced design
documents were not present in the repository.

## Implementation map

| Area                                                               | Implementation                                                           |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Authentication and client lifecycle                                | `src/features/app-data.tsx`, `src/lib/db/client.ts`                      |
| Validated authenticated API                                        | `src/lib/services/api.ts`, dispatched by `src/server.ts`                 |
| Typed database access                                              | `src/lib/repositories/app.repository.ts`, `src/lib/db/database.types.ts` |
| Dashboard/read models                                              | `src/lib/services/dashboard.service.ts`                                  |
| Nutrition, weight, recovery, training, streak and adaptation rules | `src/lib/domain/`                                                        |
| Weekly analysis and food budget/substitutions                      | `src/lib/services/review.service.ts`                                     |
| Forms and persistent screens                                       | `src/features/`, `src/routes/`                                           |
| Schema, ownership, Storage policies and transactions               | `supabase/migrations/`                                                   |
| Regression coverage                                                | `tests/domain.test.ts`, `tests/database.test.ts`, `tests/e2e/`           |

## Decisions

- Initial targets are user-confirmed. An arbitrary sample target is never silently saved.
- Initial programming uses four days; Settings supports one to seven days. Exercises are selected from confirmed
  equipment; bodyweight alone does not imply access to a pull-up bar.
- Working loads and actual logged sets are separate. Initial loads can be edited
  before any session for that template exists. Later proposed load changes version
  the program, leaving completed-session prescriptions intact.
- Reviews analyze the last completed week using the preceding fourteen days of
  observations, loaded from a 28-day window. Missing intake days lower adherence.
- Each user's review period is persisted once, with safe retries. If late data is
  added afterward, that saved review remains the record of the original analysis.
- Recommendations require enough observations and good adherence. Calorie adjustments
  are small; recovery comes before extra training stress. At most one progression/plateau training change is proposed per review. Changes wait for explicit acceptance.
- Recommendation acceptance checks the source target/program version and rejects stale
  or previously resolved decisions. Expired proposals are persisted as expired when reviewed or resolved; proposals older than fourteen days cannot be applied.
- Logs use Blantyre dates. Daily weight and recovery use date upserts. Meal logs,
  water additions and workout starts have retry-safe identifiers or unique keys.
- Database triggers update daily completion in the same transaction as logging.
  Rest days do not require a workout. Current and longest streaks use completed days,
  never visits. Completion policy is a domain input; defaults require weight,
  nutrition, recovery and water, plus a scheduled workout on training days.
- Budget numbers use the user's latest prices in grams and MWK. Unpriced items are
  reported, and monthly estimates remain unavailable when price coverage is incomplete.
  These are current-price estimates, not historical purchase receipts.
- Food substitutions prioritize protein and approximate energy, then local availability
  and price. Diet restrictions filter candidates. Suggestions never modify a meal.
- Food nutrients are snapshotted on logging. Unverified seed foods cannot be logged.
  The reference library contains 48 exercises, seven source-backed USDA fallback foods, and ten explicitly unverified local-food placeholders.
- Every personal table and child row has ownership policies; composite foreign keys
  prevent cross-owner parent links. Reference exercises are read-only. Custom foods
  belong to their creator; shared placeholders are read-only to ordinary accounts.
- Photos live in a private 5 MB image-only bucket under the user's UUID. Signed view
  URLs expire after sixty seconds. Upload failures clean up the newly uploaded object.
- No service-role key is used. The browser sends a session token, and the API resolves
  the user before validation, queries or mutation. Raw database errors are not returned.
- History reads paginate past Supabase's default 1,000-row response limit and batch
  independent reads. Foreign keys and common owner/date queries have indexes.

## Current boundaries

The implementation branch is pushed to GitHub, and the application is deployed to
Cloudflare Workers at https://giftshaibu-lets-bulk.giftshaibu.workers.dev. The Worker
serves the existing TanStack application and static assets; Supabase remains the
backend. See README.md for repeat deployments and the remaining Auth URL Dashboard
setting required before using email confirmation links.

This V1 uses manual weekly reviews. Cron, AI explanations, wearables, extra backends,
and automated training-volume/deload/substitution changes are not introduced.
Recovery advice remains advisory. Load, nutrition, volume, exercise swaps, seven-day deloads and explicit restoration are implemented as versioned, accepted changes. Recipe quantities are
entered in grams. More complex packaging, shopping receipts and population-specific
food composition imports can be added when validated data is available.

## Verification evidence

- TypeScript check and production build pass.
- ESLint reports no errors; the remaining warnings concern development fast-refresh exports.
- Domain and PostgreSQL regression tests cover trend/adherence gates, recovery,
  progression/load constraints, plateaus, streaks, ownership, snapshots, session
  lifecycle, atomic completion, review retries, plan versioning and transaction rollback.
- Live API checks exercised weight/recovery, food retries, reusable meals, budget totals,
  workouts, measurements, weekly reviews and private Storage upload/signed URL access.
- A real Chromium test exercised account onboarding, persistence through reload and
  primary screen rendering without page errors. Disposable test accounts and uploaded files are removed after verification.

## Supabase Auth setting

The final security-advisor check reports **leaked password protection disabled**.
All application-table RLS and function-security checks are clear. Enable compromised
password checks in the project's Auth password settings if available for its plan;
no billing plan or unrelated Auth configuration was changed by this implementation.

Guidance: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

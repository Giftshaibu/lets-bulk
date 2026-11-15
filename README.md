# Let's Bulk

A private bulking and strength companion built with **TanStack Start, React 19,
TypeScript and Supabase**. The existing Lovable visual design is preserved.

## Run locally

Use Node.js 24 or another Node version supported by the locked Vite release.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

`.env.example` points to the existing `lets-bulk` Supabase project using its
publishable key. It is safe to expose this key; authorization is enforced by Auth
and row-level security. Never add a service-role key to a `VITE_` variable.

Create your account, confirm your email if requested by Supabase, then sign in.
Complete the profile and confirm your initial nutrition targets. Onboarding creates
an equipment-aware four-day upper/lower program; Settings lets you choose the days.
Set your initial working loads before starting a workout, and record actual gym
increments to enable usable load recommendations.

Malawi foods are seeded as **unverified placeholders with no nutrient values**.
Add foods using a product label or a verified composition source before logging
food. The app does not silently turn sample data into personal history.

## Features

- Persistent profile, preferences, food library, reusable meals and daily logging.
- Nutrient snapshots preserve logged history when a food is edited.
- MWK food prices, cost comparisons, estimated food budgets and protein-aware swaps.
- Saved programs, initial loads, resumable workouts, set editing, rest timer and completion.
- Weight averages, strength history, measurements, recovery, water and real streaks.
- Private progress photos with short-lived signed URLs.
- Manual weekly reviews with data-completeness and adherence checks.
- Explicit accept/reject actions; nutrition and load changes create new plan versions.

## Architecture

```text
Existing React screens → authenticated /api requests → application services
                     → pure domain modules → repositories → Supabase
```

`src/server.ts` dispatches `/api/*` requests. The API validates input with Zod and
verifies each bearer token using Supabase Auth. Database queries use the caller's
session and RLS, including ownership checks on child records. Database functions
perform multi-row writes atomically without bypassing RLS.

Domain rules are in `src/lib/domain/`. The initial gain zone (0.15–0.30 kg/week),
150 kcal adjustment step, recovery weights and confidence thresholds are software
defaults in `config.ts`, not guarantees about individual physiology. No AI model
makes these decisions. See `docs/IMPLEMENTATION.md` for details and boundaries.

## Database changes

Migration files in `supabase/migrations/` are the schema source of truth. They have
been applied to the existing project; their versions match hosted migration history.
Do not replay them manually on that project.

For a fresh local Supabase stack, install the Supabase CLI, then use `supabase start`
and `supabase db reset`. Exercise and placeholder-food seeds are included in the
migrations. Set `.env.local` to the local URL and publishable/anon key for local
integration testing. The migrations also support a fresh hosted Supabase project.

For hosted changes, link the correct project, inspect `supabase migration list`,
review pending SQL, then apply migrations using the CLI or Supabase tools. Read CLI
`--help` for the installed version; CLI v3 changes hosted-target defaults.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Domain and PostgreSQL integration tests run without a hosted database or credentials.
Database tests use PGlite, apply every migration, and exercise RLS, transactions,
versioning, retry handling and immutable completed workouts. Storage policy tests
use a minimal local Storage schema; real uploads were also checked against Supabase.

For browser regression tests, run the dev server and supply credentials for a
**dedicated test account**:

```sh
E2E_EMAIL=... E2E_PASSWORD=... npm run test:e2e
```

The browser test writes synthetic logs. Optional configuration: `E2E_BASE_URL`,
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`, `E2E_PROXY`, `E2E_IGNORE_HTTPS_ERRORS` (for
local test environments only). Without credentials the browser test is skipped.

The apostrophe in the project folder exposes upstream route-splitter and Nitro
path-escaping bugs. `vite.config.ts` keeps routes in one bundle and escapes generated
Nitro polyfill paths, preserving the requested folder name and deployment preset.

## Cloudflare deployment

Live application: https://giftshaibu-lets-bulk.giftshaibu.workers.dev

The Worker is `giftshaibu-lets-bulk`, configured by `wrangler.jsonc`. Its static
assets are served by Cloudflare, while Supabase remains the private data backend.
Logs and sampled traces are enabled. Placement targets the existing Supabase
region, `aws:eu-west-1`. No paid-plan upgrade was requested or enabled.

To deploy an update from this checkout:

```sh
npx wrangler login
npm run deploy:check
npm run deploy
```

The deploy scripts build first and use the checked-in Wrangler configuration.
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` must be available at build
time, through `.env.local` or your build environment. Only the publishable key belongs
in a browser build. Automatic deployments from GitHub have not been configured;
this release was uploaded through the connected Cloudflare account.

Before using email confirmation links, open the project's
[Supabase Auth URL Configuration](https://supabase.com/dashboard/project/dbiddamqpbeueykajapg/auth/url-configuration)
and set **Site URL** to `https://giftshaibu-lets-bulk.giftshaibu.workers.dev`.
Add the same origin to **Redirect URLs**, retaining any localhost URLs needed for
local development. The connected Supabase tools do not expose Auth configuration
updates, so this Dashboard setting needs to be completed by the account owner.

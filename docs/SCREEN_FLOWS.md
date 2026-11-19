# Chiuli guided screens

## Food

Describe what you ate and Suggest a meal open `/food-helper` as full-screen guided chats. The header carries the compact date context; meal choices are tactile buttons. Descriptions produce an explicit food/amount review. Suggestions use a separate results view, followed by review. The chosen records and source portions determine displayed nutrients; unverified dishes never receive invented nutrient values.

Each item supports Add food, Adding, Added and safe retry. A draft's UUIDs and submitted values remain fixed after an attempted write, and the existing atomic batch endpoint handles one or multiple confirmed items. Back within the flow retains its draft; leaving the food helper ends that in-memory conversation. Suggestions remain scoped to today's remaining targets. Existing AI flags and deterministic fallbacks are unchanged.

Saved meals have their own library and editor at `/saved-meals`, including ingredient search, nutrient summaries, date/meal context, per-meal add feedback, and a fixed Save footer. Meal creation accepts an optional client-generated ID so retries update the same owned meal. Existing callers without an ID remain supported.

## Onboarding and choices

Food and equipment have searchable full-screen pickers with selected chips and fixed Done controls. The starting plan is a separate review view. Back/Edit answers preserves choices; edits invalidate the old preview. Main content scrolls independently of the fixed navigation footer. Native select and browser date controls have been replaced across feature and route screens: short choices are buttons, long choices use searchable pickers, and dates use compact triggers plus a date stepper. Android keyboard resizing is enabled through the viewport metadata.

## Training

Train now separates Today, Next session, and Your workouts from optional Adjust plan tools. Every workout has a dedicated page of illustrated exercise cards, and every exercise has a page with a large credited start/end demonstration and concise cues. Full instructions and credits are available in an information sheet. Existing images are labelled as start/end positions, pause is available, and reduced motion uses still images. During a session the exercise screen includes the set logger and tactile weight/reps/RIR controls.

The saved schedule remains authoritative. The current real profile is scheduled for Sunday, Monday, Wednesday and Friday in Africa/Blantyre, so Thursday is correctly a rest day. The screen explains this and still permits an explicitly confirmed one-off session. Missing plans show a repair state rather than a silent rest day. Active/completed one-offs remain visible on Today; completed one-offs also mark the weekly calendar.

Authenticated GET `/api/workouts` and `/api/workouts/:id` return current owned workout views (plus an existing running session's template). POST `/api/workout-sessions` accepts optional `allowUnscheduled`, default false. The new two-argument `start_workout` RPC validates ownership, latest effective program version, equipment and explicit one-off consent. The one-argument RPC remains compatible. Starts serialize per user, resume an existing active session, retain completed sessions, and do not move the weekly schedule. Session dates use the saved profile timezone; the current database permits Africa/Blantyre.

## Sign-out and validation

Sign out is a branded action with pending feedback. It disconnects this device's push subscription on a best-effort basis, signs out locally, clears authenticated caches and unmounts drafts. The installed Supabase client clears a local session even when server refresh-token revocation fails; the UI treats that as a completed local sign-out.

Local verification covers 147 unit/database cases, including one-off ownership, consent, retry identity, equipment rejection, overlapping program versions, schedule preservation and timezone dates. Mobile browser checks cover guided chat, suggestion results, adding/retry states, workout demos and one-off consent, saved-meal editing, sign-out, onboarding pickers, fixed actions, and the existing mascot/quest/layout behavior. Five older browser tests require dedicated disposable-account credentials and were skipped; no real user's workout or food logs were written for verification.

TypeScript and the production Cloudflare build/dry run pass. Lint has no errors and the eight existing Fast Refresh warnings. Hosted migrations are `20261119135919_one_off_workouts` and `20261119140142_current_workout_version_guard`; generated database types are refreshed. Both start RPC signatures remain security invoker, deny anonymous execution and allow authenticated execution under RLS.

Security advisors report only existing notices: the private, service-role-only reminder queue intentionally has RLS with no user policy ([advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)), and leaked-password protection remains disabled ([Supabase guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)). No paid plan or AI configuration was changed.

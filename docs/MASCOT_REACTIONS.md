# Chiuli mascot reactions

The later [quests and XP update](GAMIFICATION.md) supersedes the initial completed-
workout pose (now happy), adds a compact happy face using the existing identity
art, and introduces optional, reduced-motion-aware feedback. The original rollout
notes below describe the November 19 initial mascot integration.

The app uses the eight poses and five face expressions supplied in
`honey_badger_mascot_assets.zip`. White/black backgrounds were removed using the
image editing tool, then assets were consistently padded and exported as
transparent WebP: 384 × 384 poses and 192 × 192 faces. The ZIP and unmodified
originals remain in the session attachment/workspace. The three reference sheets
are not runtime assets. No original identity icons were changed.

## Placement and state

- The header has a separate **Chiuli status** button beside Settings. Its modal
  shows the full pose and textual reason. The brand, favicon, home-screen icon,
  navigation identity icon and current-week journey marker retain the original art.
- Each weight form has its own neutral/saving/result state. After a successful
  save, compare with the nearest _earlier dated_ entry, excluding replacements of
  the same date and any later entries. Higher → happy, lower → shocked, equal →
  grumpy, no prior → happy. Comparisons preserve stored numeric precision. Feedback
  clears on the next edit or when the form unmounts. Failure never celebrates.
- Dashboard/progress streak panels use intentional logging dates, not app visits
  or completion of every task. Milestones are 3, 7, 14, 30, 60 and 100 consecutive
  days, celebrated only after today's log. An active streak without today's log
  becomes at risk at **20:00** in the profile timezone (Africa/Blantyre fallback).
  Previously logged but broken streaks are sad; accounts without past logs are
  neutral. Refresh every minute, on window focus and when the tab becomes visible.
- Workout panels are running for in-progress and completed sessions, grumpy for
  explicitly abandoned sessions, neutral for no session/rest days. Saving and
  errors use their own operation path, so unrelated actions do not change them.
- Meal/food helpers and explanations show thinking while their own request runs,
  confident for ready results (including deterministic fallbacks), and shocked
  for actual request errors. Unlogged meals are not assumed skipped.
- Loading, failed saves, authentication errors, private photo actions and error/
  empty pages use appropriate compact or full variants alongside readable text.

## Independence and priority

Section state is never replaced by another section's state. Page-scoped
registrations feed only the header, in this order: loading/saving (60), error or
broken streak (50), weight drop/streak risk (40), celebration/completion (30),
flat/incomplete (20), active/normal (1/0). Without an overriding state the header
is confident. Registrations clean up when sections close, unmount or change page;
transient reactions are not stored in Supabase or browser storage.

Images are decorative because adjacent text conveys the meaning. They reserve
layout space, have no automatic motion and fall back to the existing identity
icon on asset failure. The status dialog supports keyboard dismissal and focus
return. Fitness targets, recommendations, logging semantics, public API payloads,
database schema and AI billing/inference flags are unchanged.

## Asset mapping

`public/mascots/pose-{neutral,happy,confident,thinking,grumpy,running,sad,shocked}.webp`
maps to supplied `pose0` through `pose7` respectively.
`face-{shocked,confident,grumpy,thinking,sad}.webp` maps to `face2` through `face6`.
Full poses are also used where no separate compact face was supplied.

## Verification

`tests/mascot.test.ts` covers comparisons, backdating/replacements, milestones,
20:00 and midnight boundaries, profile timezones, independent priorities and
workout/helper states. `tests/e2e/mascot.spec.ts` uses synthetic data and intercepted
API calls; it needs no real account and writes no real user records. It exercises
save states/failures, cleanup, the clock boundary, keyboard behavior, helper
fallbacks, workout states, all assets, image fallback, narrow/desktop layouts and
unchanged identity icons. Existing core tests remain part of validation.

Verified on 2026-11-19: all 120 unit/API/database tests passed, typecheck passed,
and lint reported no errors (eight existing Fast Refresh warnings). Production
build and deployment dry run passed. The mascot browser test passed locally and
on the live Worker with no JavaScript errors. It uses synthetic intercepted data,
not real user records. Worker version `9f10bb08-7840-4d28-b0c8-685ea872e545`
receives 100% of traffic; existing bindings and disabled inference flags were
verified after deployment.

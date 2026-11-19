# Chiuli quests, XP and mobile layout

The November 2026 update applies the mascot/gamification specification with the
agreed defaults: saved XP, no extra +25-per-quest stacking, independent section
reactions and the existing 20:00 page-priority warning. The brand artwork and
fitness engines are unchanged. There are no levels, leaderboards or paid rewards.

## Mobile and loading

Session/log loading renders only the thinking face; sign-in/onboarding retain the
identity icon. Food helper dialogs have a title/close-icon row, matching date and
select heights, padded arrows and a scrollable dynamic-viewport height. Today and
Food share equal-height macro tiles with aligned bars. Quest tiles use three
columns on narrow screens and five from the small breakpoint, wrap their labels,
and explicitly identify optional tasks. Recovery tiles stack when space is tight.

## Saved XP

| Saved achievement                   |  XP | Limit             |
| ----------------------------------- | --: | ----------------- |
| Weight                              |  50 | Per logged date   |
| Food in a meal slot                 |  15 | Per slot per date |
| Water                               |  15 | Per date          |
| Recovery                            |  15 | Per date          |
| Completed workout with working sets | 100 | Per date          |
| All four meal slots logged          |  40 | Per date          |
| All required quests complete        | 100 | Per date          |

Rewards accrue on logged dates from **2026-11-19** forward; older dates are not
backfilled. A completed quest day requires an intentional log and nonempty required
tasks. Calorie completion follows the existing 90–110% adherence rule, water uses
the saved target, and rest days exclude the training requirement. Invalid empty
completion policies remain prohibited by the existing database constraint.

`app_private.reward_ledger` is outside the exposed REST schema, has owner RLS,
generated fixed points, insert eligibility checks, and unique owner/date/kind/slot
keys. Authenticated users have no update/delete privilege and cannot insert a
points amount. Eligibility queries caller-owned saved facts; no service-role or
security-definer bypass is used. Auth-user deletion cascades ledger deletion.

`public.reconcile_rewards()` is an authenticated invoker RPC, serialized per owner
with an advisory lock. It reconciles eligible dates, returns only new grants plus
the saved totals, and never re-awards edits, replays, concurrent claims or
delete/re-add cycles. Earned points are not revoked after later edits. Ineligible
or missing records never receive points. Settings and effective programs/targets
remain the source of eligibility; no separate fitness logic changes are made.

The API adds `rewards: {totalXp,todayXp}` (or `null` while unavailable) to dashboard
data and optional top-level `{rewards:{totalXp,todayXp,grants}}` metadata to successful
eligible action responses. Existing `data` payloads are preserved. Reconciliation
has a three-second deadline and runs after the primary commit: XP outages do not
turn a successful log into an error. Refresh reconciliation repairs missed awards
without replaying reward notifications.

## Feedback and coaching

Quest and status panels show saved XP. Newly returned grants produce one combined
floating reward near the action; reading historical totals never replays it.
Daily completion/new milestones and newly saved weekly checkpoints animate the
Progress identity icon briefly. Tapping the streak pill opens Progress.

Compact happy reactions reuse the existing happy identity face; full celebrations
retain the supplied happy pose. Nutrition reactions use the user's target rather
than fixed calorie numbers. Scheduled training is confident, rest is neutral,
in-progress is running, completed is happy, and explicitly abandoned is grumpy.
Journey's current week is thinking until a log exists, then happy. Week navigation
and all landmark icons remain on the dedicated map page.

Primary buttons retain tactile presses. Mood changes pop, hero mascots float,
happy reactions have brief orange/gold confetti, and card mascots offer keyboard-
accessible tap encouragement. Reduced motion disables decorative animations.
Copy uses actual targets, required counts and saved facts. A single weight change
does not prove a surplus, prescribe a snack or mutate a recommendation. Weekly
review keeps the evidence in an expandable section and still requires Apply.

## Verification

Database tests cover ownership, forbidden grants, generated points, date limits,
retries, edits/re-adds, meal-slot and quest bonuses, and completed versus started
workouts. Service tests cover bounded/failed XP sync and unchanged core responses.
Browser tests use synthetic intercepted data for loading, 320/360/390/desktop
layout, enlarged labels, aligned macros, dialog controls, persistent totals,
non-replayed notifications, tap encouragement and reduced motion. A hosted
rollback-only fixture verified 50 XP on first weight save and no new grants on
retry, then confirmed no fixture account or reward records remained.

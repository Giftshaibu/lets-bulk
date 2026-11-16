# Focused Cloudflare Workers AI helpers

Let’s Bulk keeps TanStack Start, the existing Nitro Cloudflare module deployment,
Supabase authentication/RLS, sourced foods, the orange UI and its deterministic
fitness engine. There is no chat agent, conversation memory, model tool execution,
photo interpretation, public inference proxy, or AI Gateway dependency.

## Production configuration and free-only policy

The existing `wrangler.jsonc` defines native `AI` and existing `ASSETS` bindings.
`npm run types:cloudflare` regenerates Workers runtime/binding types from the
pinned Wrangler installation. These generated declarations are excluded from
ESLint. No additional inference SDK, API token, browser secret or provider key is
required. The server resolves the native environment using `cloudflare:workers`;
Nitro does not reliably forward the outer Worker's env argument into the SSR
handler, so the provider never relies on that argument.

The current catalog and model schema were verified before implementation:
`@cf/google/gemma-4-26b-a4b-it` supports chat completions, JSON output,
`max_completion_tokens`, and `chat_template_kwargs.enable_thinking=false`.
The provider reads the configured model rather than scattering IDs through the
app. Model changes need schema/quality checks, not fitness-engine changes.

**Live inference is disabled by default:**

- `AI_ENABLED="false"`
- `AI_FREE_TIER_CONFIRMED="false"`
- `CLOUDFLARE_AI_MODEL="@cf/google/gemma-4-26b-a4b-it"`

Both flags must explicitly be `"true"` to call the binding. The account's Workers
plan could not be inspected using the connector: its OAuth scopes do not include
billing subscriptions. The user chose to verify Workers Free before enabling AI.
Do not upgrade billing, buy credits, enable paid inference, or interpret request
counts as a guaranteed financial spending cap. Confirm Workers Free in the
Cloudflare dashboard before changing both flags. Workers Free provides the
platform's no-charge daily allocation and rejects further inference when its
allocation is exhausted. Cloudflare currently documents 10,000 Neurons/day,
resetting at 00:00 UTC. Other account workloads share that allowance. If the
account is Paid or its billing status cannot be confirmed, retain fallback-only
operation. Re-disable inference before any later billing-plan change.

No live model inference is needed for ordinary tests. The mock provider is
injected into test handlers; it cannot be selected through a browser request or
production environment flag. A deployment must include `{type:"ai",name:"AI"}`
and the three explicit configuration variables in upload metadata as well as
ASSETS and existing secrets/plain-text bindings; editing the source config alone
is insufficient when uploading through the connected deployment workflow.

References:
https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/
https://developers.cloudflare.com/workers-ai/configuration/bindings/
https://developers.cloudflare.com/workers-ai/platform/pricing/

## Five authenticated actions

The existing API handler authenticates every call with Supabase `getUser`, then
loads permitted source data. Client-supplied metrics, targets and user IDs are not
accepted. Responses use the existing `{data}` / `{error}` envelope. Helper data
contains `{source: "ai" | "cache" | "fallback", reason?, result}`. No raw provider
errors or credentials are returned.

| Endpoint | Accepted input | Behavior |
| --- | --- | --- |
| POST /api/ai/explain-recommendation | recommendationId | Explains the stored decision/values; manual proposals are identified as requested rather than invented evidence of a plateau |
| POST /api/ai/parse-food-log | text, date | Extracts names and explicit quantities, then searches verified accessible food records; never saves logs |
| POST /api/ai/meal-suggestions | mealType, availableFoodIds | Describes deterministic candidate combinations from confirmed ready-to-eat foods and today's remaining targets |
| POST /api/ai/explain-exercise | exerciseId | Simplifies stored instructions/mistakes while retaining original guidance and images |
| POST /api/ai/weekly-summary | reviewId | Summarizes the exact completed seven-day period; the saved recommendation retains its distinct fourteen-day assessment window |

All actions are explicit clicks. Recommendation Apply/Keep current still uses the
original deterministic endpoints. AI requests have independent pending state,
never the global core-action save lock. Closing or editing a helper invalidates
late responses so stale parsing cannot populate a different meal dialog.

The provider depends only on the native AI binding, not a database client.
Centralized/versioned prompts treat all supplied text as data, disable tool use,
and forbid invented targets, nutrition, prices, medical diagnoses and guarantees.
The model uses non-streaming JSON mode, temperature 0 for parsing and 0.2 for
explanations, at most 1,536 output tokens, at most 16 KB of serialized prompt
context, and a 12-second abort deadline. There are no automatic retries or
provider/model switches. JSON, strict Zod schemas, supplied candidate/food IDs,
recommendation identity/direction, and grounded numerical claims are validated.
Invalid, truncated, rejected, timed-out or unavailable results use deterministic
fallbacks. Original authoritative metrics, instructions and recommendation values
stay visible independently of generated prose.

Food descriptions are limited to 1,000 characters and twelve parsed items.
Quoted source spans must occur in the supplied text. Unsupported or ungrounded
quantities become missing quantities requiring confirmation. Obvious credentials,
bearer tokens, database URLs and email addresses are rejected before inference.
No auth tokens, progress photos, user identity or unrelated history enter model
context. No raw prompt/response bodies are written to application logs.

## Food review and deterministic calculation

Available foods begin with the onboarding choices and are explicitly confirmed.
Unknown local preparations remain unresolved: nsima is not replaced by raw flour
and does not receive invented macros. Parsing shows up to five verified matches
per item; the user must choose the exact preparation and review each amount.
Missing portions block saving unless the user explicitly skips that item.

Conversions use weighed grams, kilograms, source-measured liquid density, or a
compatible source serving. The app never assumes an arbitrary cup/egg/slice size
or 1 ml = 1 g. Nutrient previews and logs use actual food rows, never model totals.

Meal candidates are generated from up to eight confirmed eligible foods, using
half, one, one-and-a-half or two source servings (100 g when no portion exists),
and one to three ingredients. Raw cooking ingredients and alcoholic drinks are
excluded; diet rules apply. Candidates are ranked by normalized protein gap,
calorie gap, then known cost in budget mode and stable ordering. At most three
distinct ingredient combinations are supplied to the model. Missing prices stay
unknown. When both energy and protein targets are met, no inference is requested.
Selecting a suggestion opens the same editable confirmation draft; it does not
write a log or alter a target.

`POST /api/nutrition/logs/batch` is a separate deterministic endpoint accepting
`{date, items:[{id,foodId,grams,slot}]}` (1–20 items). Its invoker RPC validates
caller-visible active foods, known macros, dates, slots and gram bounds, then
commits the complete batch atomically. Stable per-item UUIDs make retries safe;
changing the content of a previously saved item ID produces a conflict rather
than silently overwriting or double logging. Failed saves keep the same draft
IDs and lock edits until the save is retried or the dialog is discarded.

## Private caching and usage

`app_private.ai_cache` and `app_private.ai_generations` have owner RLS and auth-user
cascade deletion. They are outside the exposed PostgREST schema. Invoker RPCs
bind ownership to `auth.uid()`; there is no service-role bypass. Generation
creation times cannot be updated, counters cannot be deleted, and backdated
reservations are rejected. Source hash, source entity, task, model and prompt
version identify results; caches are validated again before use.

Recommendation/weekly caches expire after 24 hours; exercise caches after 30 days.
Food parses and meal suggestions are not persisted in this cache. Raw sentences
are not stored. An advisory-locked reservation limits each user to five uncached
attempts/minute and twenty/UTC day, with a 30-second duplicate-context lease.
Errors and timeouts remain consumed attempts. Cache hits do not consume inference
quota. If reservation/storage fails, inference is skipped and the normal app
fallback is returned. Logs contain only task/model/request ID, elapsed time,
source/fallback and sanitized error code.

## Verification and rollout

Tests use the mock provider/native binding doubles and never require real model
calls. Coverage includes all five endpoints, authentication, source ownership,
private RLS, injection attempts, malformed/contradictory output, source IDs,
cache invalidation, missing configuration, rate limits, timeouts, sparse weekly
data, historical date windows, atomic batches and exact retry behavior. Browser
checks exercise normal fallback navigation, an intercepted parsed draft with an
unknown dish, explicit skipping/matching/portion confirmation, safe batch replay,
meal review without automatic saving, exercise simplification, unchanged targets,
and ignoring late parse responses after switching helpers.

Run typecheck, lint, tests and deployment dry run, then deploy to the existing
Worker and verify normal/fallback flows with a disposable account. Real inference
smoke tests stay pending until Workers Free is confirmed. Do not claim model
quality or live inference has been tested while inference is disabled.

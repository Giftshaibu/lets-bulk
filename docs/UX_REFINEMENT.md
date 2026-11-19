# Chiuli UX refinement

Implemented shared live header/Progress expressions, a single header mascot, tactile weight/date/water/sleep controls, accessible rating chips, bottom sheets for information and exercise guidance, equal Progress tiles, and Weekly Check-In on Progress. Exercise demos alternate the existing credited start/end positions; they are labelled, pausable, and static with reduced motion.

Settings supports kg/lb and ml/US fl oz while storing canonical kg/ml, and confirms manual calorie/protein changes before creating a target version. Fat stays constant and carbohydrates absorb the calorie/protein change. History and real user data are preserved. Daily-log date changes fetch that day's records.

## Browser push setup

The existing Cloudflare Worker includes a five-minute Cron Trigger and a push-only service worker. The VAPID private key is stored as a Worker secret; the public key and PUSH_ENABLED switch are in wrangler.jsonc. AI switches remain disabled as before.

To activate delivery, add `SUPABASE_SERVICE_ROLE_KEY` as an encrypted Worker secret on `giftshaibu-lets-bulk` (Cloudflare dashboard → Workers & Pages → worker → Settings → Variables and Secrets). Use this Supabase project's server-only service-role/secret key. Never put it in a VITE variable, repository, or browser code. The app reports push as unconfigured until every required binding exists.

Then open Settings on the live HTTPS site, select Connect this device, grant browser notification permission, enable reminders, and Save settings. Use Test notification to verify delivery. iOS requires a Home Screen installation and a supported iOS version. Browser/OS delivery policies still apply.

Morning defaults to 07:00 in the profile timezone and only sends if weight is missing. Evening reminders start at 20:00 for an at-risk existing logging streak. Per-device/day/type uniqueness, leases, bounded retries, eligibility rechecks and expired-device disabling prevent routine duplicate or stale sends. Water remains +15 XP. Reminders are opt-in and initially off.

## Verification

- 138 unit/database tests passed, including transactional target changes, stale-target rejection, ownership, reminder deduplication/retries, unit conversions, and encrypted Web Push payload generation.
- TypeScript and production Worker build/dry run passed. ESLint: no errors, eight existing Fast Refresh warnings.
- Browser regression checks cover 320px overflow, steppers/manual entry, sheet closing, Settings unit selection, target confirmation and payloads, reduced-motion exercise positions/pause, and local mascot reactions/shared priorities. Both browser regression specs also passed against the deployed HTTPS site before adding the extra exercise assertions; the expanded exercise assertions passed locally.
- Hosted migration `20261119125254_ux_settings_and_reminders` applied; generated database types refreshed. Reminder tables have RLS; dispatch functions are inaccessible to authenticated users and executable by service_role.
- Real closed-app push delivery requires the server secret and an opted-in device; it has not been verified from this workspace.

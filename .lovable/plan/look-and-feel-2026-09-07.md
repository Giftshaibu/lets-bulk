- Gift Bulk — core daily loop

A private, mobile-first bulking and strength app with four tabs: Today, Food, Train, Progress. Built with realistic sample data so every screen feels alive; nothing is saved between visits yet.

## Look and feel

Follows the uploaded design language: chunky rounded cards, thick 2px borders with a 4px bottom edge, bold Nunito type, big dominant numbers, large tap targets, warm off-white canvas.

Colour meanings:

- Orange #FF7A00 — brand, primary action, active
- Green #58CC02 — completed, target hit
- Gold #FFC800 — streak, milestone
- Blue #1CB0F6 — hydration, info
- Red #FF4B4B — missed, destructive
- Purple #CE82FF — personal records

No glassmorphism, no gradients, no thin grey hairlines.

## Screens

**App shell** — sticky bottom bar with the four tabs on phone; on desktop the same content centred at ~720px with the nav on the side.

**Today**

- Header with date and streak flame
- Daily progress ring/bar (calories, protein, workout, weight logged)
- "Next action" card that changes: meal due / workout due / weight missing / all done
- Nutrition summary with calorie and macro bars
- Today's workout card with start button
- Recovery card (sleep, soreness, energy)
- Weight trend mini chart
- Weekly recommendation card

**Food**

- Meal timeline for the day with logged items
- Remaining targets card
- Quick add chips for frequent foods
- Food search and detail sheet for logging portions

**Train**

- Today's workout with exercise list
- Recent progress highlights and week schedule
- Active workout flow: exercise-by-exercise set entry (weight, reps, RIR), rest timer, exercise completion, workout completion summary

**Progress**

- Summary stats (weight gained, streak, PRs)
- Weight chart with trend line
- Strength progress per main lift
- Body measurements list

## Interaction

Press-down button feel, progress bars that animate, satisfying completion states (card turns green), streak and PR celebration moments. Everything reachable with a thumb.

## Technical notes

- TanStack Start routes: `/` (Today), `/food`, `/train`, `/train/active`, `/progress`, plus food and exercise detail routes.
- Design tokens (colours, radii, type scale) go into `src/styles.css` as semantic tokens; Nunito loaded via a link tag in the root route.
- Sample data lives behind a typed service layer (`src/lib/data/*`) with the shapes from the spec's data model, so real endpoints can replace it later without touching components.
- Shared components: StatCard, ProgressBar, ChunkyButton, MealRow, SetRow, RestTimer, StreakBadge, empty and loading states.
- Per-route head metadata with app-specific titles and descriptions.

## Not in this build

Onboarding, plan page, weekly review flow, exercise/food libraries in full, settings, and saved data. These can follow once the daily loop feels right.
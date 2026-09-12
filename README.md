# Jacklet

Branding uses Jacklet with the subtitle “daily blackjack” and a spade favicon.
Progress version `jacklet-v3` starts a new game for all browsers: old runs, statistics,
sound preferences, and dismissed instructions are reset on the next load.
Old saved tokens are rejected and the recovery cookie is replaced automatically.
Change `PROGRESS_VERSION` in `lib/blackjack/progress.ts` only for a deliberate global
reset. Ordinary deployments preserve current progress.

## Interface

The run header and final result show hands won. Only settled wins count, including
natural blackjacks and dealer busts; pushes and losses do not. Final-card wins count
under the updated rules. Counts are reconstructed from signed actions when resuming, so
refreshing does not add wins. The primary score is 100 points per settled win plus
one point per revealed card, minus 100 per strike and cumulative joker costs. Hands played (including the current hand) and hands won
appear in smaller text. Sharing uses the Jacklet name, date, points, stars, and link.
Copy detailed result adds each player hand, with resolved jokers shown as 6🤡, for
example. Dealer cards are omitted. Current-day values are restored by signed replay.
The compact date and points row sits above the table. On mobile the header and
playing area fill at least the first viewport, expanding for larger hands; results
follow below with centered scoring and stacked sharing buttons in two columns.

The table animates new cards, the dealer hole-card flip, and removal between hands.
Inputs pause during transitions; reduced-motion preferences skip them. Hands overlap
with a minimum 32px exposed rank/suit strip. At supported phone widths, up to 11
player cards or 10 dealer cards fit into two rows. The site has a 320px minimum
width; narrower browser windows scroll horizontally rather than compressing cards.
The abbreviated rules modal is designed for common portrait phones, retaining
overflow scrolling as an accessibility fallback for zoomed text or short windows.
Optional sound effects use the browser's Web Audio API, with no external audio files.
Sound is off by default, can be toggled from the header, and the preference is saved
in the browser. Audio begins only after the player enables it and interacts with the game.
Wins use a bright rising two-note cue; losses use a rough falling cue. Completed
daily runs use a longer four-note finale: falling for 1–2 stars, rising for 3–5.
The finale replaces the last hand cue in both daily play and practice. Both use
the same three-strike rating thresholds; refresh and restart never replay a finale. Muting stops
active audio and suppresses sounds from pending game responses. Sound failures do
not interrupt gameplay, and hidden pages do not start sounds.

A Next.js / React daily blackjack survival game. Every player gets the same approved 52-card deck in the same order. Decisions change how the deck is consumed. The third loss ends the run; each loss deducts 100 points. The final card is included and the hand is scored normally; fewer than four remaining cards cannot start a new hand and stay undealt.

## Local setup

### Local practice

With the local development server running, open http://localhost:3000/practice.
Choose any scheduled date and use Restart run as often as you like. This tests
three persistent strikes, each costing 100 points, while wins still earn 100.
The third strike or deck exhaustion ends play. Negative scores are allowed.
Joker prices rise across the entire run and require sufficient current points.

Practice saves only its date and decisions in a separate sessionStorage key so
refreshing can resume the current tab. It never writes official progress, cookies,
statistics, streaks, or shared results. Stars use the same precomputed per-date three-strike ratings as the official game. Both the page and API return
404 outside development mode, including Vercel deployments and local production builds.
Keep the development server private; this gate is not authentication.

Official daily play and practice both use three strikes. The Neon integration
starts a fresh `jacklet-v3` generation; previous browser runs are not imported.
Deck order is unchanged.
See THREE_STRIKES_ANALYSIS.md for the 90-deck comparison.
Run `npm run strikes:analyze` to print ordinary-strategy results, or
`npm run strikes:analyze -- --oracle` to also calculate perfect-information ceilings.
The analysis reads the catalog and prints JSON; it never rewrites decks or ratings.

With Node.js 20.9+:

```sh
npm install
npm run cards:fetch
npm run dev
```

Skip installation if dependencies are already installed. `cards:fetch` downloads 54 CC0 SVG assets (52 cards, a back, and J-1 joker artwork) and their upstream license into `public/cards`; commit that folder. The game uses text fallbacks if art fails to load. Card assets are served locally and are not AI-generated.

## Validation

```sh
npm test
npm run typecheck
npm run build
```

The Neon setup procedure, tests, typecheck, and production build were completed
locally for this storage update. Live production recovery and persistence should
still be checked after deployment. Run these checks again after code changes. Tests cover
rules, escalating joker costs, resolved joker values, signed progress, automatic
resets, sharing, responsive card limits, date handling, anonymous identity,
concurrent requests, completed-run lockout, and failed-save recovery. Catalog checks validate
the original no-joker proofs; they do not evaluate joker strategies.

The tests cover ace totals, alternating deals, hidden cards, naturals, ties, soft 17, dealer draws, bust scoring, full/partial deck exhaustion, terminal action rejection, exhaustive score analysis, the entire approved catalog, signed tokens, spoiler-free sharing, participation streaks, and Eastern daylight saving transitions.

Suggested manual checks: first-visit help; hit/stand/next hand; refresh mid-hand and after a loss; both copy actions and native sharing; narrow phone layouts; dropped-request recovery; two tabs; and the Eastern midnight rollover. No replay button is offered for a completed daily run.

## Rules

During a player turn, Play joker immediately adds a joker to that hand. Prices start
at 50 points and rise by 50 after every purchase throughout the daily run:
50, 100, 150, and so on. Multiple purchases are allowed when affordable and at least one
deck card remains. Jokers take values from 1–11 to maximize the hand total without
busting, recalculating after every draw. Reaching 21 automatically stands; it is not
a natural blackjack. Jokers do not consume deck cards or increase cards turned.
Costs persist through signed replay and are deducted from both displayed points and
the final score used for stars. Detailed results display each joker's resolved value
followed by 🤡 (for example, 6🤡). Multiple jokers receive values in play order,
assigning the larger values to earlier jokers when several combinations are possible.
Compatibility logic for fixed-price runs remains in the server, but the progress
version reset rejects all tokens signed before the new game.

The original deck-curation catalog still describes no-joker play. Current ratings
live separately in lib/blackjack/ratings.json and include every affordable joker
choice, cumulative prices, persistent strikes, and negative final scores. All 90
dates were recalculated without changing any deck. Both APIs use those ratings;
no rating search runs during gameplay.

- One 52-card deck plus purchased jokers; no reshuffles, bets, splits, insurance, surrender, or doubles.
- Deal order: player, dealer up card, player, dealer hole card.
- Aces count as 1 or 11; face cards count as 10. Dealer stands on all 17s.
- Dealer checks for an initial blackjack when showing an ace or a ten-value card. A player's natural also settles immediately. A natural beats a non-natural 21; two naturals push.
- Hit or stand. A player reaching 21 automatically stands. A player bust ends the hand, adds a strike, reveals the hole card, and does not trigger dealer draws. The run continues if fewer than three strikes and enough cards remain.
- Wins, pushes, and the first two losses allow another hand when enough cards remain.
- Strikes persist through wins and cost 100 points each. The third loss ends the run.
- Every revealed card counts exactly once, including the losing hand and dealer hole card after settlement. Dealing a hidden hole card alone does not increment the card portion of the score. The combined score is 100 per settled win plus revealed cards, minus 100 per strike and all joker costs.
- Under `blackjack-v2`, the final card goes to the player or dealer drawing it and counts. Reveal the hole card and compare the hands normally, without further draws even if the dealer is below 17. Wins increase hands won; ties do not. The run ends regardless of the result.
- After a surviving hand, fewer than four cards remaining ends the run immediately with “Less than 4 cards remaining.” They are neither dealt nor counted, and no extra hand is created. Exactly four cards can form a final hand; naturals and ordinary comparisons apply.
- All scheduled decks retain their `blackjack-v2` source metadata; live gameplay uses the `three-strikes-v1` extension. Legacy engine and migration support remains for compatibility tests; tokens from before the progress-version reset cannot restore old runs.
- Starting the first hand counts toward the participation streak. Midnight is calculated in America/New_York, including daylight saving changes.

## Approved daily seeds

`lib/blackjack/catalog.json` contains 90 preanalyzed daily decks from **September 9 through December 7, 2026**. It is imported only by server code. Each entry includes the deck, seed, rules version, reachable card scores, combined point scores, star thresholds, and an optional surviving-to-end action path. A null path means no such path was found under the original no-joker rules. Surviving to the end may leave fewer than four cards undealt. No runtime search is required. The joker update leaves this catalog unchanged.

The analyzer exhaustively explores legal decisions and memoizes equivalent states. Publication requires a best achievable card count of at least **26**, at least 12 distinct final card scores, and achievable card scores in all five star bands. A route to 52 is optional. The shared `isPublishable` function controls these curation defaults. This rejects decks whose best possible run is very short; it does not prevent players from losing early or guarantee they can infer optimal choices from visible cards. The 26-card cutoff is a provisional playtesting choice. Ordinary-strategy difficulty curation remains a roadmap item.

Scores below 50 always earn one star; two stars start at 50. Each day's five-star
cutoff remains fixed at its previously calculated value, ceil(min + (max - min) * 4/5).
The three- and four-star cutoffs divide the interval from 50 to that cutoff into
three equal-width bands, rounding upward to whole points.
The best attainable point total always earns five stars. These are score ranges,
not player percentiles. The analyzer includes wins in its memoization key and stores
`pointScores` and `pointThresholds` alongside the original card-count curation data.
The existing short-run curation policy remains based on cards; point bands may have gaps.
Negative results always earn one star.
Stars measure attainable score range, not player percentiles. Each deck's best score
always earns five stars. Run ratings:generate after appending dates; it preserves
existing ratings and fails without saving if a new analysis exceeds its state limit.
All 90 scheduled decks retain their order and rules, with new point ratings calculated
offline. No future cards, attainable ranges, or thresholds are exposed in the UI or API.

Before the schedule expires, append more approved days:

```sh
npm run seeds:generate -- 30
npm run ratings:generate
npm test
```

Commit and deploy the updated catalog. Generation appends after the last scheduled date and never overwrites an existing date. Missing dates return an explicit unavailable response rather than silently reusing a deck or supplying an unverified seed. During the prototype, changes to an active day's rules, deck, or scoring should accompany a deliberate generation reset. Once launched, keep published daily challenges stable.

## Vercel and the existing secret

Link previews include Open Graph metadata, an X/Twitter large-image card, and a
1200×630 PNG rendered from the Jacklet colors and spade logo. The preview is public
and contains no game state. Set SITE_URL to your full public HTTPS origin if using
a custom domain; otherwise Vercel's production URL is used automatically.
After building, check /opengraph-image and share the deployed public URL.
Messaging services may cache earlier previews, and private/password-protected
deployments cannot supply a public preview.

Keep the existing `PUZZLE_SECRET` environment variable in Vercel. It now **signs saved action histories**, rather than generating answers. Use the same stable secret across instances and deployments. A local fallback is provided in development; production requires an explicit value. Changing it invalidates saved run tokens. Never prefix it with `NEXT_PUBLIC_`.

Use a normal Next.js deployment, not static export. Official production storage uses Neon and `@neondatabase/serverless`. Assets should be committed before deployment, and the seed catalog should remain in the private repository: making the repository public exposes future decks and solutions even though they are not sent to browsers.

## Persistence and one-run limits

Current-day progress is replayed and validated on the server. The API returns only current visible cards and previously revealed cards, never the hidden card or future deck. Signed tokens prevent clients from fabricating arbitrary action histories. Browser storage retains local participation statistics. Web Locks serialize player actions between tabs when available. In database-free development and previews, the signed run cookie and browser history provide recovery; with Neon, recovery uses the database record identified by the player cookie.

When Neon is configured, the database is authoritative: signed browser histories cannot overwrite it. An anonymous, signed HttpOnly `jacklet-player` cookie identifies the browser. Each action updates one daily record atomically; stale tabs and duplicate requests receive the saved state instead of applying another action. Reloading recovers a committed action even if its response was lost. Completed runs cannot change. Clearing the player cookie or using a different browser still creates a new identity; this is not one-person enforcement. Accounts are deferred.

## Neon storage setup

1. Put `DATABASE_URL` and/or `DATABASE_URL_POOLED` in `.env.local`. Runtime prefers the pooled URL; schema setup prefers the direct URL. Both must target the same database/branch. Keep these and `PUZZLE_SECRET` server-only.
2. Run `npm install` to install the new driver and update `package-lock.json`.
3. Run `npm run db:setup` once against the configured database. It creates `jacklet_runs` and its index transactionally without deleting existing results. Alternatively, execute `db/schema.sql` in Neon's SQL editor. Future schema changes need explicit migrations; rerunning setup does not alter existing columns.
4. Run `npm test`, `npm run typecheck`, and `npm run build`, then restart the local server.
5. Commit the updated lockfile with the implementation and deploy. Production environment variables are already configured in Vercel; the table must exist before deployment.

Setup is complete for the current prototype database. Ordinary deployments do not
need another `db:setup`. Vercel currently has database variables for Production only;
Preview deployments intentionally use browser-only progress. After the first
production deployment, deal, refresh, and inspect `/api/stats` in the same browser
to confirm that the production connection works. The stats response should show
one started run; completing it should increment completed and populate recent results.

`VERCEL_ENV` separates production and preview records; local development uses `development`, and a local production build uses `production`. Use a separate Neon branch for local production testing if it must not share production records. Practice never calls the database. Preview deployments with no database variables retain browser-only gameplay; production requires working database configuration and returns a recoverable error if it is missing or unavailable. A configured database failure never silently falls back to browser-only saves.

Visiting the game does not insert a run. The first deal records its start; subsequent actions update progress and the last action records completion. Stored fields include anonymous identity, puzzle date, generation, rules version, decisions, score, stars, cards revealed, hand counts, strikes, joker purchases, and server timestamps. No IP addresses, emails, hidden/future deck data, or practice results are stored. Start-to-completion time is elapsed time, including breaks, not measured active play time. An unfinished record is not proof of abandonment.

`GET /api/stats` returns only the current cookie's started/completed counts, best and average completed score, and ten recent completed results. No player ID can be supplied in the URL. Negative scores are included; no completed results gives null best/average. This endpoint prepares the stats modal; the existing interface still uses local participation statistics. No third-party analytics has been added.

### Prototype resets

This is a disposable prototype. Bump `PROGRESS_VERSION` in `lib/blackjack/progress.ts` and redeploy/restart to start a fresh generation. This invalidates run tokens and player identities, switches browser history/preferences to fresh keys, and excludes all previous database generations. Decks and rules are unaffected. Old database rows remain until deliberately deleted; old local keys are ignored. Ordinary deployments do not reset progress.

For physical cleanup, after the new generation is deployed, use Neon's SQL editor to inspect rows grouped by `environment, generation` and delete only the retired generations for the intended environment. Do not truncate the table on a live generation: existing browsers would retain their old local history. Schema setup never deletes data. Keep obsolete deployments from accepting traffic after a reset.

Manual storage checks: deal once, refresh, and verify one row with revision 1; submit competing actions from two tabs and verify only one advances; finish and refresh to verify the result is unchanged; visit `/api/stats` in that browser; confirm another browser has no history; play `/practice` and verify no records change. Simulate a dropped response and recover the accepted revision. Test a database outage and confirm Recover run works once service returns. Tests use an in-memory store for request orchestration; these manual checks also verify real PostgreSQL behavior.

## Main files

- `lib/blackjack/engine.mjs`: deterministic rules, shuffle, exhaustive analyzer, score bands.
- `lib/blackjack/catalog.json`: approved daily decks and proofs, server-only import.
- `lib/blackjack/server.ts`: signed progress and redacted client views.
- `lib/blackjack/database.ts`: Neon queries, atomic run updates, and personal statistics.
- `lib/blackjack/identity.ts`: signed anonymous player cookies and environment separation.
- `lib/blackjack/persistence.ts`: authoritative recovery and action coordination.
- `db/schema.sql`: run table and daily-results index.
- `scripts/setup-database.mjs`: repeatable, non-destructive schema setup.
- `app/api/blackjack/route.ts`: daily state, action validation, recovery.
- `app/api/stats/route.ts`: private statistics for the current anonymous player.
- `lib/blackjack/client.ts`: local statistics, storage, sharing.
- `app/page.tsx`: mobile-first card table and dialogs.
- `scripts/generate-seeds.mjs`: append approved dates offline.
- `scripts/fetch-cards.mjs`: vendor CC0 card art and license.
- `tests/blackjack.test.ts`: rules and integration checks.
- `tests/persistence.test.ts`: persistence flow tests using an in-memory store.

Card source: [Letele's playing cards](https://github.com/letele/playing-cards), based on [Adrian Kennard's designs](https://www.me.uk/cards/), distributed under CC0 1.0.

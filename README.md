# Jacklet

Branding uses Jacklet with the subtitle “daily blackjack” and a spade favicon.
Progress version `jacklet-v2` starts a new game for all browsers: old runs, statistics,
sound preferences, and dismissed instructions are reset on the next load.
Old saved tokens are rejected and the recovery cookie is replaced automatically.
Change `PROGRESS_VERSION` in `lib/blackjack/progress.ts` only for a deliberate global
reset. Ordinary deployments preserve current progress.

## Interface

The run header and final result show hands won. Only settled wins count, including
natural blackjacks and dealer busts; pushes and losses do not. Final-card wins count
under the updated rules. Counts are reconstructed from signed actions when resuming, so
refreshing does not add wins. The primary score is 100 points per settled win plus
one point per revealed card, minus cumulative joker costs. Hands played (including the current hand) and hands won
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
Wins use a bright rising two-note cue; losses use a rough falling cue. Muting stops
active audio and suppresses sounds from pending game responses. Sound failures do
not interrupt gameplay, and hidden pages do not start sounds.

A Next.js / React daily blackjack survival game. Every player gets the same approved 52-card deck in the same order. Decisions change how the deck is consumed. The first loss ends the run. The final card is included and the hand is scored normally; fewer than four remaining cards cannot start a new hand and stay undealt.

## Local setup

The existing dependencies are unchanged. With Node.js 20.9+:

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

Run these checks before pushing. Earlier rules and scoring changes passed validation;
the latest joker, reset, sound, and preview changes require a fresh run. Tests cover
rules, escalating joker costs, resolved joker values, signed progress, automatic
resets, sharing, responsive card limits, and date handling. Catalog checks validate
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

The existing catalog and star thresholds have not been re-evaluated for jokers.
The offline analyzer intentionally continues to explore only deal, hit, and stand.
Its ranges describe the original no-joker game.

- One 52-card deck plus purchased jokers; no reshuffles, bets, splits, insurance, surrender, or doubles.
- Deal order: player, dealer up card, player, dealer hole card.
- Aces count as 1 or 11; face cards count as 10. Dealer stands on all 17s.
- Dealer checks for an initial blackjack when showing an ace or a ten-value card. A player's natural also settles immediately. A natural beats a non-natural 21; two naturals push.
- Hit or stand. A player reaching 21 automatically stands. A player bust ends the run, reveals the hole card, and does not trigger dealer draws.
- A win or push allows the next hand. A loss ends the run.
- Every revealed card counts exactly once, including the losing hand and dealer hole card after settlement. Dealing a hidden hole card alone does not increment the card portion of the score. The combined score is 100 points per settled win plus one point per revealed card.
- Under `blackjack-v2`, the final card goes to the player or dealer drawing it and counts. Reveal the hole card and compare the hands normally, without further draws even if the dealer is below 17. Wins increase hands won; ties do not. The run ends regardless of the result.
- After a surviving hand, fewer than four cards remaining ends the run immediately with “Less than 4 cards remaining.” They are neither dealt nor counted, and no extra hand is created. Exactly four cards can form a final hand; naturals and ordinary comparisons apply.
- All scheduled dates use `blackjack-v2`. Legacy engine and migration support remains for compatibility tests; tokens from before the progress-version reset cannot restore old runs.
- Starting the first hand counts toward the participation streak. Midnight is calculated in America/New_York, including daylight saving changes.

## Approved daily seeds

`lib/blackjack/catalog.json` contains 90 preanalyzed daily decks from **September 9 through December 7, 2026**. It is imported only by server code. Each entry includes the deck, seed, rules version, reachable card scores, combined point scores, star thresholds, and an optional surviving-to-end action path. A null path means no such path was found under the original no-joker rules. Surviving to the end may leave fewer than four cards undealt. No runtime search is required. The joker update leaves this catalog unchanged.

The analyzer exhaustively explores legal decisions and memoizes equivalent states. Publication requires a best achievable card count of at least **26**, at least 12 distinct final card scores, and achievable card scores in all five star bands. A route to 52 is optional. The shared `isPublishable` function controls these curation defaults. This rejects decks whose best possible run is very short; it does not prevent players from losing early or guarantee they can infer optimal choices from visible cards. The 26-card cutoff is a provisional playtesting choice. Ordinary-strategy difficulty curation remains a roadmap item.

Stars use the original no-joker combined point range, divided into five equal-width bands.
Thresholds for 2–5 stars are `ceil(min + (max - min) * k / 5)`, for k=1..4.
The best attainable point total always earns five stars. These are score ranges,
not player percentiles. The analyzer includes wins in its memoization key and stores
`pointScores` and `pointThresholds` alongside the original card-count curation data.
The existing short-run curation policy remains based on cards; point bands may have gaps.
All 90 scheduled decks retain their order and rules, with new point ratings calculated
offline. No future cards, attainable ranges, or thresholds are exposed in the UI or API.

Before the schedule expires, append more approved days:

```sh
npm run seeds:generate -- 30
npm test
```

Commit and deploy the updated catalog. Generation appends after the last scheduled date and never overwrites an existing date. Missing dates return an explicit unavailable response rather than silently reusing a deck or supplying an unverified seed. Do not change published decks, thresholds, or rule versions mid-day.

## Vercel and the existing secret

Link previews include Open Graph metadata, an X/Twitter large-image card, and a
1200×630 PNG rendered from the Jacklet colors and spade logo. The preview is public
and contains no game state. Set SITE_URL to your full public HTTPS origin if using
a custom domain; otherwise Vercel's production URL is used automatically.
After building, check /opengraph-image and share the deployed public URL.
Messaging services may cache earlier previews, and private/password-protected
deployments cannot supply a public preview.

Keep the existing `PUZZLE_SECRET` environment variable in Vercel. It now **signs saved action histories**, rather than generating answers. Use the same stable secret across instances and deployments. A local fallback is provided in development; production requires an explicit value. Changing it invalidates saved run tokens. Never prefix it with `NEXT_PUBLIC_`.

Use a normal Next.js deployment, not static export. No new packages or database are required. Assets should be committed before deployment, and the seed catalog should remain in the private repository: making the repository public exposes future decks and solutions even though they are not sent to browsers.

## Persistence and one-run limits

Blackjack uses separate browser storage keys; existing number-game history is left untouched. Current-day progress is replayed and validated on the server. The API returns only current visible cards and previously revealed cards, never the hidden card or future deck. Signed tokens prevent clients from fabricating arbitrary action histories. An HttpOnly cookie recovers the latest run after dropped responses; browser storage retains local statistics and provides a second recovery copy. Web Locks serialize player actions between tabs when available.

This is still a no-account, no-database MVP. One run is enforced in the normal current-browser flow, not as a tamper-proof identity guarantee. Clearing all browser data, using another browser, replaying older legitimately signed tokens after clearing cookies, or racing requests outside the UI can bypass it. A durable anonymous session store is needed for stronger enforcement and exactly-once updates. A lost network response that never stores its cookie cannot be proven accepted without such a store. See ROADMAP.md.

## Main files

- `lib/blackjack/engine.mjs`: deterministic rules, shuffle, exhaustive analyzer, score bands.
- `lib/blackjack/catalog.json`: approved daily decks and proofs, server-only import.
- `lib/blackjack/server.ts`: signed progress and redacted client views.
- `app/api/blackjack/route.ts`: daily state, action validation, recovery.
- `lib/blackjack/client.ts`: local statistics, storage, sharing.
- `app/page.tsx`: mobile-first card table and dialogs.
- `scripts/generate-seeds.mjs`: append approved dates offline.
- `scripts/fetch-cards.mjs`: vendor CC0 card art and license.
- `tests/blackjack.test.ts`: rules and integration checks.

Card source: [Letele's playing cards](https://github.com/letele/playing-cards), based on [Adrian Kennard's designs](https://www.me.uk/cards/), distributed under CC0 1.0.

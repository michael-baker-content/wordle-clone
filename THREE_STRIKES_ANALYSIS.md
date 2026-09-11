# Three-strike playtest — September 11, 2026

This study compares all 90 scheduled decks (September 9–December 7) with the official
single-loss rules and the proposed three-strike rules. No decks, daily rules,
ratings, or saved-progress versions were changed.

## Ordinary-play results

Each scenario plays the same 90 decks once with a deterministic policy.

| Rules | Joker policy | Mean cards | Mean hands | Mean final points | Runs under 20 cards | Deck endings | Negative scores |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| One loss | No jokers | 17.69 | 3.12 | 196.58 | 59/90 | 0/90 | 0/90 |
| One loss | Buy aggressively | 27.29 | 5.12 | 112.84 | 30/90 | 7/90 | 0/90 |
| Three strikes | No jokers | 37.92 | 6.87 | 129.03 | 7/90 | 26/90 | 35/90 |
| Three strikes | Buy aggressively | 43.01 | 8.08 | 8.57 | 5/90 | 43/90 | 46/90 |

The hit/stand policy uses only the player's hand and dealer's up card. It stands
on hard 17+, hard 13–16 against dealer 2–6, and hard 12 against 4–6. For soft hands
it stands on 19+, or 18 against dealer 2–8. Other hands hit. This approximates
ordinary decisions; it is not a claim of optimal blackjack strategy.

The aggressive joker variant purchases whenever affordable with a hand total of
10–20. This is a deliberately simple comparison policy, not a recommendation.
Neither policy sees the hole card or future cards, counts cards, or adapts to
previous practice attempts.

Deck endings include fewer than four remaining cards. If the third strike and
deck exhaustion coincide, the table counts that as a strike ending.
“Under 20 cards” is a descriptive short-run measure, not a new curation rule.

## Perfect-information ceilings

An independent memoized traversal explores every legal action, optionally including
jokers, with a cap of 100,000 states per deck/scenario. All 360 searches completed.
The memo key includes strikes, joker purchases, wins, current hands, and deck position.
It computes maximum final points and maximum cards separately; those maxima need
not come from the same path. This is an upper bound using knowledge players lack.

Mean maximum reachable cards:
- One loss, no jokers: 46.14.
- One loss, jokers allowed: 51.96.
- Three strikes, no jokers: 51.94.
- Three strikes, jokers allowed: 52.00.

Mean maximum reachable final points were 713.79, 863.26, 764.62, and 859.92
respectively in the same scenario order. Longer runs therefore do not imply a
higher optimal score once strike costs are included.

## Interpretation

Three strikes substantially lengthened runs for these policies. Without jokers,
mean cards rose from 17.69 to 37.92, and short runs fell from 59 to 7 of 90.
With aggressive joker use, mean cards rose from 27.29 to 43.01.

The penalty remains significant: 35/90 three-strike runs without jokers and 46/90
with aggressive joker use finished negative. Buying survival does not necessarily
buy a higher score: the three-strike aggressive-joker mean was 8.57 points versus
129.03 without jokers.

These are outcomes on an already curated deck sample, not estimated human win
rates. Players, strategies, and future deck samples may behave differently.
The policy comparison supports trying three strikes; the low and negative scores
are the main playtesting concern. Retain the proposed penalties during local testing
and assess how satisfying recovery feels before adjusting scoring or star bands.

## Reproduce and playtest

- Run `npm run strikes:analyze` for per-date policy outcomes.
- Add `-- --oracle` for bounded exhaustive ceilings. Incomplete searches explicitly
  return null maxima; do not treat them as exact results.
- Open `/practice` with `npm run dev` for repeatable, local-only three-strike runs.
- Practice stores only temporary decisions in sessionStorage and has no official
  statistics, sharing, or calibrated star ratings.

The numbers above were computed from the project JavaScript modules in the
authoring runtime. Repository tests, TypeScript checking, and a production build
remain for the owner to run.

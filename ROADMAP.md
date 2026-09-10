# Jacklet roadmap

## Current game

- One 52-card deck per Eastern calendar day; one run in the current browser.
- Hit and stand; no betting. Dealer stands on soft 17; blackjack outranks other 21s.
- Revealed cards score, including the losing hand and dealer hole card.
- From September 9 (`blackjack-v2`), the last card counts and the final hand is settled normally, even below dealer 17. Final wins count. Fewer than four cards after a surviving hand ends the run with those cards undealt and uncounted. Existing September 9 legacy runs migrate on recovery.
- Exhaustive seed analysis; five equal-width score bands based on the day's actual attainable range. Full clears are optional. Curation currently requires a best-case score of at least 26, at least 12 distinct final scores, and achievable outcomes in every band.
- Saved decisions, signed server verification, mobile card table, daily participation statistics, spoiler-free sharing, and detailed result copying with player hands.

## Next priorities

- Playtest the provisional 26-card best-case cutoff. A long optimal path does not imply a long ordinary run with hidden information. Evaluate ordinary strategies and early unavoidable-loss branches to improve curation.
- Tune star bands after observing play. Published thresholds must stay fixed for the day.
- Add a persistent anonymous session store for stronger enforcement of one run, atomic cross-tab decisions, and robust retries across devices or storage resets.
- Expand the approved schedule before December 8, 2026. The initial catalog ends December 7.

## Later

- Splitting and other blackjack actions, with an explicit no-betting purpose. Decide how split-hand losses and shared-deck consumption affect survival before adding them. Reanalyze every future seed under a new rules version.
- Accounts and synchronized progress.
- Past puzzles, separately labeled from the official daily run.
- Additional artwork/table styles using licensed assets; no image generation needed.

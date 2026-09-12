# Jacklet roadmap

## Current game

- Daily and practice now share three persistent strikes, −100 points per loss,
  and ratings calculated over all legal joker choices. Final sounds play automatically
  for 1–2 versus 3–5 stars. The separate ratings file covers all 90 scheduled dates.

- One 52-card deck per Eastern calendar day; one run in the current browser.
- Hit and stand; no betting. Dealer stands on soft 17; blackjack outranks other 21s.
- Score is 100 points per win plus revealed cards, minus 100 per strike and joker costs. Jokers cost 50, 100, 150 points and so on across each run; their value adjusts from 1–11. Detailed results show values before 🤡.
- Progress version jacklet-v3 resets previous runs, anonymous identities, and preferences. Optional rising/falling sound cues and public link previews are included.
- The last card counts and the final hand is settled normally, even below dealer 17. Final wins count. Fewer than four cards after a settled hand ends the run with those cards undealt and uncounted.
- Current ratings include three strikes and jokers. Scores below 50 earn one star; two stars start at 50, and three/four-star cutoffs divide the remaining interval up to the fixed five-star cutoff. The original no-joker deck curation is separate; full clears remain optional.
- Saved decisions, signed server verification, mobile card table, daily participation statistics, spoiler-free sharing, and detailed result copying with player hands.
- Neon stores anonymous official runs with atomic updates and recovery within the same browser identity. A private stats endpoint is ready. Development and production data are separate; disposable prototype generations support fresh starts. Local setup and validation are complete; verify production after deployment.

## Next priorities

- Playtest the provisional 26-card best-case cutoff. A long optimal path does not imply a long ordinary run with hidden information. Evaluate ordinary strategies and early unavoidable-loss branches to improve curation.
- Add a compact stats modal using the existing private endpoint, then return focus to gameplay and retention experiments.
- Tune star bands after observing play; current ratings already include jokers and three strikes.
- Expand the approved schedule before December 8, 2026. The initial catalog ends December 7.

## Later

- Splitting and other blackjack actions, with an explicit no-betting purpose. Decide how split-hand losses and shared-deck consumption affect survival before adding them. Reanalyze every future seed under a new rules version.
- Accounts and synchronized progress.
- Past puzzles, separately labeled from the official daily run.
- Additional artwork/table styles using licensed assets; no image generation needed.

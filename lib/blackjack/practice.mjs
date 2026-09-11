import { initial, step, finished } from './engine.mjs';

/** Shared three-strike extension used by daily play, practice, and ratings.
 * @param {import('./engine.mjs').State} state
 * @param {import('./engine.mjs').Action} action
 * @param {number[]} deck
 */
export function practiceStep(state, action, deck) {
  const next = step(state, action, deck, 'blackjack-v2');
  if (next.phase !== 'lost') return next;
  const strikes = (state.strikes ?? 0) + 1;
  const exhausted = deck.length - next.next < 4;
  return { ...next, strikes,
    phase: /** @type {import('./engine.mjs').Phase} */ (strikes >= 3 ? 'lost' : exhausted ? 'cleared' : 'between'),
    message: `Strike ${strikes} of 3. −100 points.` + (strikes >= 3 ? ' Your run is over.' : exhausted ? ' Not enough cards to continue.' : ' Your run continues.')
  };
}

/** @param {number[]} deck @param {import('./engine.mjs').Action[]} moves */
export function practiceReplay(deck, moves) {
  if (moves.length > 104) throw new Error('Too many actions.');
  /** @type {import('./engine.mjs').State} */
  let state = { ...initial(), strikes:0 };
  for (const action of moves) {
    if (finished(state)) throw new Error('This practice run is over.');
    state = practiceStep(state,action,deck);
  }
  return state;
}

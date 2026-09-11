import { initial, step, finished, actions, canPlayJoker, points, thresholds } from './engine.mjs';
import { practiceStep } from './practice.mjs';

/** Keep the five-star cutoff and spread the middle bands above the 50-point floor.
 * @param {number} fiveStar
 */
export function ratingBands(fiveStar) {
  if (fiveStar < 53) throw new Error('Five-star cutoff must leave room for all middle bands above 50.');
  return [50, Math.ceil(50 + (fiveStar - 50) / 3), Math.ceil(50 + 2 * (fiveStar - 50) / 3), fiveStar];
}

/** Enumerate point extrema including every affordable joker choice.
 * @param {number[]} deck @param {boolean} threeStrikes @param {number} [limit]
 */
export function analyzeRatings(deck, threeStrikes, limit = 100000) {
  /** @type {Map<string,{minimum:number,maximum:number}>} */
  const memo = new Map();
  /** @param {import('./engine.mjs').State} state @returns {{minimum:number,maximum:number}} */
  function visit(state) {
    if (finished(state)) return {minimum:points(state),maximum:points(state)};
    const key = JSON.stringify([state.next,state.player,state.dealer,state.hidden,state.phase,state.handsWon,state.strikes ?? 0,state.jokersBought ?? 0]);
    const cached = memo.get(key); if (cached) return cached;
    if (memo.size >= limit) throw new Error('Rating analysis limit reached; no approved result.');
    memo.set(key,{minimum:Infinity,maximum:-Infinity});
    const choices = [...actions(state)];
    if (canPlayJoker(state)) choices.push('joker');
    const children = choices.map(action=>visit(threeStrikes ? practiceStep(state,action,deck) : step(state,action,deck)));
    const range = {minimum:Math.min(...children.map(x=>x.minimum)),maximum:Math.max(...children.map(x=>x.maximum))};
    memo.set(key,range); return range;
  }
  const range = visit(initial());
  const originalBands = thresholds(range.minimum,range.maximum);
  return {...range,thresholds:threeStrikes ? ratingBands(originalBands[3]) : originalBands,states:memo.size};
}

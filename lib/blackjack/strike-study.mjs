import { initial, step, finished, total, canPlayJoker, actions, points, score } from './engine.mjs';
import { practiceStep } from './practice.mjs';

// This approximate hit/stand policy is not claimed to be optimal basic strategy.
// It is passed only information visible to the player.
/** @param {number[]} player @param {number} up @param {boolean} affordable @param {boolean} useJokers */
export function policy(player, up, affordable, useJokers) {
  const hand = total(player);
  const dealer = total([up]).value;
  if (useJokers && affordable && hand.value >= 10 && hand.value <= 20) return 'joker';
  if (hand.soft) return hand.value >= 19 || (hand.value === 18 && dealer <= 8) ? 'stand' : 'hit';
  return hand.value >= 17 || (hand.value >= 13 && dealer <= 6) || (hand.value === 12 && dealer >= 4 && dealer <= 6) ? 'stand' : 'hit';
}
/** @param {number[]} deck @param {boolean} three @param {boolean} jokers */
export function simulate(deck, three, jokers) {
  let state = initial();
  while (!finished(state)) {
    const action = state.phase === 'player' ? policy(state.player,state.dealer[0],canPlayJoker(state),jokers) : 'deal';
    state = three ? practiceStep(state,action,deck) : step(state,action,deck);
  }
  return {cards:score(state),hands:state.round,points:points(state),wins:state.handsWon,jokers:state.jokersBought ?? 0,
    strikes:state.strikes ?? 0,endedByStrikes:three ? state.strikes === 3 : state.phase === 'lost'};
}
/** Perfect-information ceiling, not a playable strategy. Never modifies a catalog.
 * @param {number[]} deck @param {boolean} three @param {boolean} jokers @param {number} [limit]
 */
export function oracle(deck, three, jokers, limit = 100000) {
  /** @type {Map<string,{cards:number,points:number}>} */
  const memo = new Map();
  /** @param {import('./engine.mjs').State} state @returns {{cards:number,points:number}} */
  function visit(state) {
    if (finished(state)) return {cards:score(state),points:points(state)};
    const key = JSON.stringify([state.next,state.player,state.dealer,state.hidden,state.phase,state.handsWon,state.strikes ?? 0,state.jokersBought ?? 0]);
    const known = memo.get(key); if (known) return known;
    if (memo.size >= limit) throw new Error('State limit reached');
    memo.set(key,{cards:0,points:-Infinity});
    const choices = [...actions(state)];
    if (jokers && canPlayJoker(state)) choices.push('joker');
    const outcomes = choices.map(action=>visit(three ? practiceStep(state,action,deck) : step(state,action,deck)));
    const best = {cards:Math.max(...outcomes.map(x=>x.cards)),points:Math.max(...outcomes.map(x=>x.points))};
    memo.set(key,best); return best;
  }
  try { return {...visit(initial()),states:memo.size,complete:true}; }
  catch(error) {
    if (!(error instanceof Error) || error.message !== 'State limit reached') throw error;
    return {cards:null,points:null,states:memo.size,complete:false};
  }
}
/** @param {{[date:string]:{deck:number[]}}} catalog @param {boolean} [withOracle] */
export function compare(catalog, withOracle = false) {
  return Object.entries(catalog).map(([date,entry])=>({
    date,
    scenarios:[false,true].flatMap(three=>[false,true].map(jokers=>({
      three,jokers,run:simulate(entry.deck,three,jokers),
      ...(withOracle ? {best:oracle(entry.deck,three,jokers)} : {})
    })))
  }));
}

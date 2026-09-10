/** @typedef {'deal'|'hit'|'stand'|'joker'} Action */
/** @typedef {'ready'|'player'|'between'|'lost'|'cleared'} Phase */
/** @typedef {{ player:number[], dealer:number[], next:number, hidden:boolean, phase:Phase, round:number, handsWon:number, jokersBought?:number, message:string }} State */
export const JOKER = 52;
export const JOKER_COST = 50;
export const RULES_VERSION = 'blackjack-v2';
export const SUITS = ['clubs','diamonds','hearts','spades'];
export const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
/** @param {number} card */
export function rank(card) { return card % 13; }
/** @param {number} card */
export function cardName(card) { return card === JOKER ? 'Joker' : RANKS[rank(card)] + ' of ' + SUITS[Math.floor(card / 13)]; }
/** @param {number[]} cards */
export function total(cards) {
  let value = 0, aces = 0, jokers = 0;
  for (const card of cards) {
    if (card === JOKER) { value++; jokers++; continue; }
    const r = rank(card); value += r === 0 ? 11 : Math.min(r + 1, 10); if (r === 0) aces++;
  }
  while (value > 21 && aces > 0) { value -= 10; aces--; }
  value += Math.min(jokers * 10, Math.max(0, 21 - value));
  return { value, soft: aces > 0 };
}
/** Resolve joker values in play order, giving earlier jokers the larger values.
 * @param {number[]} cards @returns {number[]}
 */
export function jokerValues(cards) {
  const count = cards.filter(card => card === JOKER).length;
  let base = cards.reduce((sum, card) => sum + (card === JOKER ? 1 : rank(card) === 0 ? 11 : Math.min(rank(card) + 1, 10)), 0);
  let aces = cards.filter(card => card !== JOKER && rank(card) === 0).length;
  while (base > 21 && aces > 0) { base -= 10; aces--; }
  let extra = total(cards).value - base;
  return Array.from({length:count}, () => { const addition = Math.min(10,extra); extra -= addition; return 1 + addition; });
}
/** @returns {State} */
export function initial() { return { player:[], dealer:[], next:0, hidden:false, phase:'ready', round:0, handsWon:0, message:'Your daily deck is waiting.' }; }
/** @param {State} state */
export function score(state) { return state.next - (state.hidden ? 1 : 0); }
/** @param {State} state */
export function points(state) { return state.handsWon * 100 + score(state) - jokerSpend(state.jokersBought ?? 0); }
/** @param {number} count */
export function jokerSpend(count) { return JOKER_COST * count * (count + 1) / 2; }
/** @param {{jokersBought?:number}} state */
export function jokerPrice(state) { return JOKER_COST * ((state.jokersBought ?? 0) + 1); }
/** @param {State} state */
export function canPlayJoker(state) { return state.phase === 'player' && state.next < 52 && points(state) >= jokerPrice(state); }
/** @param {State} state */
export function finished(state) { return state.phase === 'lost' || state.phase === 'cleared'; }
/** @param {State} state @returns {Action[]} */
// Baseline actions for the approved no-joker catalog analysis. Live joker eligibility
// is checked separately so existing proofs and thresholds remain unchanged.
export function actions(state) { return state.phase === 'ready' || state.phase === 'between' ? ['deal'] : state.phase === 'player' ? ['hit','stand'] : []; }
/** @param {State} state @returns {State} */
function clear(state) { return { ...state, next:52, hidden:false, phase:'cleared', message:'You made it to the end. Run complete!' }; }
/** Settle with ordinary blackjack comparisons, even if the dealer is below 17.
 * @param {State} state @param {boolean} [exhausted] @returns {State}
 */
function resolveHand(state, exhausted = false) {
  const p = total(state.player).value, d = total(state.dealer).value;
  const playerNatural = state.player.length === 2 && p === 21;
  const dealerNatural = state.dealer.length === 2 && d === 21;
  const lost = p > 21 || (dealerNatural && !playerNatural) || (!playerNatural && d <= 21 && p < d);
  const won = !lost && (d > 21 || (playerNatural && !dealerNatural) || p > d);
  const outcome = lost ? (p > 21 ? 'You bust.' : 'Dealer wins.') : won ? 'You win the hand.' : 'Push.';
  const ended = exhausted || state.next === 52 || 52 - state.next < 4;
  const reason = ended ? (state.next === 52 ? ' Deck exhausted.' : ' Less than 4 cards remaining.') : '';
  return { ...state, hidden:false, handsWon:state.handsWon + (won ? 1 : 0),
    phase:lost ? 'lost' : ended ? 'cleared' : 'between',
    message:outcome + reason + (lost && !ended ? ' Your run is over.' : '') };
}
/** @param {State} state @param {number[]} deck @param {string} rulesVersion @returns {State} */
function dealerTurn(state, deck, rulesVersion) {
  let s = { ...state, hidden:false };
  while (total(s.dealer).value < 17) {
    s.dealer.push(deck[s.next++]);
    if (s.next === 52) return rulesVersion === 'blackjack-v1' ? clear(s) : resolveHand(s, true);
  }
  if (rulesVersion !== 'blackjack-v1') return resolveHand(s);
  const p = total(s.player).value, d = total(s.dealer).value;
  return { ...s, phase: d > 21 || p >= d ? 'between' : 'lost',
    handsWon: s.handsWon + (d > 21 || p > d ? 1 : 0),
    message: d > 21 ? 'Dealer busts. You survive.' : p > d ? 'You win the hand.' : p === d ? 'Push. Your run continues.' : 'Dealer wins. Your run is over.' };
}
/** Pure transition shared by gameplay and the offline analyzer.
 * @param {State} state @param {Action} action @param {number[]} deck @param {string} [rulesVersion] @returns {State}
 */
export function step(state, action, deck, rulesVersion = RULES_VERSION) {
  if (action === 'joker' ? !canPlayJoker(state) : !actions(state).includes(action)) throw new Error('That action is not available.');
  let s = { ...state, player:[...state.player], dealer:[...state.dealer] };
  if (action === 'joker') {
    s.player.push(JOKER);
    s.jokersBought = (s.jokersBought ?? 0) + 1;
    return total(s.player).value === 21 ? dealerTurn(s, deck, rulesVersion) : { ...s, message:'Hit, stand, or play another joker?' };
  }
  if (action === 'deal') {
    if (rulesVersion !== 'blackjack-v1' && deck.length - s.next < 4) return { ...s, hidden:false, phase:'cleared', message:'Less than 4 cards remaining.' };
    s = { ...s, player:[], dealer:[], hidden:false, round:s.round + 1 };
    // Legacy dates retain their original ending; new dates require a complete deal.
    for (let i = 0; i < 4; i++) {
      const card = deck[s.next++];
      if (i % 2 === 0) s.player.push(card); else s.dealer.push(card);
      if (i === 3) s.hidden = true;
      if (s.next === 52) return rulesVersion === 'blackjack-v1' ? clear(s) : resolveHand(s, true);
    }
    s.phase = 'player';
    const p = total(s.player).value, d = total(s.dealer).value;
    if (p === 21 || d === 21) {
      if (rulesVersion !== 'blackjack-v1') return resolveHand(s);
      s.hidden = false;
      s.phase = d === 21 && p !== 21 ? 'lost' : 'between';
      if (p === 21 && d !== 21) s.handsWon++;
      s.message = p === 21 && d === 21 ? 'Two blackjacks. Push.' : p === 21 ? 'Blackjack! Your run continues.' : 'Dealer blackjack. Your run is over.';
    } else s.message = 'Hit or stand?';
    return s;
  }
  if (action === 'hit') {
    s.player.push(deck[s.next++]);
    if (s.next === 52) return rulesVersion === 'blackjack-v1' ? clear(s) : resolveHand(s, true);
    const p = total(s.player).value;
    if (p > 21) return { ...s, hidden:false, phase:'lost', message:'You bust. Your run is over.' };
    if (p < 21) return { ...s, message:'Hit or stand?' };
  }
  return dealerTurn(s, deck, rulesVersion);
}
/** @param {number[]} deck */
export function validateDeck(deck) {
  if (deck.length !== 52 || new Set(deck).size !== 52 || !deck.every(c => Number.isInteger(c) && c >= 0 && c < 52)) throw new Error('Expected one complete 52-card deck.');
}
/** @param {number[]} deck @param {Action[]} moves @param {string} [rulesVersion] */
export function replay(deck, moves, rulesVersion = RULES_VERSION) {
  let state = initial();
  if (moves.length > 104) throw new Error('Too many actions.');
  for (const move of moves) state = step(state, move, deck, rulesVersion);
  return state;
}
/** @param {number} seed */
export function shuffledDeck(seed) {
  let a = seed >>> 0;
  const random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const deck = Array.from({length:52}, (_,i) => i);
  for (let i = 51; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [deck[i],deck[j]] = [deck[j],deck[i]]; }
  return deck;
}
/** @param {number} minimum @param {number} maximum */
export function thresholds(minimum, maximum) {
  return Array.from({length:4}, (_,i) => Math.ceil(minimum + (maximum - minimum) * (i + 1) / 5));
}
/** @param {number} value @param {number[]} bands */
export function stars(value, bands) { return 1 + bands.filter(b => value >= b).length; }
/** Reject decks whose best possible run is short; a full clear is optional.
 * These are curation defaults, not a guarantee against an early player loss.
 * @param {{maximum:number,scores:number[],emptyBands:number[]}} analysis
 */
export function isPublishable(analysis) {
  return analysis.maximum >= 26 && analysis.scores.length >= 12 && analysis.emptyBands.length === 0;
}
/** Exhaustively enumerate reachable terminal scores, memoizing equivalent states.
 * @param {number[]} deck @param {number} [limit] @param {string} [rulesVersion]
 */
export function analyze(deck, limit = 250000, rulesVersion = RULES_VERSION) {
  validateDeck(deck);
  /** @type {Map<string,{scores:number[],pointScores:number[],path:Action[]|null}>} */
  const memo = new Map();
  let visited = 0;
  /** @param {State} state @returns {{scores:number[],pointScores:number[],path:Action[]|null}} */
  function visit(state) {
    if (finished(state)) return { scores:[score(state)], pointScores:[points(state)], path:state.phase === 'cleared' ? [] : null };
    const key = JSON.stringify([state.next,state.phase,state.player,state.dealer,state.hidden,state.handsWon]);
    const cached = memo.get(key); if (cached) return cached;
    if (++visited > limit) throw new Error('Analysis state limit exceeded.');
    const scores = new Set();
    const pointScores = new Set();
    /** @type {Action[]|null} */
    let path = null;
    for (const action of actions(state)) {
      const child = visit(step(state,action,deck,rulesVersion));
      child.scores.forEach(n => scores.add(n));
      child.pointScores.forEach(n => pointScores.add(n));
      if (path === null && child.path !== null) path = [action,...child.path];
    }
    const result = { scores:[...scores].sort((a,b) => a-b), pointScores:[...pointScores].sort((a,b) => a-b), path };
    memo.set(key,result); return result;
  }
  const result = visit(initial());
  const minimum = result.scores[0], maximum = result.scores[result.scores.length - 1];
  const bands = thresholds(minimum,maximum);
  return { pointScores:result.pointScores, pointThresholds:thresholds(result.pointScores[0],result.pointScores[result.pointScores.length - 1]), scores:result.scores, minimum, maximum, thresholds:bands, winningPath:result.path, states:visited,
    emptyBands:[1,2,3,4,5].filter(r => !result.scores.some(s => stars(s,bands) === r)) };
}

import test from "node:test";
import assert from "node:assert/strict";
import { analyze, actions, finished, initial, isPublishable, replay, score, points, shuffledDeck, stars, step, total, validateDeck, type Action, type State } from "../lib/blackjack/engine.mjs";
import { easternDay, nextReset } from "../lib/blackjack/dates";
import { readHistory, statistics, shareText, detailedShareText } from "../lib/blackjack/client";
import { dailyFor, runFor, verify, sign } from "../lib/blackjack/server";
import catalog from "../lib/blackjack/catalog.json";
import { practiceReplay } from "../lib/blackjack/practice.mjs";

test("detailed results recover every player hand from saved actions", () => {
  const id = "2026-09-09", entry = catalog[id];
  const moves: Action[] = [];
  const expected: number[][] = [];
  let state = initial();
  while (!finished(state)) {
    const action = actions(state)[actions(state).length - 1];
    moves.push(action);
    state = step(state,action,entry.deck,entry.rulesVersion);
    if (state.round) expected[state.round - 1] = [...state.player];
  }
  const run = runFor(id,moves);
  assert.deepEqual(run.playerHands,expected);
  assert.ok(run.playerHands!.flat().every(card => run.revealed.includes(card)));
  const restored = runFor(id,verify(run.token,id)!.moves);
  assert.equal(detailedShareText(restored),detailedShareText(run));
  const text = detailedShareText({...run,playerHands:[[0,22],[38,40,1]]});
  assert.equal(text,shareText(run) + "\n\nYour hands\nHand 1: A♣ 10♦\nHand 2: K♥ 2♠ 2♣");
  assert.ok(!text.includes("Dealer"));
});

function deckWith(prefix: number[]) { return [...prefix, ...Array.from({length:52},(_,i)=>i).filter(c=>!prefix.includes(c))]; }
function playerState(overrides: Partial<State> = {}): State {
  return { ...initial(), phase:"player", player:[9,22], dealer:[6,19], hidden:true, next:4, round:1, ...overrides };
}
test("Eastern midnight and daylight saving resets", () => {
  assert.equal(easternDay(new Date("2026-09-09T03:59:59Z")),"2026-09-08");
  assert.equal(easternDay(new Date("2026-09-09T04:00:00Z")),"2026-09-09");
  assert.equal(nextReset(new Date("2026-03-08T05:00:00Z")).toISOString(),"2026-03-09T04:00:00.000Z");
  assert.equal(nextReset(new Date("2026-11-01T04:00:00Z")).toISOString(),"2026-11-02T05:00:00.000Z");
});
test("aces adjust, including multiple aces", () => {
  assert.deepEqual(total([0,5]),{value:17,soft:true});
  assert.deepEqual(total([0,13,8]),{value:21,soft:true});
  assert.deepEqual(total([0,13,8,9]),{value:21,soft:false});
});
test("initial deal alternates; the hole card is not counted", () => {
  const s = step(initial(),"deal",deckWith([7,4,8,5]));
  assert.deepEqual(s.player,[7,8]); assert.deepEqual(s.dealer,[4,5]);
  assert.equal(s.hidden,true); assert.equal(score(s),3);
});
test("naturals reveal both hands, and a dealer natural ends play", () => {
  const dealer = step(initial(),"deal",deckWith([7,0,8,9]));
  assert.equal(dealer.phase,"lost"); assert.equal(score(dealer),4);
  const both = step(initial(),"deal",deckWith([0,13,9,22]));
  assert.equal(both.phase,"between"); assert.equal(both.hidden,false);
  const player = step(initial(),"deal",deckWith([0,7,9,8]));
  assert.equal(player.phase,"between"); assert.equal(score(player),4);
});
test("bust reveals hole card but takes no dealer draws", () => {
  const s = step(playerState(),"hit",deckWith([9,6,22,19,8]));
  assert.equal(s.phase,"lost"); assert.equal(score(s),5); assert.equal(s.dealer.length,2);
});
test("dealer stands on soft 17 and ties continue", () => {
  const soft = step(playerState({player:[7,8],dealer:[0,5]}),"stand",deckWith([7,0,8,5]));
  assert.equal(soft.next,4); assert.equal(soft.phase,"between");
});
test("dealer hits below 17; bust or lower total lets player continue", () => {
  const deck = deckWith([9,6,22,19,8]);
  const s = step(playerState(),"stand",deck);
  assert.equal(s.phase,"between"); assert.equal(s.next,5); assert.equal(total(s.dealer).value,23);
});
test("a new hand requires four cards; remaining cards stay undealt", () => {
  const deck = Array.from({length:52},(_,i)=>i);
  for (const next of [49,50,51]) {
    const previous = {...initial(),phase:"between" as const,next,round:8,handsWon:3};
    const ended = step(previous,"deal",deck);
    assert.equal(ended.phase,"cleared");
    assert.equal(ended.next,next);
    assert.equal(score(ended),next);
    assert.equal(ended.round,8);
    assert.equal(ended.handsWon,3);
    assert.match(ended.message,/Less than 4 cards remaining/);
  }
});
test("last player hit is counted and scored, including a bust", () => {
  const deck = Array.from({length:52},(_,i)=>i);
  const lost = step(playerState({next:51,handsWon:2}),"hit",deck);
  assert.equal(lost.phase,"lost"); assert.equal(score(lost),52);
  assert.equal(lost.player.at(-1),51); assert.equal(lost.hidden,false);
  assert.equal(lost.handsWon,2); assert.equal(lost.dealer.length,2);
  const won = step(playerState({player:[1,2],dealer:[3,4],next:51,handsWon:2}),"hit",deck);
  assert.equal(won.phase,"cleared"); assert.equal(won.handsWon,3);
  assert.equal(total(won.dealer).value,9);
});
test("last dealer draw settles immediately, even below 17", () => {
  const deck = Array.from({length:52},(_,i)=>i);
  [deck[0],deck[51]] = [deck[51],deck[0]];
  const won = step(playerState({player:[9,7],dealer:[1,2],next:51}),"stand",deck);
  assert.equal(won.phase,"cleared"); assert.equal(won.dealer.at(-1),0);
  assert.equal(total(won.dealer).value,16); assert.equal(score(won),52);
  assert.equal(won.handsWon,1);
  const lost = step(playerState({player:[6,7],dealer:[1,2],next:51}),"stand",deck);
  assert.equal(lost.phase,"lost"); assert.equal(lost.handsWon,0);
  const push = step(playerState({player:[6,8],dealer:[1,2],next:51}),"stand",deck);
  assert.equal(push.phase,"cleared"); assert.equal(push.handsWon,0);
});
test("four cards remaining form a full final deal, and naturals still win", () => {
  const final = [0,7,9,8];
  const deck = [...Array.from({length:52},(_,i)=>i).filter(c=>!final.includes(c)),...final];
  const won = step({...initial(),phase:"between",next:48},"deal",deck);
  assert.equal(score(won),52); assert.equal(won.handsWon,1);
  assert.equal(won.phase,"cleared");
});
test("a settled surviving hand ends automatically when fewer than four remain", () => {
  const won = step(playerState({player:[9,7],dealer:[8,20],next:49}),"stand",shuffledDeck(1));
  assert.equal(won.phase,"cleared"); assert.equal(won.handsWon,1);
  assert.equal(score(won),49); assert.match(won.message,/Less than 4 cards remaining/);
});
test("legacy dates retain the previous automatic exhaustion result", () => {
  const deck = Array.from({length:52},(_,i)=>i);
  const s = step(playerState({next:51}),"hit",deck,"blackjack-v1");
  assert.equal(s.phase,"cleared"); assert.equal(score(s),52);
});
test("finished runs reject any further actions", () => {
  assert.throws(()=>step({...initial(),phase:"lost"},"deal",shuffledDeck(1)));
});
test("hands won counts settled wins and naturals, but not pushes or losses", () => {
  const natural = step(initial(),"deal",deckWith([0,7,9,8]));
  assert.equal(natural.handsWon,1);
  assert.equal(step(natural,"deal",deckWith([0,7,9,8])).handsWon,1);
  const bothNatural = step(initial(),"deal",deckWith([0,13,9,22]));
  assert.equal(bothNatural.handsWon,0);
  const regular = step(playerState({player:[9,7],dealer:[8,20]}),"stand",deckWith([9,8,7,20]));
  assert.equal(regular.handsWon,1);
  const dealerBust = step(playerState(),"stand",deckWith([9,6,22,19,8]));
  assert.equal(dealerBust.handsWon,1);
  const push = step(playerState({player:[7,8],dealer:[0,5],handsWon:2}),"stand",deckWith([7,0,8,5]));
  assert.equal(push.handsWon,2);
  const bust = step(playerState({handsWon:2}),"hit",deckWith([9,6,22,19,8]));
  assert.equal(bust.handsWon,2);
});
test("replay recovers the win count without counting repeated requests twice", () => {
  const deck = deckWith([0,7,9,8]);
  assert.equal(replay(deck,["deal"]).handsWon,1);
  assert.equal(replay(deck,["deal"]).handsWon,1);
});
test("analyzer matches an independent exhaustive traversal", () => {
  const deck = shuffledDeck(9), found = new Set<number>();
  function enumerate(state: State) {
    if (finished(state)) { found.add(score(state)); return; }
    for (const action of actions(state)) enumerate(step(state,action,deck));
  }
  enumerate(initial());
  assert.deepEqual(analyze(deck).scores,[...found].sort((a,b)=>a-b));
});
test("every scheduled deck reproduces its approved range and optional clearing path", () => {
  for (const [date,entry] of Object.entries(catalog)) {
    validateDeck(entry.deck);
    assert.deepEqual(shuffledDeck(entry.seed),entry.deck,date);
    const analysis = analyze(entry.deck,250000,entry.rulesVersion);
    assert.deepEqual(analysis.scores,entry.scores,date);
    assert.deepEqual(analysis.thresholds,entry.thresholds,date);
    assert.deepEqual(analysis.pointScores,entry.pointScores,date);
    assert.deepEqual(analysis.pointThresholds,entry.pointThresholds,date);
    assert.equal(analysis.maximum,entry.maximum,date);
    assert.equal(analysis.minimum,entry.minimum,date);
    assert.equal(isPublishable(analysis),true,date);
    assert.deepEqual(analysis.emptyBands,[],date);
    if (entry.winningPath) assert.equal(replay(entry.deck,entry.winningPath as Action[],entry.rulesVersion).phase,"cleared",date);
    else if (entry.rulesVersion === "blackjack-v1") assert.ok(analysis.maximum < 52,date);
    assert.equal(stars(entry.maximum,entry.thresholds),5,date);
    assert.equal(stars(52,entry.thresholds),5);
    for (const value of entry.scores) assert.ok(stars(value,entry.thresholds)>=1 && stars(value,entry.thresholds)<=5);
  }
});
test("a non-clearable deck is eligible and its best score receives five stars", () => {
  const analysis = analyze(shuffledDeck(7));
  assert.equal(analysis.maximum,49);
  assert.equal(analysis.winningPath,null);
  assert.equal(isPublishable(analysis),true);
  assert.equal(stars(49,analysis.thresholds),5);
  assert.deepEqual(analysis.thresholds,[14,23,32,41]);
  for (const [index,boundary] of analysis.thresholds.entries()) {
    assert.equal(stars(boundary-1,analysis.thresholds),index+1);
    assert.equal(stars(boundary,analysis.thresholds),index+2);
  }
});
test("short best-case runs are rejected by curation", () => {
  assert.equal(isPublishable(analyze(shuffledDeck(2))),false);
  assert.equal(isPublishable({maximum:25,scores:Array.from({length:20},(_,i)=>i+6),emptyBands:[]}),false);
  assert.equal(isPublishable({maximum:26,scores:Array.from({length:20},(_,i)=>i+7),emptyBands:[]}),true);
  assert.equal(isPublishable({maximum:40,scores:[5,40],emptyBands:[2,3,4]}),false);
});
test("server reveals no future deck or hidden dealer card", () => {
  process.env.PUZZLE_SECRET = "test-only-key";
  const id = "2026-09-09", run = runFor(id,["deal"]);
  assert.equal(run.dealer[1],null);
  assert.equal(run.revealed.length,run.cardsTurned);
  assert.ok(!run.revealed.includes(catalog[id].deck[3]));
  const result = dailyFor(["deal"],new Date("2026-09-09T12:00:00Z"));
  assert.ok(!("deck" in result)); assert.ok(!("seed" in result));
  assert.ok(!("winningPath" in result));
  assert.ok(!("minimum" in result));
  assert.ok(!("maximum" in result));
  assert.ok(!("thresholds" in result));
  assert.equal(result.run.stars,0);
});
test("signed progress rejects tampering and wrong dates", () => {
  process.env.PUZZLE_SECRET = "test-only-key";
  const token = sign({id:"2026-09-09",version:"blackjack-v1",moves:["deal"]});
  assert.deepEqual(verify(token,"2026-09-09")?.moves,["deal"]);
  assert.equal(verify(token + "x","2026-09-09"),null);
  assert.equal(verify(token,"2026-09-10"),null);
});
test("today uses updated rules and migrates signed legacy runs", () => {
  const id = "2026-09-09", entry = catalog[id];
  assert.equal(entry.rulesVersion,"blackjack-v2");
  assert.equal(dailyFor([],new Date("2026-09-09T12:00:00Z")).rulesVersion,"three-strikes-v1");
  let checked = 0;
  function visit(state: State, moves: Action[]) {
    if (!finished(state)) {
      for (const action of actions(state)) visit(step(state,action,entry.deck,"blackjack-v1"),[...moves,action]);
      return;
    }
    const ticket = verify(sign({id,version:"blackjack-v1",moves}),id);
    assert.ok(ticket);
    assert.equal(ticket.version,"blackjack-v2");
    const updated = practiceReplay(entry.deck,ticket.moves);
    assert.deepEqual(ticket.moves,moves.slice(0,ticket.moves.length));
    const run = runFor(id,ticket.moves);
    assert.equal(run.score,points(updated));
    assert.equal(run.handsWon,updated.handsWon);
    assert.equal(run.cardsTurned,score(updated));
    assert.deepEqual(verify(run.token,id),ticket);
    checked++;
  }
  visit(initial(),[]);
  assert.ok(checked > 0);
});
test("participation, separate storage, and spoiler-free results", () => {
  const run = runFor("2026-09-09",["deal"]);
  const history = { [run.id]:run };
  assert.equal(statistics(history,"2026-09-09").streak,1);
  assert.equal(statistics(history,"2026-09-10").streak,1);
  assert.equal(statistics(history,"2026-09-11").streak,0);
  assert.deepEqual(readHistory(JSON.stringify(history)),history);
  const legacy = JSON.parse(JSON.stringify(history));
  delete legacy[run.id].handsWon;
  assert.equal(readHistory(JSON.stringify(legacy))[run.id].handsWon,0);
  assert.deepEqual(readHistory('{"2026-09-09":{"attempts":[]}}'),{});
  const text = shareText({...run,phase:"lost",score:25,stars:3});
  assert.equal(text,"♠ Jacklet · Sep 9\n25 points\n★★★☆☆");
  assert.ok(!text.includes("/52"));
  assert.ok(!text.includes(run.token)); assert.ok(!text.includes("hit"));
});
test("wins outweigh all card differences and reveals break ties", () => {
  assert.ok(points({...initial(),handsWon:1,next:4}) > points({...initial(),next:52}));
  assert.equal(points({...initial(),handsWon:3,next:27,hidden:true}),326);
  assert.equal(points({...initial(),handsWon:3,next:27,hidden:false}),327);
  assert.equal(stars(52,[100,200,300,400]),1);
});
test("point analyzer matches exhaustive traversal including different win counts", () => {
  for (const seed of [7,17,42]) {
    const deck = shuffledDeck(seed), found = new Set<number>();
    function visit(state: State) {
      if (finished(state)) { found.add(points(state)); return; }
      for (const action of actions(state)) visit(step(state,action,deck));
    }
    visit(initial());
    const analysis = analyze(deck);
    assert.deepEqual(analysis.pointScores,[...found].sort((a,b)=>a-b));
    assert.equal(stars(Math.max(...found),analysis.pointThresholds),5);
  }
});
test("old card scores migrate to points without losing hand counts", () => {
  const run = runFor("2026-09-09",["deal"]);
  const old = {...run, score:25, round:4, handsWon:3, cardsTurned:undefined};
  const restored = readHistory(JSON.stringify({[run.id]:old}))[run.id];
  assert.equal(restored.score,325);
  assert.equal(restored.cardsTurned,25);
  assert.equal(restored.round,4);
  assert.equal(restored.handsWon,3);
});

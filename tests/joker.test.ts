import test from "node:test";
import assert from "node:assert/strict";
import { JOKER, initial, jokerPrice, jokerSpend, canPlayJoker, step, score, points, total, type State } from "../lib/blackjack/engine.mjs";
import { runFor, verify } from "../lib/blackjack/server";
import { readHistory, detailedShareText } from "../lib/blackjack/client";

const deck = Array.from({length:52}, (_,i) => i);
const hand = (): State => ({...initial(),phase:"player",player:[1,2],dealer:[9,6],hidden:true,next:10,round:2,handsWon:1});

test("joker costs points immediately without consuming a deck card", () => {
  const before = hand(), after = step(before,"joker",deck);
  assert.equal(after.next,before.next);
  assert.equal(score(after),score(before));
  assert.equal(points(after),points(before)-50);
  assert.equal(total(after.player).value,16);
  assert.equal(after.phase,"player");
});
test("multiple jokers are allowed; reaching 21 stands and awards an ordinary win", () => {
  const first = step({...hand(),handsWon:2},"joker",deck), second = step(first,"joker",deck);
  assert.equal(second.jokersBought,2);
  assert.equal(second.player.filter(c => c === JOKER).length,2);
  assert.equal(total(second.player).value,21);
  assert.equal(second.phase,"between");
  assert.equal(second.handsWon,3);
  assert.equal(points(second),160);
  assert.equal(jokerPrice(second),150);
});
test("joker shifts value after hits and combines with aces", () => {
  assert.equal(total([1,2,JOKER]).value,16);
  assert.equal(total([1,2,JOKER,9]).value,21);
  assert.equal(total([0,JOKER,9]).value,21);
  assert.equal(total([9,8,JOKER,JOKER]).value,21);
  assert.equal(total([9,9,1,JOKER]).value,23);
});
test("joker prices rise across the run and cumulative spending is deducted", () => {
  assert.equal(jokerSpend(3),300);
  const first = step(hand(),"joker",deck);
  assert.equal(jokerPrice(first),100);
  assert.equal(canPlayJoker(first),false);
  assert.throws(()=>step(first,"joker",deck));
  const nextHand: State = {...first,round:3,player:[1,2]};
  assert.equal(jokerPrice(nextHand),100);
});
test("joker purchases reject insufficient funds, exhausted decks, and inactive hands", () => {
  for (const state of [{...hand(),handsWon:0}, {...hand(),next:52}, {...hand(),phase:"lost" as const}, initial()]) {
    assert.equal(canPlayJoker(state),false);
    assert.throws(()=>step(state,"joker",deck));
  }
});
test("signed joker actions replay with costs and detailed hand history", () => {
  const id = "2026-09-09";
  const moves: ("deal"|"stand"|"joker")[] = [];
  let run = runFor(id,moves);
  while (!run.canPlayJoker && !["lost","cleared"].includes(run.phase)) {
    moves.push(run.phase === "player" ? "stand" : "deal");
    run = runFor(id,moves);
  }
  assert.equal(run.canPlayJoker,true);
  moves.push("joker");
  run = runFor(id,moves);
  assert.equal(run.jokersBought,1);
  assert.deepEqual(verify(run.token,id)?.moves,moves);
  assert.equal(run.score,run.handsWon*100+run.cardsTurned-50);
  assert.deepEqual(readHistory(JSON.stringify({[id]:run}))[id],run);
  assert.match(detailedShareText(run), /\d+🤡/);
  assert.ok(!run.revealed.includes(JOKER));
});
test("detailed sharing shows each joker's final value including after a hit", () => {
  const run = runFor("2026-09-09",["deal"]);
  const text = detailedShareText({...run,playerHands:[[1,2,JOKER,9],[1,2,JOKER,JOKER],[0,JOKER,9]]});
  assert.ok(text.includes("Hand 1: 2♣ 3♣ 6🤡 10♣"));
  assert.ok(text.includes("Hand 2: 2♣ 3♣ 11🤡 5🤡"));
  assert.ok(text.includes("Hand 3: A♣ 10🤡 10♣"));
});

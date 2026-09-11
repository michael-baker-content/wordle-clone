import test from "node:test";
import assert from "node:assert/strict";
import { initial, step, points, canPlayJoker, type State } from "../lib/blackjack/engine.mjs";
import { practiceStep, practiceReplay } from "../lib/blackjack/practice.mjs";
import { GET, POST } from "../app/api/practice/route";
import { oracle } from "../lib/blackjack/strike-study.mjs";
const deck = Array.from({length:52},(_,i)=>i);
const hand = (): State => ({...initial(),phase:"player",round:1,next:4,hidden:true,player:[8,7],dealer:[9,9]});

test("first two strikes continue, third ends; each loss costs 100",()=>{
  for (const strikes of [0,1,2]) {
    const state = practiceStep({...hand(),strikes},"stand",deck);
    assert.equal(state.strikes,strikes+1);
    assert.equal(points(state),4-100*(strikes+1));
    assert.equal(state.phase,strikes===2 ? "lost" : "between");
  }
  assert.equal(step(hand(),"stand",deck).phase,"lost");
  assert.equal(points(step(hand(),"stand",deck)),4);
});
test("wins and pushes preserve strikes; penalties affect joker affordability",()=>{
  const won = practiceStep({...hand(),player:[9,0],strikes:1},"stand",deck);
  assert.equal(won.handsWon,1); assert.equal(won.strikes,1);
  const push = practiceStep({...hand(),player:[9,9],strikes:1},"stand",deck);
  assert.equal(push.handsWon,0); assert.equal(push.strikes,1);
  assert.equal(canPlayJoker({...hand(),strikes:1,handsWon:1}),false);
});
test("bust reveals hole without draws and exhaustion stops below three strikes",()=>{
  const bust = practiceStep({...hand(),next:9},"hit",deck);
  assert.equal(bust.next,10); assert.equal(bust.hidden,false); assert.equal(bust.strikes,1);
  const end = practiceStep({...hand(),next:51},"stand",deck);
  assert.equal(end.phase,"cleared"); assert.equal(end.strikes,1);
  assert.throws(()=>practiceReplay(deck,Array(105).fill("deal")));
});
test("practice endpoints are unavailable outside development",async()=>{
  assert.notEqual(process.env.NODE_ENV,"development");
  assert.equal(GET().status,404);
  const response = await POST(new Request("http://localhost/api/practice",{method:"POST",body:"{}"}));
  assert.equal(response.status,404);
  assert.equal(response.headers.get("set-cookie"),null);
});
test("practice replay is repeatable and retains strike penalties",()=>{
  const moves = ["deal","stand","deal","stand","deal","stand"] as const;
  // This ordered deck may end a hand immediately; build valid actions instead.
  let state = initial();
  const history: ("deal"|"stand")[] = [];
  for (let i=0;i<moves.length && state.phase!=="lost" && state.phase!=="cleared";i++) {
    const action = state.phase==="player" ? "stand" : "deal";
    history.push(action);
    state = practiceStep(state,action,deck);
  }
  assert.deepEqual(practiceReplay(deck,history),practiceReplay(deck,history));
  assert.equal(points(practiceReplay(deck,history)),points(state));
});
test("incomplete ceiling searches report unknown, not an incorrect maximum",()=>{
  const result = oracle(deck,true,true,1);
  assert.equal(result.complete,false);
  assert.equal(result.cards,null);
  assert.equal(result.points,null);
});

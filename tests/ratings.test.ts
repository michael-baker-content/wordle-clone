import test from "node:test";
import assert from "node:assert/strict";
import catalog from "../lib/blackjack/catalog.json";
import ratings from "../lib/blackjack/ratings.json";
import { analyzeRatings, ratingBands } from "../lib/blackjack/rating-analysis.mjs";
import { initial, actions, canPlayJoker, finished, points, stars, type State } from "../lib/blackjack/engine.mjs";
import { practiceStep } from "../lib/blackjack/practice.mjs";
import { runFor } from "../lib/blackjack/server";
import { readHistory } from "../lib/blackjack/client";

test("all daily three-strike ratings include joker costs and reproduce exact ranges",()=>{
  for(const date of Object.keys(catalog) as (keyof typeof catalog)[]) {
    const actual = analyzeRatings(catalog[date].deck,true);
    assert.deepEqual(actual,ratings[date].threeStrikes,date);
    assert.equal(stars(actual.minimum,actual.thresholds),1,date);
    assert.equal(stars(actual.maximum,actual.thresholds),5,date);
    assert.equal(stars(49,actual.thresholds),1,date);
    assert.equal(stars(50,actual.thresholds),2,date);
    assert.equal(actual.thresholds[3],Math.ceil(actual.minimum + (actual.maximum-actual.minimum)*4/5),date);
    for(const [i,threshold] of actual.thresholds.entries()) {
      assert.equal(stars(threshold-1,actual.thresholds),i+1);
      assert.equal(stars(threshold,actual.thresholds),i+2);
    }
  }
});
test("middle star bands start at 50 and preserve the five-star cutoff",()=>{
  assert.deepEqual(ratingBands(590),[50,230,410,590]);
  assert.equal(stars(-200,ratingBands(590)),1);
  assert.equal(stars(589,ratingBands(590)),4);
  assert.equal(stars(590,ratingBands(590)),5);
});
test("rating extrema match a separate exhaustive traversal",()=>{
  const deck = catalog["2026-09-09"].deck;
  let minimum=Infinity, maximum=-Infinity;
  function visit(state:State) {
    if(finished(state)){minimum=Math.min(minimum,points(state));maximum=Math.max(maximum,points(state));return;}
    const choices=[...actions(state)]; if(canPlayJoker(state))choices.push("joker");
    for(const action of choices)visit(practiceStep(state,action,deck));
  }
  visit(initial());
  const actual=analyzeRatings(deck,true);
  assert.equal(actual.minimum,minimum);assert.equal(actual.maximum,maximum);
});
test("official results use new bands and negative scores survive storage",()=>{
  const id="2026-09-11";
  const moves:("deal"|"stand")[]=[];
  let run=runFor(id,moves);
  while(!["lost","cleared"].includes(run.phase)) {
    assert.equal(run.stars,0);
    moves.push(run.phase==="player"?"stand":"deal");run=runFor(id,moves);
  }
  assert.equal(run.stars,stars(run.score,ratings[id].threeStrikes.thresholds));
  assert.deepEqual(readHistory(JSON.stringify({[id]:run}))[id],run);
  const negative={...run,score:-296,round:3,handsWon:0,strikes:3,jokersBought:0,cardsTurned:4};
  assert.equal(readHistory(JSON.stringify({[id]:negative}))[id].score,-296);
});

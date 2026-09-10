import test from "node:test";
import assert from "node:assert/strict";
import { cardsPerRow, CARD_WIDTH, MIN_CARD_EXPOSURE } from "../app/card-layout";

test("large hands keep readable corners within mobile table widths", () => {
  for (const viewport of [320, 360, 375, 390, 414]) {
    const width = viewport - 32 - 38; // shell gutters, table padding and border
    const count = cardsPerRow(width);
    assert.ok(CARD_WIDTH + (count - 1) * MIN_CARD_EXPOSURE <= width);
    assert.ok(Math.ceil(11 / count) <= 2);
    assert.ok(Math.ceil(10 / count) <= 2);
  }
});
test("a single deck limits player hands to 11 cards and dealer hands to 10", () => {
  // Each prior hand must be below 21 (player) or 17 (dealer) to take another card.
  // The smallest 11 cards already sum to 21; the smallest 10 sum to 18.
  const values = Array.from({length:52},(_,i)=>Math.min(i % 13 + 1,10)).sort((a,b)=>a-b);
  assert.equal(values.slice(0,11).reduce((a,b)=>a+b,0),21);
  assert.equal(values.slice(0,10).reduce((a,b)=>a+b,0),18);
  assert.equal(values.slice(0,9).reduce((a,b)=>a+b,0),15);
});

import test from "node:test";
import assert from "node:assert/strict";
import { easternDay, nextReset, statistics, shareText, readHistory, type History } from "../lib/game";
import { POST } from "../app/api/guess/route";
import { answerFor, currentPuzzle } from "../lib/puzzle-server";

test("Eastern dates change at midnight, not UTC midnight", () => {
  assert.equal(easternDay(new Date("2026-09-08T03:59:59Z")), "2026-09-07");
  assert.equal(easternDay(new Date("2026-09-08T04:00:00Z")), "2026-09-08");
});
test("reset handles both daylight saving transitions", () => {
  assert.equal(nextReset(new Date("2026-03-08T05:00:00Z")).toISOString(), "2026-03-09T04:00:00.000Z");
  assert.equal(nextReset(new Date("2026-11-01T04:00:00Z")).toISOString(), "2026-11-02T05:00:00.000Z");
});
test("participation streak includes unfinished games and lasts until a day is missed", () => {
  const history: History = {
    "2026-09-07": { id: "2026-09-07", attempts: [{ value: 1, feedback: "higher" }] },
    "2026-09-08": { id: "2026-09-08", attempts: [{ value: 2, feedback: "correct" }], answer: 2 }
  };
  assert.deepEqual(statistics(history, "2026-09-08"), { played: 2, wins: 1, streak: 2 });
  assert.equal(statistics(history, "2026-09-09").streak, 2);
  assert.equal(statistics(history, "2026-09-10").streak, 0);
});
test("sharing omits the answer and directional clues", () => {
  assert.equal(shareText({ id: "2026-09-08", attempts: [{ value: 25, feedback: "higher" }, { value: 37, feedback: "correct" }], answer: 37 }), "Daily Number · 2026-09-08\nSolved in 2/5\n🫧💠");
});
test("invalid stored game entries are ignored", () => {
  assert.deepEqual(readHistory('{"2026-09-08":{"id":"2026-09-08","attempts":[{"value":99,"feedback":"higher"}]}}'), {});
});
test("guess endpoint validates attempts, hides unfinished answers, and reveals completed answers", async () => {
  process.env.PUZZLE_SECRET = "test-secret";
  const id = currentPuzzle().id;
  const answer = answerFor(id);
  const miss = answer === 1 ? 2 : 1;
  const request = (guesses: number[], day = id) => POST(new Request("http://localhost/api/guess", { method: "POST", body: JSON.stringify({ id: day, guesses }) }));
  const unfinished = await (await request([miss])).json();
  assert.equal(unfinished.game.answer, undefined);
  assert.equal((await (await request([miss, answer])).json()).game.answer, answer);
  assert.equal((await request([miss, miss])).status, 400);
  assert.equal((await request([51])).status, 400);
  assert.equal((await request([1, 2, 3, 4, 5, 6])).status, 400);
  assert.equal((await request([miss], "2000-01-01")).status, 409);
  const fiveMisses = Array.from({ length: 50 }, (_, i) => i + 1).filter(n => n !== answer).slice(0, 5);
  assert.equal((await (await request(fiveMisses)).json()).game.answer, answer);
});

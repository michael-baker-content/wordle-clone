import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { COOKIE, cookieTicket, dailyFor, responseFor, sign, verify } from "../lib/blackjack/server";
import { PROGRESS_VERSION, STORAGE_KEY, HELP_KEY, SOUND_KEY } from "../lib/blackjack/progress";

test("previous game tokens cannot recover a run and are replaced on load", () => {
  process.env.PUZZLE_SECRET = "reset-test-secret";
  const id = "2026-09-09";
  const ticket = {id,version:"blackjack-v2",moves:["deal"] as ("deal")[]};
  const payload = Buffer.from(JSON.stringify(ticket)).toString("base64url");
  const old = payload + "." + createHmac("sha256",process.env.PUZZLE_SECRET).update(payload).digest("base64url");
  assert.equal(verify(old,id),null);
  const request = new Request("http://localhost/api/blackjack",{headers:{cookie:`${COOKIE}=${old}`}});
  assert.equal(cookieTicket(request,id),null);
  const daily = dailyFor(cookieTicket(request,id)?.moves ?? [],new Date("2026-09-09T12:00:00Z"));
  assert.equal(daily.run.revision,0);
  assert.equal(daily.run.score,0);
  assert.ok(responseFor(daily).headers.get("set-cookie")?.startsWith(COOKIE + "=" + daily.run.token));
  assert.deepEqual(verify(sign(ticket),id)?.moves,["deal"]);
});

test("runs and all preferences use the same new progress version", () => {
  for (const key of [STORAGE_KEY,HELP_KEY,SOUND_KEY]) assert.ok(key.startsWith(PROGRESS_VERSION + ":"));
  assert.equal(new Set([STORAGE_KEY,HELP_KEY,SOUND_KEY]).size,3);
  assert.notEqual(STORAGE_KEY,"daily-blackjack:history:v1");
  assert.notEqual(HELP_KEY,"daily-blackjack:help:v1");
  assert.notEqual(SOUND_KEY,"jacklet:sound");
});

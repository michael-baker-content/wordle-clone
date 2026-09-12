import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPersistent, playPersistent, type RunStore } from '../lib/blackjack/persistence';
import { PLAYER_COOKIE, newPlayer, playerFrom, playerToken } from '../lib/blackjack/identity';
import { isFinished, type Daily } from '../lib/blackjack/client';
import type { Action } from '../lib/blackjack/engine.mjs';

const now = new Date('2026-09-11T12:00:00Z');
function memoryStore() {
  const records = new Map<string, { moves: Action[]; daily: Daily }>();
  const store: RunStore = {
    async storedMoves(player, date) { return [...(records.get(`${player}:${date}`)?.moves ?? [])]; },
    async saveRun(player, moves, daily) {
      const key = `${player}:${daily.id}`, old = records.get(key);
      if ((old?.moves.length ?? 0) !== moves.length - 1 || (old && isFinished(old.daily.run))) return false;
      records.set(key, { moves: [...moves], daily });
      return true;
    }
  };
  return { store, records };
}
function request(player: string) {
  return new Request('https://jacklet.test/api/blackjack', { headers: { cookie: `${PLAYER_COOKIE}=${playerToken(player)}` } });
}
test('visiting creates no run; concurrent deals commit exactly one start', async () => {
  const { store, records } = memoryStore(), req = request(newPlayer());
  const daily: Daily = await (await loadPersistent(req, now, store)).json();
  assert.equal(records.size, 0);
  const body = { id: daily.id, token: daily.run.token, action: 'deal' };
  const responses = await Promise.all([playPersistent(req, body, now, store), playPersistent(req, body, now, store)]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
  assert.equal(records.size, 1);
  assert.equal([...records.values()][0].moves.length, 1);
  const recovered: Daily = await (await loadPersistent(req, now, store)).json();
  assert.equal(recovered.run.revision, 1);
  const retry = await playPersistent(req, body, now, store);
  assert.equal(retry.status, 409);
  assert.deepEqual((await retry.json()).run, recovered.run);
});
test('server restores authoritative progress without the run cookie or browser history', async () => {
  const { store } = memoryStore(), req = request(newPlayer());
  const initial: Daily = await (await loadPersistent(req, now, store)).json();
  const dealt: Daily = await (await playPersistent(req, { id: initial.id, token: initial.run.token, action: 'deal' }, now, store)).json();
  const resumed: Daily = await (await playPersistent(req, { id: initial.id, token: initial.run.token, action: 'resume' }, now, store)).json();
  assert.deepEqual(resumed.run, dealt.run);
  const other: Daily = await (await loadPersistent(request(newPlayer()), now, store)).json();
  assert.equal(other.run.revision, 0);
});
test('completed results cannot be changed by retrying or replaying an old token', async () => {
  const { store, records } = memoryStore(), req = request(newPlayer());
  let daily: Daily = await (await loadPersistent(req, now, store)).json();
  const first = daily;
  for (let i = 0; i < 104 && !isFinished(daily.run); i++) {
    const response = await playPersistent(req, { id: daily.id, token: daily.run.token, action: daily.run.phase === 'player' ? 'stand' : 'deal' }, now, store);
    assert.equal(response.status, 200);
    daily = await response.json();
  }
  assert.ok(isFinished(daily.run));
  const stored = [...records.values()][0];
  assert.equal(stored.daily.run.score, daily.run.score);
  assert.ok(daily.run.stars >= 1 && daily.run.stars <= 5);
  assert.equal((await playPersistent(req, { id: daily.id, token: daily.run.token, action: 'deal' }, now, store)).status, 400);
  assert.equal((await playPersistent(req, { id: daily.id, token: first.run.token, action: 'deal' }, now, store)).status, 409);
  assert.equal([...records.values()][0], stored);
});
test('missing identity cannot import a signed run and forged identity is rejected', async () => {
  const { store, records } = memoryStore();
  const req = new Request('https://jacklet.test/api/blackjack');
  const response = await playPersistent(req, { action: 'deal' }, now, store);
  assert.equal(response.status, 409);
  assert.equal((await response.json()).run.revision, 0);
  assert.equal(records.size, 0);
  assert.ok(response.headers.get('set-cookie')?.includes(`${PLAYER_COOKIE}=`));
  const id = newPlayer();
  assert.equal(playerFrom(request(id)), id);
  const forged = new Request(req.url, { headers: { cookie: `${PLAYER_COOKIE}=${id}.forged` } });
  assert.equal(playerFrom(forged), null);
});

test('an expired puzzle request returns the new day without recording a start', async () => {
  const { store, records } = memoryStore(), req = request(newPlayer());
  const daily: Daily = await (await loadPersistent(req, now, store)).json();
  const tomorrow = new Date('2026-09-12T12:00:00Z');
  const response = await playPersistent(req, { id: daily.id, token: daily.run.token, action: 'deal' }, tomorrow, store);
  assert.equal(response.status, 409);
  assert.equal((await response.json()).id, '2026-09-12');
  assert.equal(records.size, 0);
});

test('a failed save never returns an apparently accepted action', async () => {
  const { store, records } = memoryStore(), req = request(newPlayer());
  const daily: Daily = await (await loadPersistent(req, now, store)).json();
  const unavailable: RunStore = { ...store, async saveRun() { throw new Error('unavailable'); } };
  await assert.rejects(playPersistent(req, { id: daily.id, token: daily.run.token, action: 'deal' }, now, unavailable));
  assert.equal(records.size, 0);
});

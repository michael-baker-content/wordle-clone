import { easternDay } from './dates';
import { actions, canPlayJoker, type Action } from './engine.mjs';
import { practiceReplay } from './practice.mjs';
import { dailyFor, entryFor, responseFor, verify } from './server';
import { newPlayer, playerFrom, withPlayer } from './identity';
import type { Daily } from './client';

export type RunStore = {
  storedMoves(player: string, date: string): Promise<Action[]>;
  saveRun(player: string, moves: Action[], daily: Daily): Promise<boolean>;
};
export async function loadPersistent(request: Request, now: Date, store: RunStore) {
  const player = playerFrom(request) ?? newPlayer();
  const moves = await store.storedMoves(player, easternDay(now));
  return withPlayer(responseFor(dailyFor(moves, now)), player);
}
export async function playPersistent(request: Request, body: { id?: unknown; token?: unknown; action?: unknown }, now: Date, store: RunStore) {
  const player = playerFrom(request);
  // A missing/reset identity must first load a fresh run, never import browser history.
  if (!player) {
    const response = await loadPersistent(request, now, store);
    return new Response(response.body, { status: 409, headers: response.headers });
  }
  const id = easternDay(now), moves = await store.storedMoves(player, id);
  const respond = (daily: Daily, status = 200) => withPlayer(responseFor(daily, status), player);
  if (body.id !== id) return respond(dailyFor(moves, now), 409);
  if (body.action === 'resume') return respond(dailyFor(moves, now));
  const ticket = verify(body.token, id);
  if (!ticket || JSON.stringify(ticket.moves) !== JSON.stringify(moves)) return respond(dailyFor(moves, now), 409);
  const state = practiceReplay(entryFor(id).deck, moves);
  const action = body.action;
  if (action === 'joker' ? !canPlayJoker(state) : !actions(state).includes(action as Action)) {
    return Response.json({ error: 'That action is no longer available.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  const nextMoves = [...moves, action as Action], daily = dailyFor(nextMoves, now);
  if (await store.saveRun(player, nextMoves, daily)) return respond(daily);
  return respond(dailyFor(await store.storedMoves(player, id), now), 409);
}

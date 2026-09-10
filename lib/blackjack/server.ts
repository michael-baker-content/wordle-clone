import { createHmac, timingSafeEqual } from "node:crypto";
import catalog from "./catalog.json";
import { easternDay, nextReset } from "./dates";
import { replay, initial, step, score, points, stars, finished, canPlayJoker, RULES_VERSION, type Action } from "./engine.mjs";
import type { Run, Daily } from "./client";
import { PROGRESS_VERSION } from "./progress";

export type Entry = { rulesVersion: string; seed: number; deck: number[]; minimum: number; maximum: number; thresholds: number[]; pointThresholds: number[] };
type Ticket = { id: string; version: string; moves: Action[]; jokerPricing?: number };
export const COOKIE = "daily-blackjack-v1";
export function entryFor(id: string): Entry {
  const entry = (catalog as Record<string, Entry>)[id];
  if (!entry || !["blackjack-v1", RULES_VERSION].includes(entry.rulesVersion)) throw new Error("No approved deck scheduled for this date.");
  return entry;
}
function signature(payload: string) {
  const key = process.env.PUZZLE_SECRET || (process.env.NODE_ENV !== "production" ? "blackjack-local-development" : "");
  if (!key) throw new Error("PUZZLE_SECRET is required in production.");
  return createHmac("sha256", key).update(PROGRESS_VERSION + ":" + payload).digest("base64url");
}
export function sign(ticket: Ticket) {
  const payload = Buffer.from(JSON.stringify(ticket)).toString("base64url");
  return `${payload}.${signature(payload)}`;
}
export function verify(token: unknown, id: string): Ticket | null {
  if (typeof token !== "string" || token.length > 4096) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const expected = Buffer.from(signature(parts[0])), actual = Buffer.from(parts[1]);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const ticket = JSON.parse(Buffer.from(parts[0], "base64url").toString()) as Ticket;
    const entry = entryFor(id);
    const migrate = id === "2026-09-09" && ticket.version === "blackjack-v1" && entry.rulesVersion === "blackjack-v2";
    if (ticket.id !== id || (!migrate && ticket.version !== entry.rulesVersion) || !Array.isArray(ticket.moves) || ticket.moves.length > 104 || !ticket.moves.every(m => ["deal", "hit", "stand", "joker"].includes(m))) return null;
    if (migrate) {
      // Validate the signed old run before replaying it under today's updated rules.
      replay(entry.deck, ticket.moves, "blackjack-v1");
      let state = initial();
      const moves: Action[] = [];
      for (const move of ticket.moves) {
        if (finished(state)) break;
        state = step(state, move, entry.deck, entry.rulesVersion);
        moves.push(move);
      }
      return { id, version: entry.rulesVersion, moves };
    }
    if (ticket.moves.includes("joker") && ticket.jokerPricing !== 2) {
      let state = initial();
      const moves: Action[] = [];
      for (const move of ticket.moves) {
        if (finished(state) || (move === "joker" && !canPlayJoker(state))) break;
        state = step(state, move, entry.deck, entry.rulesVersion);
        moves.push(move);
      }
      return { id, version: entry.rulesVersion, moves, jokerPricing:2 };
    }
    return ticket;
  } catch { return null; }
}
export function cookieTicket(request: Request, id: string) {
  const token = request.headers.get("cookie")?.split(";").map(c => c.trim()).find(c => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  return verify(token, id);
}
export function runFor(id: string, moves: Action[]): Run {
  const entry = entryFor(id), state = replay(entry.deck, moves, entry.rulesVersion);
  const playerHands: number[][] = [];
  let historyState = initial();
  for (const move of moves) {
    historyState = step(historyState, move, entry.deck, entry.rulesVersion);
    if (historyState.round > 0) playerHands[historyState.round - 1] = [...historyState.player];
  }
  // The hole card is always the fourth card of this hand's initial deal.
  const hole = state.hidden ? state.dealer[1] : undefined;
  return {
    id, token: sign({ id, version: entry.rulesVersion, moves, ...(moves.includes("joker") ? {jokerPricing:2} : {}) }), revision: moves.length,
    player: state.player, dealer: state.dealer.map((c, i) => state.hidden && i === 1 ? null : c),
    phase: state.phase, score: points(state), cardsTurned: score(state), stars: finished(state) ? stars(points(state), entry.pointThresholds) : 0,
    round: state.round, handsWon: state.handsWon, jokersBought: state.jokersBought ?? 0, canPlayJoker: canPlayJoker(state), playerHands, message: state.message,
    revealed: entry.deck.slice(0, state.next).filter(c => c !== hole)
  };
}
export function dailyFor(moves: Action[] = [], now = new Date()): Daily {
  const id = easternDay(now);
  return { id, serverTime: now.toISOString(), resetsAt: nextReset(now).toISOString(),
    rulesVersion: entryFor(id).rulesVersion, run: runFor(id, moves) };
}
export function responseFor(daily: Daily, status = 200) {
  return Response.json(daily, { status, headers: {
    "Cache-Control": "no-store",
    "Set-Cookie": `${COOKIE}=${daily.run.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=172800${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  } });
}

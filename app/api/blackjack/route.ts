import { easternDay } from "../../../lib/blackjack/dates";
import { actions, canPlayJoker, type Action } from "../../../lib/blackjack/engine.mjs";
import { practiceReplay } from "../../../lib/blackjack/practice.mjs";
import { cookieTicket, dailyFor, entryFor, responseFor, verify } from "../../../lib/blackjack/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const error = (message: string, status: number) => Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
export function GET(request: Request) {
  try {
    const now = new Date(), id = easternDay(now), ticket = cookieTicket(request, id);
    return responseFor(dailyFor(ticket?.moves ?? [], now));
  } catch { return error("Today’s deck is unavailable. Please check back shortly.", 503); }
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return error("Please play from the game page.", 403);
    const raw = await request.text();
    if (raw.length > 6000) return error("Request too large.", 413);
    const body = JSON.parse(raw);
    const now = new Date(), id = easternDay(now), cookie = cookieTicket(request, id);
    if (body?.id !== id) return responseFor(dailyFor(cookie?.moves ?? [], now), 409);
    const ticket = verify(body.token, id);
    if (!ticket) return error("Saved progress could not be verified. Refresh to recover your run.", 400);
    // Recover the latest cookie after a dropped response or a stale second tab.
    const latest = cookie && cookie.moves.length >= ticket.moves.length ? cookie : ticket;
    if (body.action === "resume") return responseFor(dailyFor(latest.moves, now));
    if (JSON.stringify(latest.moves) !== JSON.stringify(ticket.moves)) return responseFor(dailyFor(latest.moves, now), 409);
    const entry = entryFor(id);
    const state = practiceReplay(entry.deck, latest.moves);
    if (body.action === "joker" ? !canPlayJoker(state) : !actions(state).includes(body.action)) return error("That action is no longer available.", 400);
    return responseFor(dailyFor([...latest.moves, body.action as Action], now));
  } catch (err) {
    if (err instanceof SyntaxError) return error("That action could not be read.", 400);
    return error("Couldn’t update your run. Refresh to recover the latest progress.", 503);
  }
}

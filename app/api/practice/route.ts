import catalog from "../../../lib/blackjack/catalog.json";
import ratings from "../../../lib/blackjack/ratings.json";
import { practiceReplay } from "../../../lib/blackjack/practice.mjs";
import { points, score, canPlayJoker, finished, stars, type Action } from "../../../lib/blackjack/engine.mjs";

const json = (data: unknown, status = 200) => Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
export function GET() {
  if (process.env.NODE_ENV !== "development") return json({error:"Not found"},404);
  return json({dates:Object.keys(catalog).sort()});
}
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return json({error:"Not found"},404);
  try {
    if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return json({error:"Invalid origin"},403);
    const raw = await request.text();
    if (raw.length > 6000) return json({error:"Request too large"},413);
    const {id,moves} = JSON.parse(raw);
    const entry = (catalog as Record<string,{deck:number[]}>)[id];
    if (!entry || !Array.isArray(moves) || moves.length > 104 || !moves.every(m=>["deal","hit","stand","joker"].includes(m))) return json({error:"Invalid practice run"},400);
    const state = practiceReplay(entry.deck,moves as Action[]);
    return json({id,player:state.player,dealer:state.dealer.map((card,i)=>state.hidden && i===1 ? null : card),
      phase:state.phase,round:state.round,handsWon:state.handsWon,strikes:state.strikes ?? 0,
      jokersBought:state.jokersBought ?? 0,score:points(state),cardsTurned:score(state),
      stars:finished(state) ? stars(points(state),(ratings as Record<string,{threeStrikes:{thresholds:number[]}}>)[id].threeStrikes.thresholds) : 0,
      canPlayJoker:canPlayJoker(state),message:state.message});
  } catch { return json({error:"Could not replay those practice actions."},400); }
}

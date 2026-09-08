import { currentPuzzle } from "../../../lib/puzzle-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return Response.json(currentPuzzle(), { headers: { "Cache-Control": "no-store" } });
}

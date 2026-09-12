import { databaseEnabled, playerStatistics } from '../../../lib/blackjack/database';
import { playerFrom } from '../../../lib/blackjack/identity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
export async function GET(request: Request) {
  try {
    if (!databaseEnabled()) return Response.json({ error: 'Statistics storage is not configured.' }, { status: 503, headers });
    const player = playerFrom(request);
    if (!player) return Response.json({ started: 0, completed: 0, best: null, average: null, recent: [] }, { headers });
    return Response.json(await playerStatistics(player), { headers });
  } catch {
    return Response.json({ error: 'Statistics are temporarily unavailable.' }, { status: 503, headers });
  }
}

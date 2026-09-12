import { neon } from '@neondatabase/serverless';
import { PROGRESS_VERSION } from './progress';
import { storageEnvironment } from './identity';
import { isFinished, type Daily } from './client';
import type { Action } from './engine.mjs';

export function databaseEnabled() { return !!(process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL); }
function database() {
  const url = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
  if (!url) throw new Error('Database is not configured.');
  return neon(url, { fetchOptions: { cache: 'no-store', signal: AbortSignal.timeout(10000) } });
}
export async function storedMoves(player: string, date: string): Promise<Action[]> {
  const sql = database();
  const rows = await sql`SELECT moves FROM jacklet_runs
    WHERE environment = ${storageEnvironment()} AND generation = ${PROGRESS_VERSION}
      AND player_id = ${player}::uuid AND puzzle_date = ${date}::date`;
  return rows.length ? rows[0].moves as Action[] : [];
}

// One atomic compare-and-swap. Only the request extending the stored revision wins.
// A lost response can therefore be recovered without applying its action again.
export async function saveRun(player: string, moves: Action[], daily: Daily): Promise<boolean> {
  const sql = database(), run = daily.run;
  const rows = await sql`INSERT INTO jacklet_runs (
    environment, generation, player_id, puzzle_date, rules_version, moves, revision,
    score, stars, hands_played, hands_won, strikes, jokers_bought, cards_revealed, phase, completed_at
  ) VALUES (
    ${storageEnvironment()}, ${PROGRESS_VERSION}, ${player}::uuid, ${daily.id}::date,
    ${daily.rulesVersion}, ${JSON.stringify(moves)}::jsonb, ${run.revision},
    ${run.score}, ${run.stars}, ${run.round}, ${run.handsWon}, ${run.strikes ?? 0},
    ${run.jokersBought ?? 0}, ${run.cardsTurned}, ${run.phase},
    CASE WHEN ${isFinished(run)} THEN now() ELSE NULL END
  ) ON CONFLICT (environment, generation, player_id, puzzle_date) DO UPDATE SET
    moves = EXCLUDED.moves, revision = EXCLUDED.revision, score = EXCLUDED.score,
    stars = EXCLUDED.stars, hands_played = EXCLUDED.hands_played, hands_won = EXCLUDED.hands_won,
    strikes = EXCLUDED.strikes, jokers_bought = EXCLUDED.jokers_bought,
    cards_revealed = EXCLUDED.cards_revealed, phase = EXCLUDED.phase,
    updated_at = now(), completed_at = EXCLUDED.completed_at
  WHERE jacklet_runs.revision = EXCLUDED.revision - 1
    AND jacklet_runs.completed_at IS NULL
    AND jacklet_runs.rules_version = EXCLUDED.rules_version
    AND jacklet_runs.moves = (EXCLUDED.moves - (EXCLUDED.revision - 1))
  RETURNING revision`;
  return rows.length === 1;
}

export async function playerStatistics(player: string) {
  const sql = database();
  const rows = await sql`SELECT count(*)::int AS started,
    count(completed_at)::int AS completed,
    max(score) FILTER (WHERE completed_at IS NOT NULL) AS best,
    round(avg(score) FILTER (WHERE completed_at IS NOT NULL), 1)::float8 AS average
    FROM jacklet_runs WHERE environment = ${storageEnvironment()}
      AND generation = ${PROGRESS_VERSION} AND player_id = ${player}::uuid`;
  const recent = await sql`SELECT puzzle_date::text AS date, score, stars,
    hands_played AS "handsPlayed", hands_won AS "handsWon"
    FROM jacklet_runs WHERE environment = ${storageEnvironment()}
      AND generation = ${PROGRESS_VERSION} AND player_id = ${player}::uuid
      AND completed_at IS NOT NULL ORDER BY puzzle_date DESC LIMIT 10`;
  return { ...rows[0], recent };
}

import { evaluate, MAX_ATTEMPTS, MAX_NUMBER, MIN_NUMBER } from "../../../lib/game";
import { answerFor, currentPuzzle } from "../../../lib/puzzle-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const body = await request.json();
    const puzzle = currentPuzzle();
    if (body?.id !== puzzle.id) return Response.json({ error: "A new daily puzzle is ready.", puzzle }, { status: 409, headers });
    const guesses: unknown = body.guesses;
    if (!Array.isArray(guesses) || guesses.length < 1 || guesses.length > MAX_ATTEMPTS ||
      !guesses.every(n => Number.isInteger(n) && n >= MIN_NUMBER && n <= MAX_NUMBER) || new Set(guesses).size !== guesses.length) {
      return Response.json({ error: "Enter a new whole number from 1 to 50." }, { status: 400, headers });
    }
    const answer = answerFor(puzzle.id);
    if (guesses.slice(0, -1).includes(answer)) return Response.json({ error: "This puzzle is already solved." }, { status: 400, headers });
    const attempts = (guesses as number[]).map(value => ({ value, feedback: evaluate(value, answer) }));
    const finished = guesses.includes(answer) || guesses.length === MAX_ATTEMPTS;
    return Response.json({ game: { id: puzzle.id, attempts, ...(finished ? { answer } : {}) }, puzzle }, { headers });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "That guess could not be read." }, { status: 400, headers });
    return Response.json({ error: "The puzzle is temporarily unavailable. Please try again." }, { status: 503, headers });
  }
}

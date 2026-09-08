export const MAX_ATTEMPTS = 5;
export const MIN_NUMBER = 1;
export const MAX_NUMBER = 50;
export const TIME_ZONE = "America/New_York";

export type Feedback = "higher" | "lower" | "correct";
export type Attempt = { value: number; feedback: Feedback };
export type Puzzle = { id: string; resetsAt: string; serverTime: string };
export type Game = { id: string; attempts: Attempt[]; answer?: number };
export type History = Record<string, Game>;

export function easternDay(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function previousDay(id: string): string {
  const date = new Date(`${id}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

// Find the first instant of the next Eastern date, including 23/25-hour days.
export function nextReset(now: Date): Date {
  const today = easternDay(now);
  let low = now.getTime();
  let high = low + 26 * 60 * 60 * 1000;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (easternDay(new Date(mid)) === today) low = mid;
    else high = mid;
  }
  return new Date(high);
}

export function isWon(game: Game): boolean {
  return game.attempts.some(attempt => attempt.feedback === "correct");
}

export function isFinished(game: Game): boolean {
  return isWon(game) || game.attempts.length >= MAX_ATTEMPTS;
}

export function evaluate(value: number, answer: number): Feedback {
  return value === answer ? "correct" : value < answer ? "higher" : "lower";
}

export function statistics(history: History, today: string) {
  const played = Object.values(history).filter(game => game.attempts.length > 0);
  let cursor = history[today]?.attempts.length ? today : previousDay(today);
  let streak = 0;
  while (history[cursor]?.attempts.length) {
    streak++;
    cursor = previousDay(cursor);
  }
  return { played: played.length, wins: played.filter(isWon).length, streak };
}

export function shareText(game: Game): string {
  // No guesses, answer, or directional clues in the shared result.
  const marks = game.attempts.map(a => a.feedback === "correct" ? "💠" : "🫧").join("");
  return `Daily Number · ${game.id}\n${isWon(game) ? `Solved in ${game.attempts.length}/${MAX_ATTEMPTS}` : `Not today · ${MAX_ATTEMPTS}/${MAX_ATTEMPTS}`}\n${marks}`;
}

export function readHistory(raw: string | null): History {
  if (!raw) return {};
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid saved progress");
  const history: History = {};
  for (const [id, value] of Object.entries(data)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(id) || !value || typeof value !== "object") continue;
    const game = value as Game;
    if (game.id !== id || !Array.isArray(game.attempts) || game.attempts.length > MAX_ATTEMPTS) continue;
    if (!game.attempts.every(a => a && Number.isInteger(a.value) && a.value >= MIN_NUMBER && a.value <= MAX_NUMBER && ["higher", "lower", "correct"].includes(a.feedback))) continue;
    if (game.attempts.some((a, index) => a.feedback === "correct" && index !== game.attempts.length - 1)) continue;
    if (new Set(game.attempts.map(a => a.value)).size !== game.attempts.length) continue;
    history[id] = { id, attempts: game.attempts, ...(Number.isInteger(game.answer) && game.answer! >= MIN_NUMBER && game.answer! <= MAX_NUMBER ? { answer: game.answer } : {}) };
  }
  return history;
}

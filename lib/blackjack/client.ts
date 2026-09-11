import { previousDay } from "./dates";
import { JOKER, jokerSpend, jokerValues, RANKS, type Phase } from "./engine.mjs";

export type Run = {
  id: string; token: string; revision: number;
  player: number[]; dealer: (number | null)[]; phase: Phase;
  score: number; cardsTurned: number; stars: number; round: number; handsWon: number; message: string;
  revealed: number[];
  playerHands?: number[][];
  jokersBought?: number;
  canPlayJoker?: boolean;
  strikes?: number;
};
export type Daily = { id: string; serverTime: string; resetsAt: string; rulesVersion: string; run: Run };
export type History = Record<string, Run>;
export { STORAGE_KEY, HELP_KEY, SOUND_KEY } from "./progress";
export function isFinished(run: Run) { return run.phase === "lost" || run.phase === "cleared"; }
export function statistics(history: History, today: string) {
  const played = Object.values(history).filter(r => r.revision > 0);
  let day = history[today]?.revision ? today : previousDay(today), streak = 0;
  while (history[day]?.revision) { streak++; day = previousDay(day); }
  return { played: played.length, cleared: played.filter(r => r.phase === "cleared").length, streak };
}
export function shareText(run: Run) {
  const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${run.id}T12:00:00Z`));
  return `♠ Jacklet · ${date}\n${run.score} points\n${"★".repeat(run.stars)}${"☆".repeat(5 - run.stars)}`;
}
export function readHistory(raw: string | null): History {
  if (!raw) return {};
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid progress");
  const result: History = {};
  const card = (c: unknown) => Number.isInteger(c) && Number(c) >= 0 && Number(c) < 52;
  for (const [id, value] of Object.entries(parsed)) {
    const r = value as Run;
    if (!r || r.id !== id || !/^\d{4}-\d{2}-\d{2}$/.test(id) || typeof r.token !== "string" ||
      !Number.isInteger(r.revision) || r.revision < 1 || r.revision > 104 ||
      !["player", "between", "lost", "cleared"].includes(r.phase) ||
      !Number.isInteger(r.score) || r.score < -300 || r.score > 1352 ||
      !Number.isInteger(r.stars) || r.stars < 0 || r.stars > 5 ||
      !Array.isArray(r.player) || !r.player.every(c => c === JOKER || card(c)) || !Array.isArray(r.dealer) || !r.dealer.every(c => c === null || card(c)) ||
      !Array.isArray(r.revealed) || !r.revealed.every(card)) continue;
    if (r.handsWon !== undefined && (!Number.isInteger(r.handsWon) || r.handsWon < 0 || r.handsWon > r.round)) continue;
    if (!Number.isInteger(r.round) || r.round < 1 || r.round > 13) continue;
    const cardsTurned = r.cardsTurned ?? r.score;
    const handsWon = r.handsWon ?? 0;
    const strikes = r.strikes ?? 0;
    if (!Number.isInteger(strikes) || strikes < 0 || strikes > 3) continue;
    const jokersBought = r.jokersBought ?? 0;
    if (!Number.isInteger(jokersBought) || jokersBought < 0 || jokersBought > 27) continue;
    if (!Number.isInteger(cardsTurned) || cardsTurned < 0 || cardsTurned > 52) continue;
    if (r.cardsTurned !== undefined && r.score !== handsWon * 100 + cardsTurned - jokerSpend(jokersBought) - strikes * 100 && !(r.strikes === undefined && r.score === handsWon * 100 + cardsTurned - jokersBought * 50)) continue;
    // Migrate card-only saves; server replay restores today's authoritative result.
    result[id] = { ...r, cardsTurned, handsWon, score: r.cardsTurned === undefined ? handsWon * 100 + cardsTurned : r.score };
  }
  return result;
}

export function detailedShareText(run: Run) {
  const suits = ["♣", "♦", "♥", "♠"];
  const hands = (run.playerHands ?? []).map((cards, index) => {
    const values = jokerValues(cards);
    let jokerIndex = 0;
    return `Hand ${index + 1}: ${cards.map(card => card === JOKER ? `${values[jokerIndex++]}🤡` : RANKS[card % 13] + suits[Math.floor(card / 13)]).join(" ")}`;
  });
  return `${shareText(run)}\n\nYour hands\n${hands.join("\n")}`;
}

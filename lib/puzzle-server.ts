import { createHmac } from "node:crypto";
import { easternDay, nextReset, type Puzzle } from "./game";

export function currentPuzzle(now = new Date()): Puzzle {
  return { id: easternDay(now), resetsAt: nextReset(now).toISOString(), serverTime: now.toISOString() };
}

export function answerFor(id: string): number {
  const secret = process.env.PUZZLE_SECRET || (process.env.NODE_ENV === "production" ? "" : "daily-number-local-development");
  if (!secret) throw new Error("PUZZLE_SECRET must be configured in production.");
  return createHmac("sha256", secret).update(`daily-number:v1:${id}`).digest().readUInt32BE(0) % 50 + 1;
}

// Keep enough of each covered card visible for a two-character rank and suit.
export const CARD_WIDTH = 72;
export const MIN_CARD_EXPOSURE = 32;
export function cardsPerRow(width: number) {
  return Math.max(1, Math.min(6, Math.floor((width - CARD_WIDTH) / MIN_CARD_EXPOSURE) + 1));
}

export const TIME_ZONE = "America/New_York";
export function easternDay(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function previousDay(id: string): string {
  const date = new Date(`${id}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
export function nextReset(now: Date): Date {
  const today = easternDay(now);
  let low = now.getTime(), high = low + 26 * 60 * 60 * 1000;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (easternDay(new Date(mid)) === today) low = mid; else high = mid;
  }
  return new Date(high);
}

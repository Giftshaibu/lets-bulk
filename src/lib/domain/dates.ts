export const TIMEZONE = "Africa/Blantyre";
export function getLocalDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export const startOfLocalDay = (date: string) => new Date(`${date}T00:00:00+02:00`);
export const endOfLocalDay = (date: string) =>
  new Date(startOfLocalDay(addDays(date, 1)).getTime() - 1);
export function getCurrentWeekRange(date = getLocalDate()) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const start = addDays(date, -((weekday + 6) % 7));
  return { start, end: addDays(start, 6) };
}
export function getPreviousWeekRange(date = getLocalDate()) {
  return getCurrentWeekRange(addDays(date, -7));
}
export const daysBetween = (a: string, b: string) =>
  Math.round((startOfLocalDay(b).getTime() - startOfLocalDay(a).getTime()) / 86400000);

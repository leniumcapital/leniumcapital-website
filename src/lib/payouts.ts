/** Early-withdrawal fee schedule shared by the API route and the client UI. */
export function feePctForDaysEarly(daysEarly: number): number {
  if (daysEarly <= 0) return 0;
  if (daysEarly <= 3) return 25;
  if (daysEarly <= 7) return 20;
  if (daysEarly <= 11) return 15;
  if (daysEarly <= 13) return 10;
  return 25;
}

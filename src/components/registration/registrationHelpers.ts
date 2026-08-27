const DAY_MS = 24 * 3600 * 1000;

export function defaultDeadlineFromNow(days = 7): string {
  return new Date(Date.now() + days * DAY_MS).toISOString();
}

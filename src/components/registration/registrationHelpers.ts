const DAY_MS = 24 * 3600 * 1000;

export function defaultDeadlineFromNow(days = 7): string {
  return new Date(Date.now() + days * DAY_MS).toISOString();
}

export function toLocalInputValue(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

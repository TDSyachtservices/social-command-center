export function nowIso(): string {
  return new Date().toISOString();
}

export function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 3600_000);
}

export function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

export function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 86_400_000);
}

export function minutesAgo(n: number): Date {
  return new Date(Date.now() - n * 60_000);
}

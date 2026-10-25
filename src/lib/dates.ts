// Date ISO "YYYY-MM-DD" in fuso orario locale. Funzioni pure.

const pad = (n: number) => String(n).padStart(2, "0");

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(now: Date = new Date()): string {
  return toISO(now);
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

export function isISODate(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  return toISO(parseISO(v)) === v;
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

/** Differenza in giorni di calendario (b - a). */
export function diffDays(a: string, b: string): number {
  const da = parseISO(a);
  const db = parseISO(b);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

/** Lunedì della settimana che contiene `iso`. */
export function weekStart(iso: string): string {
  const d = parseISO(iso);
  const dow = (d.getDay() + 6) % 7; // lunedì = 0
  d.setDate(d.getDate() - dow);
  return toISO(d);
}

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

export function formatDateIT(iso: string): string {
  const d = parseISO(iso);
  return `${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}`;
}

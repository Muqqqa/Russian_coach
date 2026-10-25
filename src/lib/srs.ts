// Ripetizione dilazionata (Leitner a 5 box). Intervalli in giorni: box 1..5 = 1/2/4/8/16.
import { addDays, diffDays } from "./dates";
import type { UserState } from "./contract";

export type SrsEntry = UserState["srs"][string];
export type Box = SrsEntry["box"];

export const BOX_INTERVALS: Record<Box, number> = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 };

export function intervalFor(box: Box): number {
  return BOX_INTERVALS[box];
}

/**
 * Aggiorna la scheda di una parola dopo una risposta.
 * - parola nuova: parte dal box 1; se corretta passa subito al box 2
 * - corretta: sale di un box (max 5); prossima scadenza = oggi + intervallo del nuovo box
 * - sbagliata: torna al box 1, da rivedere domani
 */
export function reviewEntry(entry: SrsEntry | undefined, correct: boolean, today: string): SrsEntry {
  const current: Box = entry?.box ?? 1;
  const box: Box = correct ? (Math.min(5, entry ? current + 1 : 2) as Box) : 1;
  return { box, due: addDays(today, BOX_INTERVALS[box]) };
}

export function isDue(entry: SrsEntry, today: string): boolean {
  return entry.due <= today;
}

/** Giorni di ritardo (>= 0) di una scheda scaduta; 0 se non scaduta. */
export function overdueDays(entry: SrsEntry, today: string): number {
  return Math.max(0, diffDays(entry.due, today));
}

/** Id delle parole da ripassare oggi, le più in ritardo (e di box più basso) per prime. */
export function dueWords(srs: UserState["srs"], today: string): string[] {
  return Object.entries(srs)
    .filter(([, e]) => isDue(e, today))
    .sort((a, b) => overdueDays(b[1], today) - overdueDays(a[1], today) || a[1].box - b[1].box || a[0].localeCompare(b[0]))
    .map(([id]) => id);
}

export function boxDistribution(srs: UserState["srs"]): Record<Box, number> {
  const out: Record<Box, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const e of Object.values(srs)) out[e.box]++;
  return out;
}

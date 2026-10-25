// Transizioni dello stato utente (funzioni pure, restituiscono un nuovo stato).
import type { Exercise, UserState } from "./contract";
import { addDays, diffDays } from "./dates";
import { reviewEntry } from "./srs";
import { addWeeklyProgress } from "./goals";

/** Etichette generiche che non indicano un argomento grammaticale: non entrano negli errori ricorrenti. */
export const GENERIC_TAGS = new Set(["lessico", "frasi"]);

function bump(map: Record<string, number>, key: string, correct: boolean): Record<string, number> {
  const next = { ...map };
  const cur = next[key] ?? 0;
  if (correct) {
    // una risposta corretta "scala" l'errore di uno: gli errori ricorrenti si esauriscono se si impara
    if (cur <= 1) delete next[key];
    else next[key] = cur - 1;
  } else {
    next[key] = cur + 1;
  }
  return next;
}

/** Registra l'esito di un esercizio: SRS delle parole allenate ed errori ricorrenti. */
export function applyAnswer(state: UserState, ex: Pick<Exercise, "words" | "grammar_tags">, correct: boolean, today: string): UserState {
  const srs = { ...state.srs };
  let words = state.errors.words;
  for (const id of ex.words) {
    srs[id] = reviewEntry(srs[id], correct, today);
    words = bump(words, id, correct);
  }
  let tags = state.errors.grammar_tags;
  for (const t of ex.grammar_tags) {
    if (GENERIC_TAGS.has(t)) continue;
    tags = bump(tags, t, correct);
  }
  return { ...state, srs, errors: { grammar_tags: tags, words } };
}

/** Streak: +1 se l'ultimo giorno era ieri, invariato se oggi, altrimenti riparte da 1. */
export function updateStreak(streak: UserState["streak"], today: string): UserState["streak"] {
  if (streak.lastDay === today) return streak;
  const current = streak.lastDay && diffDays(streak.lastDay, today) === 1 ? streak.current + 1 : 1;
  return { current, best: Math.max(streak.best, current), lastDay: today };
}

/** Streak da mostrare oggi: se ieri è stato saltato, è già spezzato. */
export function displayStreak(streak: UserState["streak"], today: string): number {
  if (!streak.lastDay) return 0;
  const gap = diffDays(streak.lastDay, today);
  return gap <= 1 ? streak.current : 0;
}

/** Vero se oggi non ha ancora una lezione completata. */
export function streakAtRisk(streak: UserState["streak"], today: string): boolean {
  return streak.lastDay !== today && streak.lastDay === addDays(today, -1) && streak.current > 0;
}

export interface SessionOutcome {
  today: string;
  seconds: number;
  correct: number;
  answered: number;
  lessonId?: string;
}

/** Chiude una lezione: streak, progressi settimanali, lezione del curriculum superata (>= 70%). */
export function completeSession(state: UserState, o: SessionOutcome): UserState {
  const ratio = o.answered > 0 ? o.correct / o.answered : 0;
  const completedLessons =
    o.lessonId && ratio >= 0.7 && !state.completedLessons.includes(o.lessonId) ? [...state.completedLessons, o.lessonId] : state.completedLessons;
  let next: UserState = { ...state, streak: updateStreak(state.streak, o.today), completedLessons };
  next = addWeeklyProgress(next, o.today, o.seconds / 60, 1);
  return next;
}

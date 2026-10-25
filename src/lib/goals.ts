// Obiettivo finale (livello + data) e mini obiettivi settimanali derivati.
import type { Level, UserState } from "./contract";
import { diffDays, weekStart } from "./dates";
import { LEVELS, levelIndex } from "./levels";

/**
 * Ore di studio indicative per passare al livello successivo. Sono ordini di grandezza, non promesse.
 * Revisione del supervisor: i valori precedenti (70/110/160/220, cumulati 70/180/340/560) erano
 * al limite basso delle ore "guidate" usate di solito per lingue europee più facili
 * (circa 90-100 per A1, 180-200 per A2, 350-400 per B1, 500-600 per B2). Il russo, per un italofono,
 * richiede di più (nuovo alfabeto, casi, aspetto verbale). I nuovi valori (100/140/200/270, cumulati
 * 100/240/440/710) restano una stima, da rivedere con i dati d'uso reali.
 */
export const HOURS_TO_NEXT: Record<Level, number> = { zero: 100, a1: 140, a2: 200, b1: 270, b2: 0 };

export const MIN_WEEKLY_MINUTES = 30;
export const MAX_WEEKLY_MINUTES = 420; // 1 ora al giorno
/** Massimo di lezioni a settimana nel piano (3 al giorno): oltre non è realistico. */
export const MAX_WEEKLY_LESSONS = 21;

export interface WeeklyPlan {
  minutesTarget: number;
  lessonsTarget: number;
  weeksLeft: number;
  /** Minuti a settimana necessari per arrivare in tempo (prima dei limiti). */
  requiredMinutes: number;
  /** Minuti al giorno (su 7 giorni) per raggiungere il target settimanale. */
  minutesPerDay: number;
  /** Falso se servirebbero più di MAX_WEEKLY_MINUTES a settimana. */
  feasible: boolean;
  /** Vero se l'obiettivo è già raggiunto (o è un mantenimento). */
  maintenance: boolean;
  totalHours: number;
}

export function totalHoursBetween(from: Level, to: Level): number {
  let h = 0;
  for (let i = levelIndex(from); i < levelIndex(to); i++) h += HOURS_TO_NEXT[LEVELS[i]];
  return h;
}

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

/** Lezioni a settimana coerenti con i minuti (le lezioni durano `dailyMinutes`), almeno 1. */
const lessonsFor = (minutes: number, dailyMinutes: number) => Math.min(MAX_WEEKLY_LESSONS, Math.max(1, Math.ceil(minutes / dailyMinutes)));

/**
 * Deriva l'obiettivo settimanale: minuti e numero di lezioni.
 * - settimane rimanenti = ceil(giorni / 7), almeno 1
 * - minuti necessari = ore totali per i salti di livello / settimane
 * - minuti arrotondati a 5, limitati a [MIN, MAX]; lezioni = ceil(minuti / minuti per lezione), max 21
 *   (prima il tetto era 7, ma 7 lezioni da 15 minuti non bastano a fare 255 minuti: i due obiettivi erano incoerenti)
 */
export function deriveWeeklyPlan(input: { currentLevel: Level; goal: { targetLevel: Level; targetDate: string } | undefined; today: string; dailyMinutes: 15 | 30 | 45 }): WeeklyPlan {
  const { currentLevel, goal, today, dailyMinutes } = input;
  const base = (minutes: number, extra: Partial<WeeklyPlan> = {}): WeeklyPlan => ({
    minutesTarget: minutes,
    lessonsTarget: lessonsFor(minutes, dailyMinutes),
    minutesPerDay: Math.ceil(minutes / 7),
    weeksLeft: 0,
    requiredMinutes: minutes,
    feasible: true,
    maintenance: true,
    totalHours: 0,
    ...extra,
  });
  // Senza obiettivo, o già raggiunto: mantenimento = 5 lezioni a settimana.
  if (!goal || levelIndex(goal.targetLevel) <= levelIndex(currentLevel)) {
    return base(dailyMinutes * 5);
  }
  const days = diffDays(today, goal.targetDate);
  const weeksLeft = Math.max(1, Math.ceil(days / 7));
  const totalHours = totalHoursBetween(currentLevel, goal.targetLevel);
  const requiredMinutes = (totalHours * 60) / weeksLeft;
  const minutesTarget = Math.min(MAX_WEEKLY_MINUTES, Math.max(MIN_WEEKLY_MINUTES, roundTo(requiredMinutes, 5)));
  return {
    ...base(minutesTarget),
    weeksLeft,
    requiredMinutes: Math.round(requiredMinutes),
    feasible: days > 0 && requiredMinutes <= MAX_WEEKLY_MINUTES,
    maintenance: false,
    totalHours,
  };
}

type Week = UserState["weeklyGoals"][number];

/** Garantisce una riga per la settimana corrente, con i target derivati dall'obiettivo attuale. */
export function ensureCurrentWeek(state: UserState, today: string): UserState {
  const ws = weekStart(today);
  const plan = deriveWeeklyPlan({ currentLevel: state.level, goal: state.goal, today, dailyMinutes: state.settings.dailyMinutes });
  const idx = state.weeklyGoals.findIndex((w) => w.weekStart === ws);
  if (idx === -1) {
    const week: Week = { weekStart: ws, minutesTarget: plan.minutesTarget, minutesDone: 0, lessonsTarget: plan.lessonsTarget, lessonsDone: 0 };
    return { ...state, weeklyGoals: [...state.weeklyGoals, week].sort((a, b) => a.weekStart.localeCompare(b.weekStart)) };
  }
  const cur = state.weeklyGoals[idx];
  if (cur.minutesTarget === plan.minutesTarget && cur.lessonsTarget === plan.lessonsTarget) return state;
  const weeklyGoals = state.weeklyGoals.slice();
  weeklyGoals[idx] = { ...cur, minutesTarget: plan.minutesTarget, lessonsTarget: plan.lessonsTarget };
  return { ...state, weeklyGoals };
}

export function currentWeek(state: UserState, today: string): Week | undefined {
  const ws = weekStart(today);
  return state.weeklyGoals.find((w) => w.weekStart === ws);
}

export function addWeeklyProgress(state: UserState, today: string, minutes: number, lessons: number): UserState {
  const ensured = ensureCurrentWeek(state, today);
  const ws = weekStart(today);
  return {
    ...ensured,
    weeklyGoals: ensured.weeklyGoals.map((w) =>
      w.weekStart === ws ? { ...w, minutesDone: Math.round((w.minutesDone + minutes) * 10) / 10, lessonsDone: w.lessonsDone + lessons } : w,
    ),
  };
}

export function weekProgress(w: Week | undefined): { minutesPct: number; lessonsPct: number; done: boolean } {
  if (!w) return { minutesPct: 0, lessonsPct: 0, done: false };
  const m = w.minutesTarget > 0 ? Math.min(1, w.minutesDone / w.minutesTarget) : 0;
  const l = w.lessonsTarget > 0 ? Math.min(1, w.lessonsDone / w.lessonsTarget) : 0;
  return { minutesPct: Math.round(m * 100), lessonsPct: Math.round(l * 100), done: m >= 1 && l >= 1 };
}

// Selezione algoritmica della lezione del giorno. Nessuna AI: punteggi su
//  (1) errori ricorrenti (grammar_tags e parole),
//  (2) SRS Leitner (parole in scadenza),
//  (3) tempo disponibile (15/30/45 min, somma di est_seconds) con materiale nuovo mescolato.
import type { Exercise, Lesson, Level, UserState } from "./contract";
import type { Bank } from "./bank";
import { diffDays } from "./dates";
import { levelIndex, LEVELS } from "./levels";
import { seededRng, type Rng } from "./rng";
import { GENERIC_TAGS } from "./progress";

export type Category = "errori" | "ripasso" | "nuovo" | "mix";

export interface LessonPlan {
  exercises: Exercise[];
  categories: Record<string, Category>;
  totalSeconds: number;
  budgetSeconds: number;
  /** Lezione del curriculum collegata (materiale nuovo), se esiste. */
  curriculumLesson?: Lesson;
  counts: Record<Category, number>;
  newWords: number;
  /** Durata stimata in minuti reali (somma di est_seconds x timeFactor). */
  estimatedMinutes: number;
}

export interface LessonOptions {
  bank: Pick<Bank, "exercises" | "lessons">;
  state: UserState;
  minutes: 15 | 30 | 45;
  today: string;
  /** Seme per la variazione (giorno + progressivo). */
  seed: string;
  /** Includere i dettati (richiede audio e voce russa). */
  allowDictation?: boolean;
  /** Esercizi già proposti oggi: penalizzati. */
  excludeIds?: readonly string[];
  /**
   * Rapporto fra tempo reale e `est_seconds` (>= 1). Il budget in secondi stimati diventa minuti*60/timeFactor,
   * così una lezione "da 15 minuti" dura davvero circa 15 minuti. Default 1 (stime prese alla lettera).
   */
  timeFactor?: number;
}

/** Fattore prudente per chi non ha ancora una cronologia: scrivere in cirillico e leggere il feedback costa più di est_seconds. */
export const DEFAULT_TIME_FACTOR = 1.4;
/** Media di est_seconds degli esercizi scelti nelle lezioni (misurata sul banco curato): base per la calibrazione. */
export const AVG_EST_SECONDS = 16;
/** Risposte minime registrate prima di fidarsi dei tempi reali dell'utente. */
export const CALIBRATION_MIN_ANSWERS = 40;

/** Fattore tempo calibrato sui tempi reali dell'utente (cronologia degli ultimi giorni), limitato a [1, 3]. */
export function calibratedTimeFactor(history: Record<string, { seconds: number; answered: number }>, today: string, days = 14): number {
  let seconds = 0;
  let answered = 0;
  for (const [d, h] of Object.entries(history)) {
    const gap = diffDays(d, today);
    if (gap < 0 || gap >= days) continue;
    seconds += h.seconds;
    answered += h.answered;
  }
  if (answered < CALIBRATION_MIN_ANSWERS) return DEFAULT_TIME_FACTOR;
  return Math.min(3, Math.max(1, seconds / answered / AVG_EST_SECONDS));
}

const LEVEL_BASE_DIFF: Record<Level, number> = { zero: 1, a1: 2, a2: 3, b1: 4, b2: 5 };
export const REVIEW_SHARE = 0.55;
export const NEW_SHARE_END = 0.9;
/** Parole mai viste introdotte al massimo per lezione: 6 / 12 / 18. */
export const maxNewWords = (minutes: number) => Math.round((minutes / 15) * 6);

/** Prossima lezione del curriculum non completata, al livello dell'utente (o il primo livello successivo con lezioni). */
export function nextCurriculumLesson(lessons: readonly Lesson[], state: UserState): Lesson | undefined {
  const done = new Set(state.completedLessons);
  const from = levelIndex(state.level);
  for (let i = from; i < LEVELS.length; i++) {
    const l = lessons.find((x) => x.level === LEVELS[i] && !done.has(x.id));
    if (l) return l;
  }
  return undefined;
}

interface Scored {
  ex: Exercise;
  due: number;
  err: number;
  fresh: number; // frazione di parole mai viste
  unseen: string[];
  lessonLink: boolean;
}

const cap = (n: number, max: number) => Math.min(n, max);

function score(ex: Exercise, o: LessonOptions, curId: string | undefined): Scored {
  const { state, today } = o;
  let due = 0;
  const unseen: string[] = [];
  let errW = 0;
  for (const w of ex.words) {
    const e = state.srs[w];
    if (!e) {
      if (!state.errors.words[w]) unseen.push(w);
    } else if (e.due <= today) {
      due += 3 + cap(diffDays(e.due, today), 10) * 0.3 + (5 - e.box) * 0.5;
    }
    errW += cap(state.errors.words[w] ?? 0, 5) * 1.5;
  }
  let errT = 0;
  for (const t of ex.grammar_tags) if (!GENERIC_TAGS.has(t)) errT += cap(state.errors.grammar_tags[t] ?? 0, 5) * 1.2;
  const n = Math.max(1, ex.words.length);
  const norm = Math.sqrt(n);
  return {
    ex,
    due: due / norm,
    err: (errW + errT) / norm,
    fresh: unseen.length / n,
    unseen,
    lessonLink: !!curId && ex.lesson === curId,
  };
}

export function buildLesson(o: LessonOptions): LessonPlan {
  const rng: Rng = seededRng(o.seed);
  const { state, minutes } = o;
  const factor = Math.max(1, o.timeFactor ?? 1);
  const budget = (minutes * 60) / factor;
  const userIdx = levelIndex(state.level);
  const used = new Set(o.excludeIds ?? []);
  const curriculumLesson = nextCurriculumLesson(o.bank.lessons, state);
  const curId = curriculumLesson?.id;

  // Pool: livelli fino a quello dell'utente. Se vuoto (livello senza esercizi) si prende il più vicino.
  let pool = o.bank.exercises.filter((e) => levelIndex(e.level) <= userIdx && (o.allowDictation || e.type !== "dictation"));
  if (pool.length === 0) {
    const all = o.bank.exercises.filter((e) => o.allowDictation || e.type !== "dictation");
    const minIdx = Math.min(...all.map((e) => levelIndex(e.level)));
    pool = all.filter((e) => levelIndex(e.level) === minIdx);
  }
  const scored = pool.map((e) => score(e, o, curId));

  const typeCount: Record<string, number> = {};
  const wordCount: Record<string, number> = {};
  const newSeen = new Set<string>();
  const chosen: { s: Scored; cat: Category }[] = [];
  const chosenIds = new Set<string>();
  let total = 0;
  const base = LEVEL_BASE_DIFF[state.level];
  const newCap = maxNewWords(minutes);

  const adjusted = (s: Scored, primary: (s: Scored) => number): number => {
    let v = primary(s);
    v += rng() * 0.6; // variazione
    v -= (typeCount[s.ex.type] ?? 0) * 0.5; // varietà di tipi
    for (const w of s.ex.words) v -= (wordCount[w] ?? 0) * 1.5; // non martellare la stessa parola
    if (used.has(s.ex.id)) v -= 4;
    if (s.fresh > 0) {
      // prima esposizione: riconoscimento, non produzione
      if (s.ex.type === "dictation" || s.ex.type === "cloze" || (s.ex.type === "translate" && s.ex.payload.type === "translate" && s.ex.payload.direction === "it_ru")) v -= 1.5;
      v -= Math.max(0, s.ex.difficulty - (base + 1)) * 0.4;
    }
    return v;
  };

  const phase = (limit: number, newLimit: number, eligible: (s: Scored) => boolean, primary: (s: Scored) => number, cat: (s: Scored) => Category) => {
    const rest = scored.filter((s) => !chosenIds.has(s.ex.id) && eligible(s));
    while (total < limit) {
      let best: Scored | undefined;
      let bestV = -Infinity;
      for (const s of rest) {
        if (chosenIds.has(s.ex.id)) continue;
        if (total + s.ex.est_seconds > Math.max(limit, 0) * 1.0 + (limit >= budget ? budget * 0.08 : 0)) continue;
        const addsNew = s.unseen.filter((w) => !newSeen.has(w)).length;
        if (addsNew > 0 && newSeen.size + addsNew > newLimit) continue;
        const v = adjusted(s, primary);
        if (v > bestV) {
          bestV = v;
          best = s;
        }
      }
      if (!best) break;
      chosen.push({ s: best, cat: cat(best) });
      chosenIds.add(best.ex.id);
      total += best.ex.est_seconds;
      typeCount[best.ex.type] = (typeCount[best.ex.type] ?? 0) + 1;
      for (const w of best.ex.words) wordCount[w] = (wordCount[w] ?? 0) + 1;
      for (const w of best.unseen) newSeen.add(w);
    }
  };

  // Fase A: errori ricorrenti e parole in scadenza
  phase(budget * REVIEW_SHARE, newCap, (s) => s.due + s.err > 0, (s) => s.err * 1.2 + s.due, (s) => (s.err >= s.due && s.err > 0 ? "errori" : "ripasso"));
  // Fase B: materiale nuovo (lezione del curriculum, parole mai viste, livello dell'utente)
  phase(
    budget * NEW_SHARE_END,
    newCap,
    (s) => s.fresh > 0 || s.lessonLink,
    (s) => s.fresh * 2 + (s.lessonLink ? 3 : 0) + (s.ex.level === state.level ? 1 : 0) - Math.abs(s.ex.difficulty - (base + 0.5)) * 0.3,
    () => "nuovo",
  );
  // Fase C: completa il tempo con il resto (ripasso leggero di ciò che è già noto, poi altro)
  // (se mancano esercizi su parole già note, il limite di parole nuove si allarga fino a 3 volte pur di riempire il tempo)
  phase(
    budget,
    newCap * 3,
    () => true,
    (s) => s.due + s.err + s.fresh + (state.srs[s.ex.words[0]] ? 0.5 : 0),
    (s) => (s.fresh > 0 ? "nuovo" : "mix"),
  );

  // Ordine: salita graduale di difficoltà con un po' di casualità
  const ordered = chosen
    .map((c) => ({ c, k: c.s.ex.difficulty + rng() * 1.2 }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.c);

  const counts: Record<Category, number> = { errori: 0, ripasso: 0, nuovo: 0, mix: 0 };
  const categories: Record<string, Category> = {};
  for (const { s, cat } of ordered) {
    counts[cat]++;
    categories[s.ex.id] = cat;
  }
  return {
    exercises: ordered.map((x) => x.s.ex),
    categories,
    totalSeconds: total,
    budgetSeconds: budget,
    estimatedMinutes: (total * factor) / 60,
    curriculumLesson: curId ? curriculumLesson : undefined,
    counts,
    newWords: newSeen.size,
  };
}

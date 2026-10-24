// Test d'ingresso adattivo (10-15 domande). Scala a gradini sul livello:
// risposta corretta -> si sale di mezzo livello, sbagliata -> si scende di 0,7 (stima prudente).
import type { Exercise, Level } from "./contract";
import { LEVELS, levelIndex } from "./levels";
import type { Rng } from "./rng";

export const MIN_QUESTIONS = 10;
export const MAX_QUESTIONS = 15;
export const UP_STEP = 0.5;
export const DOWN_STEP = 0.7;
export const PASS_RATIO = 0.7;

export interface PlacementAnswer {
  exerciseId: string;
  level: Level;
  correct: boolean;
  words: string[];
}

export interface PlacementSession {
  /** Livelli per cui esistono domande, in ordine crescente. */
  levels: Level[];
  /** Posizione (frazionaria) nell'array `levels`. */
  position: number;
  answers: PlacementAnswer[];
}

export function createPlacement(levels: readonly Level[]): PlacementSession {
  const sorted = [...new Set(levels)].sort((a, b) => levelIndex(a) - levelIndex(b));
  if (sorted.length === 0) throw new Error("Nessun livello disponibile per il test");
  // si parte da A1 (o dal livello piu' vicino disponibile)
  const start = Math.max(0, sorted.findIndex((l) => l === "a1"));
  return { levels: sorted, position: Math.min(start, sorted.length - 1), answers: [] };
}

export function targetLevel(s: PlacementSession): Level {
  const i = Math.min(s.levels.length - 1, Math.max(0, Math.round(s.position)));
  return s.levels[i];
}

export function recordPlacementAnswer(s: PlacementSession, ex: Pick<Exercise, "id" | "level" | "words">, correct: boolean): PlacementSession {
  const max = s.levels.length - 1;
  const position = Math.min(max, Math.max(0, s.position + (correct ? UP_STEP : -DOWN_STEP)));
  return { ...s, position, answers: [...s.answers, { exerciseId: ex.id, level: ex.level, correct, words: ex.words }] };
}

function converged(s: PlacementSession): boolean {
  const last = s.answers.slice(-4).map((a) => levelIndex(a.level));
  if (last.length < 4) return false;
  return Math.max(...last) - Math.min(...last) <= 1;
}

export function isPlacementFinished(s: PlacementSession): boolean {
  const n = s.answers.length;
  if (n >= MAX_QUESTIONS) return true;
  // con un solo livello disponibile non c'e' nulla da esplorare
  if (n >= MIN_QUESTIONS && (converged(s) || s.levels.length === 1)) return true;
  return false;
}

export interface PlacementResult {
  level: Level;
  /** Percentuale di risposte corrette (0-100). */
  score: number;
  perLevel: { level: Level; asked: number; correct: number }[];
  /** Vero se ha superato il livello piu' alto disponibile ma esistono livelli superiori senza domande. */
  capped: boolean;
}

/** Livello assegnato: il piu' alto superato (almeno 70% con almeno 2 domande); altrimenti Zero. */
export function placementResult(s: PlacementSession): PlacementResult {
  const perLevel = s.levels.map((level) => {
    const a = s.answers.filter((x) => x.level === level);
    return { level, asked: a.length, correct: a.filter((x) => x.correct).length };
  });
  let level: Level = "zero";
  for (const p of perLevel) {
    if (p.level === "zero") continue;
    if (p.asked >= 2 && p.correct / p.asked >= PASS_RATIO) level = p.level;
  }
  const total = s.answers.length;
  const correct = s.answers.filter((a) => a.correct).length;
  const topAvailable = s.levels[s.levels.length - 1];
  return {
    level,
    score: total === 0 ? 0 : Math.round((correct / total) * 100),
    perLevel,
    capped: level === topAvailable && levelIndex(topAvailable) < LEVELS.length - 1 && level !== "zero",
  };
}

const PLACEMENT_TYPES: Exercise["type"][] = ["multiple_choice", "translate", "cloze"];

/** Sceglie la prossima domanda dal banco: livello bersaglio, parole nuove, tipi alternati. */
export function pickPlacementQuestion(s: PlacementSession, pool: readonly Exercise[], rng: Rng): Exercise | undefined {
  const target = targetLevel(s);
  const usedIds = new Set(s.answers.map((a) => a.exerciseId));
  const usedWords = new Set(s.answers.flatMap((a) => a.words));
  const base = pool.filter((e) => PLACEMENT_TYPES.includes(e.type) && !usedIds.has(e.id));
  const attempt = (lvl: Level) => {
    const atLevel = base.filter((e) => e.level === lvl);
    const fresh = atLevel.filter((e) => !e.words.some((w) => usedWords.has(w)));
    return fresh.length > 0 ? fresh : atLevel;
  };
  let cands = attempt(target);
  if (cands.length === 0) {
    // livello esaurito: il piu' vicino disponibile
    const order = [...s.levels].sort((a, b) => Math.abs(levelIndex(a) - levelIndex(target)) - Math.abs(levelIndex(b) - levelIndex(target)));
    for (const l of order) {
      cands = attempt(l);
      if (cands.length) break;
    }
  }
  if (cands.length === 0) return undefined;
  // Ai livelli bassi si preferisce la scelta multipla (non serve la tastiera cirillica).
  const mcShare = levelIndex(target) <= 1 ? 0.7 : 0.4;
  const prevType = s.answers.length ? (pool.find((e) => e.id === s.answers[s.answers.length - 1].exerciseId)?.type) : undefined;
  const wantMc = rng() < mcShare;
  let typed = cands.filter((e) => (e.type === "multiple_choice") === wantMc);
  if (typed.length === 0) typed = cands;
  const varied = typed.filter((e) => e.type !== prevType);
  const from = varied.length > 0 ? varied : typed;
  // difficolta' medio-bassa per il livello: evita i casi piu' difficili all'inizio
  const sorted = from.slice().sort((a, b) => a.difficulty - b.difficulty);
  const window = sorted.slice(0, Math.max(5, Math.ceil(sorted.length * 0.6)));
  return window[Math.floor(rng() * window.length)];
}

// Banco dati in memoria: parole, frasi, lezioni, esercizi (curati + generati).
import type { Exercise, Lesson, Level, Sentence, Word } from "./contract";
import { levelIndex } from "./levels";

export interface Bank {
  words: Word[];
  wordById: Map<string, Word>;
  sentences: Sentence[];
  lessons: Lesson[];
  /** Esercizi utilizzabili: curati (solo approved) e, se servono, generati. */
  exercises: Exercise[];
  exerciseById: Map<string, Exercise>;
  /** Quanti esercizi arrivano dal banco curato. */
  curatedCount: number;
  /** Livelli per cui esiste almeno un esercizio. */
  levelsAvailable: Level[];
}

/** Glossa mostrata all'utente: `it` se presente, altrimenti `en`. */
export function wordGloss(w: Word, max = 2): { text: string; lang: "it" | "en" } {
  const src = w.it && w.it.length > 0 ? w.it : w.en;
  return { text: src.slice(0, max).join(", "), lang: w.it && w.it.length > 0 ? "it" : "en" };
}

export function buildBank(input: {
  words: Word[];
  sentences: Sentence[];
  lessons: Lesson[];
  curated: Exercise[];
  generated: Exercise[];
}): Bank {
  // Solo esercizi approvati arrivano all'utente (difesa in profondita': copy-data filtra gia').
  const curated = input.curated.filter((e) => e.qa_status === "approved");
  const exercises = [...curated, ...input.generated];
  const wordById = new Map(input.words.map((w) => [w.id, w]));
  const levels = new Set<Level>(exercises.map((e) => e.level));
  return {
    words: input.words,
    wordById,
    sentences: input.sentences,
    lessons: [...input.lessons].sort((a, b) => levelIndex(a.level) - levelIndex(b.level) || a.order - b.order),
    exercises,
    exerciseById: new Map(exercises.map((e) => [e.id, e])),
    curatedCount: curated.length,
    levelsAvailable: [...levels].sort((a, b) => levelIndex(a) - levelIndex(b)),
  };
}

/** Sotto questa soglia di esercizi curati approvati, si aggiunge il generatore interno. */
export const CURATED_MIN = 60;

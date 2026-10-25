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
  /** Quanti esercizi generati (non rivisti) sono nel banco: 0 se il banco curato basta. */
  generatedCount: number;
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
    generatedCount: input.generated.length,
    levelsAvailable: [...levels].sort((a, b) => levelIndex(a) - levelIndex(b)),
  };
}

/**
 * Soglia di esercizi curati approvati PER LIVELLO: sotto questa soglia, per quel livello, si aggiunge
 * il generatore interno (esercizi NON rivisti da un umano). Dove il banco curato basta, il generatore
 * non si usa mai: e' solo l'ultimo ripiego.
 */
export const CURATED_MIN = 60;

/** Livelli per cui serve il generatore: hanno parole ma meno di CURATED_MIN esercizi curati approvati. */
export function levelsNeedingGenerator(curated: readonly Exercise[], words: readonly Pick<Word, "level">[], min = CURATED_MIN): Level[] {
  const perLevel = new Map<Level, number>();
  for (const e of curated) if (e.qa_status === "approved") perLevel.set(e.level, (perLevel.get(e.level) ?? 0) + 1);
  const withWords = new Set<Level>(words.map((w) => w.level));
  return [...withWords].filter((l) => (perLevel.get(l) ?? 0) < min).sort((a, b) => levelIndex(a) - levelIndex(b));
}

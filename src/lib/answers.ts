// Correzione delle risposte per i 5 tipi di esercizio.
import type { Exercise } from "./contract";
import { checkAnswer, normalizeAnswer } from "./normalize";

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

export function similarity(a: string, b: string): number {
  const na = normalizeAnswer(a);
  const nb = normalizeAnswer(b);
  const max = Math.max(na.length, nb.length);
  return max === 0 ? 1 : 1 - levenshtein(na, nb) / max;
}

/** Soglia di tolleranza ai refusi per le frasi lunghe (almeno 3 parole). */
export const FUZZY_THRESHOLD = 0.88;

export interface Grade {
  correct: boolean;
  /** Risposta attesa da mostrare nel feedback. */
  expected: string;
  /** Vero se accettata solo per tolleranza ai refusi. */
  approximate?: boolean;
}

export type UserInput = { kind: "text"; value: string } | { kind: "choice"; index: number } | { kind: "match"; mistakes: number };

export function gradeExercise(ex: Exercise, input: UserInput): Grade {
  const p = ex.payload;
  switch (p.type) {
    case "translate": {
      if (input.kind !== "text") return { correct: false, expected: p.answer };
      if (checkAnswer(input.value, p.answer, p.accepted)) return { correct: true, expected: p.answer };
      const sentence = p.direction === "ru_it" && normalizeAnswer(p.answer).split(" ").length >= 3;
      if (sentence && [p.answer, ...p.accepted].some((a) => similarity(input.value, a) >= FUZZY_THRESHOLD)) {
        return { correct: true, expected: p.answer, approximate: true };
      }
      return { correct: false, expected: p.answer };
    }
    case "cloze":
      return { correct: input.kind === "text" && checkAnswer(input.value, p.answer, p.accepted), expected: p.answer };
    case "dictation": {
      const ok = input.kind === "text" && checkAnswer(input.value, p.text, p.accepted);
      return { correct: ok, expected: p.text };
    }
    case "multiple_choice":
      return { correct: input.kind === "choice" && input.index === p.correct, expected: p.options[p.correct] };
    case "match":
      return { correct: input.kind === "match" && input.mistakes === 0, expected: p.pairs.map((x) => `${x.ru} = ${x.it}`).join("; ") };
  }
}

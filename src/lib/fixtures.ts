// Dati di prova per i test (non usati dall'app).
import type { Exercise, Level, UserState } from "./contract";
import { defaultState } from "./state";

export function mc(id: string, level: Level, words: string[], opts: Partial<Exercise> = {}): Exercise {
  return {
    id, type: "multiple_choice", level, difficulty: 1, topics: [], grammar_tags: ["lessico"], words, est_seconds: 15,
    prompt_it: "Scegli", payload: { type: "multiple_choice", question: "q", options: ["a", "b", "c"], correct: 0 }, qa_status: "approved", ...opts,
  };
}

export function stateWith(patch: Partial<UserState>): UserState {
  return { ...defaultState(), ...patch };
}

/** Banco sintetico: `perLevel` esercizi per livello, ognuno su una parola diversa. */
export function syntheticPool(levels: Level[], perLevel = 40, perWord = 1): Exercise[] {
  const out: Exercise[] = [];
  for (const l of levels) {
    for (let i = 0; i < perLevel; i++) {
      for (let k = 0; k < perWord; k++) {
      out.push(mc(k === 0 ? `e_${l}_${i}` : `e_${l}_${i}_${k}`, l, [`w_${l}_${i}`], { difficulty: ((i % 3) + 1) as 1 | 2 | 3, type: i % 3 === 0 ? "translate" : i % 3 === 1 ? "cloze" : "multiple_choice", est_seconds: 12 + ((i + k) % 4) * 4 }));
      }
    }
  }
  return out;
}

import { describe, expect, it } from "vitest";
import { checkAnswer, normalizeAnswer, stripStress } from "./normalize";
import { gradeExercise } from "./answers";
import type { Exercise } from "./contract";

const base = { level: "a1" as const, difficulty: 1 as const, topics: [] as string[], grammar_tags: [] as string[], words: [] as string[], est_seconds: 10, prompt_it: "", qa_status: "approved" as const };

describe("normalizzazione", () => {
  it("ignora maiuscole, spazi e punteggiatura", () => {
    expect(normalizeAnswer("  Привет,   Мир!  ")).toBe("привет мир");
  });
  it("tratta ё come е", () => {
    expect(checkAnswer("елка", "ёлка")).toBe(true);
    expect(checkAnswer("ёлка", "елка")).toBe(true);
  });
  it("l'accento tonico e' facoltativo in entrambe le direzioni", () => {
    expect(stripStress("ма́ма")).toBe("мама");
    expect(checkAnswer("мама", "ма́ма")).toBe(true);
    expect(checkAnswer("ма́ма", "мама")).toBe(true);
  });
  it("accetta le varianti in `accepted`", () => {
    expect(checkAnswer("la mamma", "mamma", ["la mamma"])).toBe(true);
    expect(checkAnswer("papa", "mamma", ["la mamma"])).toBe(false);
  });
  it("una risposta vuota non e' mai corretta", () => {
    expect(checkAnswer("  ", "")).toBe(false);
  });
});

describe("correzione per tipo", () => {
  it("translate", () => {
    const ex = { ...base, id: "e_1", type: "translate", payload: { type: "translate", direction: "ru_it", source: "ма́ма", answer: "mamma", accepted: ["la mamma"] } } as Exercise;
    expect(gradeExercise(ex, { kind: "text", value: "Mamma" }).correct).toBe(true);
    expect(gradeExercise(ex, { kind: "text", value: "la mamma." }).correct).toBe(true);
    expect(gradeExercise(ex, { kind: "text", value: "papà" }).correct).toBe(false);
  });
  it("translate di frase: tollera un refuso ma non una frase diversa", () => {
    const ex = { ...base, id: "e_2", type: "translate", payload: { type: "translate", direction: "ru_it", source: "x", answer: "Non capisco quello che dici", accepted: [] } } as Exercise;
    expect(gradeExercise(ex, { kind: "text", value: "Non capisco quello che dicj" })).toMatchObject({ correct: true, approximate: true });
    expect(gradeExercise(ex, { kind: "text", value: "Mi piace molto il gelato" }).correct).toBe(false);
  });
  it("cloze", () => {
    const ex = { ...base, id: "e_3", type: "cloze", payload: { type: "cloze", text: "Я ___ дома", answer: "живу́", accepted: [] } } as Exercise;
    expect(gradeExercise(ex, { kind: "text", value: "живу" }).correct).toBe(true);
    expect(gradeExercise(ex, { kind: "text", value: "живёт" }).correct).toBe(false);
  });
  it("multiple_choice", () => {
    const ex = { ...base, id: "e_4", type: "multiple_choice", payload: { type: "multiple_choice", question: "q", options: ["a", "b"], correct: 1 } } as Exercise;
    expect(gradeExercise(ex, { kind: "choice", index: 1 })).toMatchObject({ correct: true, expected: "b" });
    expect(gradeExercise(ex, { kind: "choice", index: 0 }).correct).toBe(false);
  });
  it("match: corretto solo senza errori", () => {
    const ex = { ...base, id: "e_5", type: "match", payload: { type: "match", pairs: [{ ru: "а", it: "b" }] } } as Exercise;
    expect(gradeExercise(ex, { kind: "match", mistakes: 0 }).correct).toBe(true);
    expect(gradeExercise(ex, { kind: "match", mistakes: 2 }).correct).toBe(false);
  });
  it("dictation", () => {
    const ex = { ...base, id: "e_6", type: "dictation", payload: { type: "dictation", text: "Я́ не понима́ю.", translation_it: "Non capisco.", accepted: ["Я не понимаю."] } } as Exercise;
    expect(gradeExercise(ex, { kind: "text", value: "я не понимаю" }).correct).toBe(true);
    expect(gradeExercise(ex, { kind: "text", value: "я понимаю" }).correct).toBe(false);
  });
});

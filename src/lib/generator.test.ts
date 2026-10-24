import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { generateExercises, glossParts } from "./generator";
import { buildBank } from "./bank";
import { buildLesson } from "./lesson";
import { gradeExercise } from "./answers";
import { stateWith } from "./fixtures";
import type { Sentence, Word } from "./contract";

const load = <T>(dir: string): T[] => {
  const d = join(__dirname, "..", "..", "data", dir);
  if (!existsSync(d)) return [];
  return readdirSync(d).filter((n) => n.endsWith(".json")).flatMap((n) => JSON.parse(readFileSync(join(d, n), "utf8")) as T[]);
};
const words = load<Word>("words");
const sentences = load<Sentence>("sentences");
const exercises = generateExercises(words, sentences);

describe("generatore interno", () => {
  it("spezza le glosse", () => {
    expect(glossParts(["casa, abitazione (formale)", "tetto"])).toEqual(["casa", "abitazione", "tetto"]);
  });

  it("produce tutti e 5 i tipi dai dati reali", () => {
    if (words.length === 0) return;
    const types = new Set(exercises.map((e) => e.type));
    expect([...types].sort()).toEqual(["cloze", "dictation", "match", "multiple_choice", "translate"]);
  });

  it("id univoci e payload coerenti col tipo", () => {
    expect(new Set(exercises.map((e) => e.id)).size).toBe(exercises.length);
    for (const e of exercises) {
      expect(e.payload.type).toBe(e.type);
      expect(e.est_seconds).toBeGreaterThan(0);
      if (e.payload.type === "multiple_choice") {
        expect(new Set(e.payload.options).size).toBe(e.payload.options.length);
        expect(e.payload.correct).toBeGreaterThanOrEqual(0);
        expect(e.payload.options.length).toBeGreaterThanOrEqual(3);
      }
      if (e.payload.type === "cloze") expect(e.payload.text).toContain("___");
      if (e.payload.type === "match") expect(new Set(e.payload.pairs.map((p) => p.it)).size).toBe(e.payload.pairs.length);
    }
  });

  it("la risposta attesa e' sempre accettata dal correttore", () => {
    for (const e of exercises) {
      const p = e.payload;
      if (p.type === "translate") expect(gradeExercise(e, { kind: "text", value: p.answer }).correct).toBe(true);
      if (p.type === "cloze") expect(gradeExercise(e, { kind: "text", value: p.answer }).correct).toBe(true);
      if (p.type === "dictation") expect(gradeExercise(e, { kind: "text", value: p.text }).correct).toBe(true);
      if (p.type === "multiple_choice") expect(gradeExercise(e, { kind: "choice", index: p.correct }).correct).toBe(true);
    }
  });

  it("le opzioni di una scelta multipla sono tutte nella stessa lingua", () => {
    const itLabels = new Set(words.flatMap((w) => glossParts(w.it ?? [])));
    const enLabels = new Set(words.flatMap((w) => glossParts(w.en)));
    const byId = new Map(words.map((w) => [w.id, w]));
    for (const e of exercises) {
      if (!e.id.startsWith("g_mcw_") || e.payload.type !== "multiple_choice") continue;
      const w = byId.get(e.words[0])!;
      const useIt = !!w.it && w.it.length > 0;
      for (const o of e.payload.options) expect((useIt ? itLabels : enLabels).has(o)).toBe(true);
    }
  });

  it("e' deterministico", () => {
    const again = generateExercises(words, sentences);
    expect(again.slice(0, 50)).toEqual(exercises.slice(0, 50));
  });

  it("una lezione reale si costruisce dal banco generato per un principiante", () => {
    if (words.length === 0) return;
    const bank = buildBank({ words, sentences, lessons: [], curated: [], generated: exercises });
    const plan = buildLesson({ bank, state: stateWith({ level: "zero" }), minutes: 15, today: "2026-10-24", seed: "x" });
    expect(plan.exercises.length).toBeGreaterThan(5);
    expect(plan.exercises.every((e) => e.level === "zero")).toBe(true);
  });
});

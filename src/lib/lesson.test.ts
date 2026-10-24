import { describe, expect, it } from "vitest";
import { buildLesson, maxNewWords, nextCurriculumLesson } from "./lesson";
import { mc, stateWith, syntheticPool } from "./fixtures";
import type { Lesson } from "./contract";

const today = "2026-10-24";
const lessons: Lesson[] = [
  { id: "l_a1_01", level: "a1", order: 1, title_it: "Uno", explanation_md: "x", grammar_tags: ["acc"], new_words: [], review_tags: [] },
  { id: "l_a1_02", level: "a1", order: 2, title_it: "Due", explanation_md: "x", grammar_tags: ["gen"], new_words: [], review_tags: [] },
];

describe("lezione del giorno", () => {
  it("rispetta il tempo: 15/30/45 minuti sommando est_seconds", () => {
    const exercises = syntheticPool(["zero", "a1"], 60, 4);
    const state = stateWith({ level: "a1" });
    for (const minutes of [15, 30, 45] as const) {
      const plan = buildLesson({ bank: { exercises, lessons: [] }, state, minutes, today, seed: "a" });
      const sum = plan.exercises.reduce((n, e) => n + e.est_seconds, 0);
      expect(sum).toBe(plan.totalSeconds);
      expect(sum).toBeLessThanOrEqual(minutes * 60 * 1.08);
      expect(sum).toBeGreaterThanOrEqual(minutes * 60 * 0.85);
    }
  });

  it("piu' tempo, piu' esercizi", () => {
    const exercises = syntheticPool(["zero", "a1"], 80, 4);
    const state = stateWith({ level: "a1" });
    const n = (m: 15 | 30 | 45) => buildLesson({ bank: { exercises, lessons: [] }, state, minutes: m, today, seed: "a" }).exercises.length;
    expect(n(15)).toBeLessThan(n(30));
    expect(n(30)).toBeLessThan(n(45));
  });

  it("mette in lezione le parole in scadenza SRS", () => {
    const exercises = syntheticPool(["a1"], 200);
    const state = stateWith({ level: "a1", srs: { w_a1_7: { box: 1, due: "2026-10-20" }, w_a1_9: { box: 2, due: "2026-10-23" }, w_a1_11: { box: 3, due: "2027-01-01" } } });
    const plan = buildLesson({ bank: { exercises, lessons: [] }, state, minutes: 15, today, seed: "a" });
    const ids = plan.exercises.map((e) => e.id);
    expect(ids).toContain("e_a1_7");
    expect(ids).toContain("e_a1_9");
    expect(plan.categories["e_a1_11"]).not.toBe("ripasso"); // non ancora in scadenza
    expect(plan.categories["e_a1_7"]).toBe("ripasso");
  });

  it("da' priorita' agli errori ricorrenti (parole e grammatica)", () => {
    const exercises = [
      ...syntheticPool(["a1"], 60),
      mc("e_g_1", "a1", ["w_x1"], { grammar_tags: ["genitivo"] }),
      mc("e_g_2", "a1", ["w_x2"], { grammar_tags: ["genitivo"] }),
      mc("e_g_3", "a1", ["w_x3"], { grammar_tags: ["dativo"] }),
    ];
    const state = stateWith({
      level: "a1",
      srs: { w_x1: { box: 3, due: "2027-01-01" }, w_x2: { box: 3, due: "2027-01-01" }, w_x3: { box: 3, due: "2027-01-01" }, w_a1_5: { box: 3, due: "2027-01-01" } },
      errors: { grammar_tags: { genitivo: 4 }, words: { w_a1_5: 3 } },
    });
    const plan = buildLesson({ bank: { exercises, lessons: [] }, state, minutes: 15, today, seed: "a" });
    const ids = plan.exercises.map((e) => e.id);
    expect(ids).toContain("e_g_1");
    expect(ids).toContain("e_g_2");
    expect(ids).toContain("e_a1_5");
    expect(plan.categories["e_g_1"]).toBe("errori");
    expect(plan.counts.errori).toBeGreaterThanOrEqual(3);
  });

  it("ignora i tag generici (lessico/frasi) negli errori ricorrenti", () => {
    const exercises = syntheticPool(["a1"], 40);
    const state = stateWith({ level: "a1", errors: { grammar_tags: { lessico: 50 }, words: {} } });
    const plan = buildLesson({ bank: { exercises, lessons: [] }, state, minutes: 15, today, seed: "a" });
    expect(plan.counts.errori).toBe(0);
  });

  it("mescola materiale nuovo e limita le parole nuove per lezione", () => {
    const exercises = syntheticPool(["a1"], 80, 4);
    const state = stateWith({ level: "a1" });
    const plan = buildLesson({ bank: { exercises, lessons: [] }, state, minutes: 15, today, seed: "a" });
    expect(plan.counts.nuovo).toBeGreaterThan(0);
    expect(plan.newWords).toBeLessThanOrEqual(maxNewWords(15) * 3);
    expect(plan.exercises.length / plan.newWords).toBeGreaterThan(1.5); // piu' esercizi per parola nuova, non una sola volta
    expect(maxNewWords(15)).toBe(6);
    expect(maxNewWords(45)).toBe(18);
  });

  it("non propone livelli superiori a quello dell'utente", () => {
    const exercises = syntheticPool(["zero", "a1", "a2", "b1"], 30);
    const plan = buildLesson({ bank: { exercises, lessons: [] }, state: stateWith({ level: "a1" }), minutes: 30, today, seed: "a" });
    expect(plan.exercises.every((e) => e.level === "zero" || e.level === "a1")).toBe(true);
  });

  it("esclude i dettati se la voce non c'e'", () => {
    const exercises = [...syntheticPool(["a1"], 30), mc("e_dict", "a1", ["w_d"], { type: "dictation", payload: { type: "dictation", text: "x", translation_it: "y", accepted: [] } })];
    const without = buildLesson({ bank: { exercises, lessons: [] }, state: stateWith({ level: "a1" }), minutes: 45, today, seed: "a" });
    expect(without.exercises.some((e) => e.type === "dictation")).toBe(false);
  });

  it("e' deterministica a parita' di seme e varia con un seme diverso", () => {
    const exercises = syntheticPool(["a1"], 80);
    const state = stateWith({ level: "a1" });
    const ids = (seed: string) => buildLesson({ bank: { exercises, lessons: [] }, state, minutes: 15, today, seed }).exercises.map((e) => e.id);
    expect(ids("s1")).toEqual(ids("s1"));
    expect(ids("s1")).not.toEqual(ids("s2"));
  });

  it("collega la prossima lezione del curriculum e ne privilegia gli esercizi", () => {
    const exercises = [...syntheticPool(["a1"], 60), mc("e_l2_a", "a1", ["w_n1"], { lesson: "l_a1_02" }), mc("e_l2_b", "a1", ["w_n2"], { lesson: "l_a1_02" })];
    const state = stateWith({ level: "a1", completedLessons: ["l_a1_01"] });
    expect(nextCurriculumLesson(lessons, state)?.id).toBe("l_a1_02");
    const plan = buildLesson({ bank: { exercises, lessons }, state, minutes: 15, today, seed: "a" });
    expect(plan.curriculumLesson?.id).toBe("l_a1_02");
    expect(plan.exercises.map((e) => e.id)).toEqual(expect.arrayContaining(["e_l2_a", "e_l2_b"]));
  });

  it("evita di ripetere gli esercizi gia' proposti oggi", () => {
    const exercises = syntheticPool(["a1"], 80);
    const state = stateWith({ level: "a1" });
    const first = buildLesson({ bank: { exercises, lessons: [] }, state, minutes: 15, today, seed: "a" });
    const second = buildLesson({ bank: { exercises, lessons: [] }, state, minutes: 15, today, seed: "b", excludeIds: first.exercises.map((e) => e.id) });
    const overlap = second.exercises.filter((e) => first.exercises.some((f) => f.id === e.id));
    expect(overlap.length).toBeLessThanOrEqual(1);
  });

  it("con un banco vuoto non va in errore", () => {
    const plan = buildLesson({ bank: { exercises: [], lessons: [] }, state: stateWith({ level: "zero" }), minutes: 15, today, seed: "a" });
    expect(plan.exercises).toEqual([]);
  });
});

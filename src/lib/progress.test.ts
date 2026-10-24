import { describe, expect, it } from "vitest";
import { applyAnswer, completeSession, displayStreak, streakAtRisk, updateStreak } from "./progress";
import { stateWith } from "./fixtures";

describe("streak", () => {
  it("parte da 1 alla prima lezione", () => {
    expect(updateStreak({ current: 0, best: 0, lastDay: "" }, "2026-10-24")).toEqual({ current: 1, best: 1, lastDay: "2026-10-24" });
  });
  it("lo stesso giorno non incrementa", () => {
    const s = { current: 3, best: 5, lastDay: "2026-10-24" };
    expect(updateStreak(s, "2026-10-24")).toBe(s);
  });
  it("giorni consecutivi incrementano e aggiornano il record", () => {
    expect(updateStreak({ current: 5, best: 5, lastDay: "2026-10-23" }, "2026-10-24")).toEqual({ current: 6, best: 6, lastDay: "2026-10-24" });
    expect(updateStreak({ current: 2, best: 9, lastDay: "2026-10-31" }, "2026-11-01")).toEqual({ current: 3, best: 9, lastDay: "2026-11-01" });
  });
  it("un giorno saltato riparte da 1 conservando il record", () => {
    expect(updateStreak({ current: 7, best: 7, lastDay: "2026-10-22" }, "2026-10-24")).toEqual({ current: 1, best: 7, lastDay: "2026-10-24" });
  });
  it("displayStreak azzera uno streak spezzato", () => {
    expect(displayStreak({ current: 4, best: 4, lastDay: "2026-10-23" }, "2026-10-24")).toBe(4);
    expect(displayStreak({ current: 4, best: 4, lastDay: "2026-10-22" }, "2026-10-24")).toBe(0);
    expect(displayStreak({ current: 0, best: 0, lastDay: "" }, "2026-10-24")).toBe(0);
  });
  it("streakAtRisk: ieri si', oggi gia' fatto no", () => {
    expect(streakAtRisk({ current: 4, best: 4, lastDay: "2026-10-23" }, "2026-10-24")).toBe(true);
    expect(streakAtRisk({ current: 4, best: 4, lastDay: "2026-10-24" }, "2026-10-24")).toBe(false);
  });
});

describe("registrazione risposte", () => {
  const ex = { words: ["w_a", "w_b"], grammar_tags: ["genitivo", "lessico"] };
  it("risposta sbagliata: SRS box 1, errori +1 (tag generici esclusi)", () => {
    const s = applyAnswer(stateWith({}), ex, false, "2026-10-24");
    expect(s.srs.w_a).toEqual({ box: 1, due: "2026-10-25" });
    expect(s.errors.words).toEqual({ w_a: 1, w_b: 1 });
    expect(s.errors.grammar_tags).toEqual({ genitivo: 1 });
  });
  it("risposte corrette fanno scendere gli errori fino a sparire", () => {
    let s = stateWith({ errors: { grammar_tags: { genitivo: 2 }, words: { w_a: 2 } } });
    s = applyAnswer(s, ex, true, "2026-10-24");
    expect(s.errors.words).toEqual({ w_a: 1 });
    s = applyAnswer(s, ex, true, "2026-10-24");
    expect(s.errors.words).toEqual({});
    expect(s.errors.grammar_tags).toEqual({});
  });
  it("non muta lo stato precedente", () => {
    const before = stateWith({});
    applyAnswer(before, ex, false, "2026-10-24");
    expect(before.srs).toEqual({});
  });
});

describe("fine lezione", () => {
  it("aggiorna streak, progressi settimanali e lezione del curriculum (>=70%)", () => {
    const s = completeSession(stateWith({}), { today: "2026-10-24", seconds: 600, correct: 8, answered: 10, lessonId: "l_zero_01" });
    expect(s.streak.current).toBe(1);
    expect(s.completedLessons).toEqual(["l_zero_01"]);
    expect(s.weeklyGoals[0]).toMatchObject({ minutesDone: 10, lessonsDone: 1 });
  });
  it("sotto il 70% la lezione del curriculum non risulta completata", () => {
    const s = completeSession(stateWith({}), { today: "2026-10-24", seconds: 60, correct: 3, answered: 10, lessonId: "l_zero_01" });
    expect(s.completedLessons).toEqual([]);
  });
});

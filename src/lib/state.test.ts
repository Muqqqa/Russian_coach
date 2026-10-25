import { describe, expect, it } from "vitest";
import { defaultExtra, defaultState, exportState, importState, isValidActive, validateState } from "./state";
import { SCHEMA_VERSION } from "./contract";

describe("stato utente", () => {
  it("lo stato iniziale e' valido", () => {
    expect(validateState(defaultState()).ok).toBe(true);
  });

  it("export e import fanno il giro completo", () => {
    const st = defaultState();
    st.level = "a2";
    st.goal = { targetLevel: "b1", targetDate: "2027-06-01" };
    st.srs = { w_mama: { box: 3, due: "2026-11-01" } };
    st.errors = { grammar_tags: { genitivo: 2 }, words: { w_mama: 1 } };
    st.streak = { current: 3, best: 5, lastDay: "2026-10-24" };
    st.weeklyGoals = [{ weekStart: "2026-10-19", minutesTarget: 100, minutesDone: 20, lessonsTarget: 5, lessonsDone: 1 }];
    const extra = defaultExtra();
    extra.history["2026-10-24"] = { seconds: 600, answered: 20, correct: 15, lessons: 1 };
    const r = importState(exportState(st, extra, new Date("2026-10-24T10:00:00Z")));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state).toEqual(st);
      expect(r.history).toEqual(extra.history);
    }
  });

  it("accetta anche un UserState senza involucro", () => {
    expect(importState(JSON.stringify(defaultState())).ok).toBe(true);
  });

  it("rifiuta JSON non valido, versioni future e dati corrotti", () => {
    expect(importState("{non json").ok).toBe(false);
    expect(importState(JSON.stringify({ ...defaultState(), schemaVersion: SCHEMA_VERSION + 1 })).ok).toBe(false);
    expect(importState(JSON.stringify({ ...defaultState(), level: "c2" })).ok).toBe(false);
    expect(importState(JSON.stringify({ ...defaultState(), srs: { w: { box: 9, due: "2026-01-01" } } })).ok).toBe(false);
    expect(importState(JSON.stringify({ ...defaultState(), settings: { dailyMinutes: 20, audioEnabled: true } })).ok).toBe(false);
    expect(importState(JSON.stringify({ app: "altro", state: defaultState() })).ok).toBe(false);
    expect(importState("[]").ok).toBe(false);
  });

  it("restituisce messaggi d'errore leggibili", () => {
    const r = importState(JSON.stringify({ schemaVersion: 1 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThan(0);
  });

  it("scarta una lezione in corso corrotta", () => {
    const ok = { day: "2026-10-25", minutes: 15, n: 1, exerciseIds: ["e_1"], index: 0, results: [{ id: "e_1", correct: true, seconds: 5 }] };
    expect(isValidActive(ok)).toBe(true);
    expect(isValidActive({ ...ok, minutes: 20 })).toBe(false);
    expect(isValidActive({ ...ok, exerciseIds: "e_1" })).toBe(false);
    expect(isValidActive({ ...ok, results: [{ id: 1 }] })).toBe(false);
    expect(isValidActive({ ...ok, index: -1 })).toBe(false);
    expect(isValidActive(null)).toBe(false);
  });
});

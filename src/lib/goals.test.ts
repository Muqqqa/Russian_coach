import { describe, expect, it } from "vitest";
import { MAX_WEEKLY_MINUTES, MIN_WEEKLY_MINUTES, addWeeklyProgress, currentWeek, deriveWeeklyPlan, ensureCurrentWeek, totalHoursBetween, weekProgress } from "./goals";
import { stateWith } from "./fixtures";

describe("obiettivi", () => {
  it("somma le ore dei salti di livello", () => {
    expect(totalHoursBetween("zero", "a1")).toBe(100);
    expect(totalHoursBetween("zero", "a2")).toBe(240);
    expect(totalHoursBetween("zero", "b2")).toBe(710);
    expect(totalHoursBetween("a2", "a2")).toBe(0);
  });

  it("senza obiettivo (o gia' raggiunto) propone il mantenimento: 5 lezioni", () => {
    const p = deriveWeeklyPlan({ currentLevel: "a1", goal: undefined, today: "2026-10-24", dailyMinutes: 30 });
    expect(p).toMatchObject({ minutesTarget: 150, lessonsTarget: 5, maintenance: true });
    const q = deriveWeeklyPlan({ currentLevel: "a2", goal: { targetLevel: "a1", targetDate: "2027-01-01" }, today: "2026-10-24", dailyMinutes: 15 });
    expect(q.maintenance).toBe(true);
  });

  it("deriva minuti e lezioni dalle settimane rimanenti", () => {
    // zero -> a1 = 100 ore = 6000 minuti; 40 settimane => 150 min/sett.
    const p = deriveWeeklyPlan({ currentLevel: "zero", goal: { targetLevel: "a1", targetDate: "2027-07-31" }, today: "2026-10-24", dailyMinutes: 15 });
    expect(p.weeksLeft).toBe(40);
    expect(p.requiredMinutes).toBe(150);
    expect(p.minutesTarget).toBe(150);
    expect(p.lessonsTarget).toBe(10); // 150 / 15: coerente con i minuti
    expect(p.minutesPerDay).toBe(22);
    expect(p.feasible).toBe(true);
    expect(p.maintenance).toBe(false);
  });

  it("con piu' minuti per lezione servono meno lezioni", () => {
    const p = deriveWeeklyPlan({ currentLevel: "zero", goal: { targetLevel: "a1", targetDate: "2027-07-31" }, today: "2026-10-24", dailyMinutes: 45 });
    expect(p.minutesTarget).toBe(150);
    expect(p.lessonsTarget).toBe(4);
  });

  it("segnala un obiettivo non raggiungibile e limita i minuti", () => {
    const p = deriveWeeklyPlan({ currentLevel: "zero", goal: { targetLevel: "b2", targetDate: "2026-12-01" }, today: "2026-10-24", dailyMinutes: 30 });
    expect(p.feasible).toBe(false);
    expect(p.minutesTarget).toBe(MAX_WEEKLY_MINUTES);
    expect(p.lessonsTarget).toBeLessThanOrEqual(21);
    expect(p.lessonsTarget * 30).toBeGreaterThanOrEqual(p.minutesTarget);
  });

  it("lezioni e minuti sono sempre coerenti: lezioni x durata copre i minuti (entro il tetto)", () => {
    for (const dm of [15, 30, 45] as const) {
      const p = deriveWeeklyPlan({ currentLevel: "a1", goal: { targetLevel: "a2", targetDate: "2027-10-24" }, today: "2026-10-24", dailyMinutes: dm });
      expect(p.lessonsTarget * dm).toBeGreaterThanOrEqual(p.minutesTarget);
    }
  });

  it("applica un minimo settimanale per obiettivi molto lontani", () => {
    const p = deriveWeeklyPlan({ currentLevel: "zero", goal: { targetLevel: "a1", targetDate: "2036-01-01" }, today: "2026-10-24", dailyMinutes: 15 });
    expect(p.minutesTarget).toBe(MIN_WEEKLY_MINUTES);
  });

  it("data passata: almeno una settimana, non fattibile", () => {
    const p = deriveWeeklyPlan({ currentLevel: "zero", goal: { targetLevel: "a1", targetDate: "2026-10-01" }, today: "2026-10-24", dailyMinutes: 15 });
    expect(p.weeksLeft).toBe(1);
    expect(p.feasible).toBe(false);
  });

  it("crea la riga della settimana (lunedi') e accumula i progressi", () => {
    let s = stateWith({ goal: { targetLevel: "a1", targetDate: "2027-07-31" } });
    s = ensureCurrentWeek(s, "2026-10-24"); // sabato
    expect(s.weeklyGoals).toHaveLength(1);
    expect(s.weeklyGoals[0].weekStart).toBe("2026-10-19");
    s = addWeeklyProgress(s, "2026-10-24", 14.5, 1);
    s = addWeeklyProgress(s, "2026-10-25", 15, 1); // domenica, stessa settimana
    const w = currentWeek(s, "2026-10-25")!;
    expect(w.minutesDone).toBe(29.5);
    expect(w.lessonsDone).toBe(2);
    expect(s.weeklyGoals).toHaveLength(1);
    s = addWeeklyProgress(s, "2026-10-26", 10, 1); // lunedi' nuovo
    expect(s.weeklyGoals).toHaveLength(2);
  });

  it("cambiando obiettivo i target della settimana corrente si aggiornano, i progressi no", () => {
    let s = stateWith({ goal: { targetLevel: "a1", targetDate: "2027-07-31" } });
    s = addWeeklyProgress(s, "2026-10-24", 20, 1);
    const before = s.weeklyGoals[0].minutesTarget;
    s = ensureCurrentWeek({ ...s, goal: { targetLevel: "a2", targetDate: "2027-07-31" } }, "2026-10-24");
    expect(s.weeklyGoals[0].minutesTarget).toBeGreaterThan(before);
    expect(s.weeklyGoals[0].minutesDone).toBe(20);
  });

  it("weekProgress", () => {
    expect(weekProgress(undefined).done).toBe(false);
    expect(weekProgress({ weekStart: "x", minutesTarget: 100, minutesDone: 50, lessonsTarget: 4, lessonsDone: 4 })).toEqual({ minutesPct: 50, lessonsPct: 100, done: false });
    expect(weekProgress({ weekStart: "x", minutesTarget: 100, minutesDone: 120, lessonsTarget: 4, lessonsDone: 4 }).done).toBe(true);
  });
});

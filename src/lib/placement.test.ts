import { describe, expect, it } from "vitest";
import { MAX_QUESTIONS, MIN_QUESTIONS, createPlacement, isPlacementFinished, pickPlacementQuestion, placementResult, recordPlacementAnswer, targetLevel } from "./placement";
import { LEVELS, levelIndex } from "./levels";
import { seededRng } from "./rng";
import { syntheticPool } from "./fixtures";
import type { Level } from "./contract";

/** Simula un utente che risponde bene ai livelli <= `ability` e male a quelli superiori. */
function simulate(ability: Level, levels: Level[] = [...LEVELS], seed = "t") {
  const pool = syntheticPool(levels, 30);
  const rng = seededRng(seed);
  let s = createPlacement(levels);
  let guard = 0;
  while (!isPlacementFinished(s) && guard++ < 50) {
    const ex = pickPlacementQuestion(s, pool, rng);
    if (!ex) break;
    const correct = levelIndex(ex.level) <= levelIndex(ability);
    s = recordPlacementAnswer(s, ex, correct);
  }
  return { s, result: placementResult(s) };
}

describe("test d'ingresso adattivo", () => {
  it("fa tra 10 e 15 domande", () => {
    for (const lvl of LEVELS) {
      const { s } = simulate(lvl);
      expect(s.answers.length).toBeGreaterThanOrEqual(MIN_QUESTIONS);
      expect(s.answers.length).toBeLessThanOrEqual(MAX_QUESTIONS);
    }
  });

  it("assegna il livello giusto a un utente coerente", () => {
    for (const lvl of ["a1", "a2", "b1", "b2"] as Level[]) {
      expect(simulate(lvl).result.level).toBe(lvl);
    }
  });

  it("assegna Zero a chi sbaglia tutto", () => {
    const pool = syntheticPool([...LEVELS], 30);
    const rng = seededRng("z");
    let s = createPlacement(LEVELS);
    while (!isPlacementFinished(s)) s = recordPlacementAnswer(s, pickPlacementQuestion(s, pool, rng)!, false);
    expect(placementResult(s)).toMatchObject({ level: "zero", score: 0 });
  });

  it("e' adattivo: dopo risposte giuste sale, dopo errori scende", () => {
    const ex = { id: "e", level: "a1" as Level, words: [] };
    let s = createPlacement(LEVELS);
    expect(targetLevel(s)).toBe("a1");
    s = recordPlacementAnswer(s, ex, true);
    s = recordPlacementAnswer(s, ex, true);
    expect(levelIndex(targetLevel(s))).toBeGreaterThan(levelIndex("a1"));
    let t = createPlacement(LEVELS);
    t = recordPlacementAnswer(t, ex, false);
    expect(targetLevel(t)).toBe("zero");
  });

  it("non ripete domande ne' parole", () => {
    const { s } = simulate("a2");
    const ids = s.answers.map((a) => a.exerciseId);
    expect(new Set(ids).size).toBe(ids.length);
    const words = s.answers.flatMap((a) => a.words);
    expect(new Set(words).size).toBe(words.length);
  });

  it("con il banco limitato a zero-a2 non assegna mai b1/b2 e segnala il tetto", () => {
    const { result } = simulate("b2", ["zero", "a1", "a2"]);
    expect(result.level).toBe("a2");
    expect(result.capped).toBe(true);
  });

  it("con un solo livello disponibile si ferma a 10 domande", () => {
    const { s } = simulate("zero", ["zero"]);
    expect(s.answers.length).toBe(MIN_QUESTIONS);
  });

  it("e' deterministico a parita' di seme", () => {
    expect(simulate("a1", [...LEVELS], "x").s.answers).toEqual(simulate("a1", [...LEVELS], "x").s.answers);
  });
});

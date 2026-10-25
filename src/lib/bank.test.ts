import { describe, expect, it } from "vitest";
import { CURATED_MIN, buildBank, levelsNeedingGenerator } from "./bank";
import { syntheticPool } from "./fixtures";
import type { Word } from "./contract";

const w = (level: Word["level"]) => ({ level });

describe("banco: quando serve il generatore", () => {
  it("non serve dove il banco curato approvato basta", () => {
    const curated = syntheticPool(["zero", "a1"], CURATED_MIN);
    expect(levelsNeedingGenerator(curated, [w("zero"), w("a1")])).toEqual([]);
  });

  it("serve solo per i livelli con parole ma pochi esercizi curati", () => {
    const curated = syntheticPool(["zero"], CURATED_MIN + 5);
    expect(levelsNeedingGenerator(curated, [w("zero"), w("a1"), w("a2")])).toEqual(["a1", "a2"]);
  });

  it("gli esercizi non approvati non contano", () => {
    const curated = syntheticPool(["zero"], CURATED_MIN + 5).map((e) => ({ ...e, qa_status: "pending" as const }));
    expect(levelsNeedingGenerator(curated, [w("zero")])).toEqual(["zero"]);
  });

  it("senza parole per un livello (b1, b2) non si genera nulla", () => {
    expect(levelsNeedingGenerator([], [])).toEqual([]);
  });

  it("buildBank scarta i non approvati e conta curati e generati", () => {
    const curated = [...syntheticPool(["zero"], 3), ...syntheticPool(["a1"], 2).map((e) => ({ ...e, qa_status: "rejected" as const }))];
    const b = buildBank({ words: [], sentences: [], lessons: [], curated, generated: syntheticPool(["a2"], 4) });
    expect(b.curatedCount).toBe(3);
    expect(b.generatedCount).toBe(4);
    expect(b.levelsAvailable).toEqual(["zero", "a2"]);
  });
});

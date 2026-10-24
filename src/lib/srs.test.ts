import { describe, expect, it } from "vitest";
import { BOX_INTERVALS, boxDistribution, dueWords, intervalFor, isDue, reviewEntry } from "./srs";

describe("SRS Leitner", () => {
  it("usa gli intervalli 1/2/4/8/16 giorni per i box 1-5", () => {
    expect([1, 2, 3, 4, 5].map((b) => intervalFor(b as 1))).toEqual([1, 2, 4, 8, 16]);
    expect(BOX_INTERVALS[5]).toBe(16);
  });

  it("una parola nuova risposta bene va al box 2 e scade dopo 2 giorni", () => {
    expect(reviewEntry(undefined, true, "2026-10-24")).toEqual({ box: 2, due: "2026-10-26" });
  });

  it("una parola nuova sbagliata resta al box 1 e torna domani", () => {
    expect(reviewEntry(undefined, false, "2026-10-24")).toEqual({ box: 1, due: "2026-10-25" });
  });

  it("risposta corretta: sale di un box con il nuovo intervallo", () => {
    expect(reviewEntry({ box: 2, due: "2026-10-24" }, true, "2026-10-24")).toEqual({ box: 3, due: "2026-10-28" });
    expect(reviewEntry({ box: 4, due: "2026-10-24" }, true, "2026-10-24")).toEqual({ box: 5, due: "2026-11-09" });
  });

  it("il box 5 non supera il 5", () => {
    expect(reviewEntry({ box: 5, due: "2026-10-24" }, true, "2026-10-24")).toEqual({ box: 5, due: "2026-11-09" });
  });

  it("errore: torna al box 1 da qualsiasi box", () => {
    expect(reviewEntry({ box: 5, due: "2026-10-24" }, false, "2026-10-24")).toEqual({ box: 1, due: "2026-10-25" });
  });

  it("gestisce il cambio di mese e di anno", () => {
    expect(reviewEntry({ box: 4, due: "2026-12-25" }, true, "2026-12-25").due).toBe("2027-01-10");
  });

  it("isDue e dueWords: ordina per ritardo, poi per box", () => {
    const srs = {
      w_a: { box: 3 as const, due: "2026-10-20" },
      w_b: { box: 1 as const, due: "2026-10-22" },
      w_c: { box: 2 as const, due: "2026-10-25" },
      w_d: { box: 1 as const, due: "2026-10-20" },
    };
    expect(isDue(srs.w_c, "2026-10-24")).toBe(false);
    expect(isDue(srs.w_b, "2026-10-24")).toBe(true);
    expect(dueWords(srs, "2026-10-24")).toEqual(["w_d", "w_a", "w_b"]);
  });

  it("boxDistribution conta le schede per box", () => {
    expect(boxDistribution({ a: { box: 1, due: "x" }, b: { box: 1, due: "x" }, c: { box: 5, due: "x" } })).toEqual({ 1: 2, 2: 0, 3: 0, 4: 0, 5: 1 });
  });
});

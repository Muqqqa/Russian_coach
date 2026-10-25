import { describe, expect, it } from "vitest";
import { collectAuthors, parseAuthors } from "./credits";

describe("autori Tatoeba", () => {
  it("legge il formato standard", () => {
    expect(parseAuthors("Tatoeba.org, frase #5474 di zmoo; traduzione it #4380 di Pharamp; licenza CC BY 2.0 FR")).toEqual(["zmoo", "Pharamp"]);
  });
  it("legge il formato delle frasi CC0", () => {
    expect(parseAuthors("Tatoeba.org, frase #9576770 (CC0, autore ZegPhig); traduzione it #10772662 di dnnywld (CC BY 2.0 FR)")).toEqual(["dnnywld", "ZegPhig"]);
  });
  it("raccoglie autori unici con conteggio", () => {
    const r = collectAuthors([{ attribution: "x frase #1 di b; traduzione it #2 di A" }, { attribution: "x frase #3 di b; traduzione it #4 di b" }]);
    expect(r).toEqual([{ name: "A", count: 1 }, { name: "b", count: 2 }]);
  });
});

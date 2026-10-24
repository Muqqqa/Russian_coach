import type { Level } from "./contract";

export const LEVELS: readonly Level[] = ["zero", "a1", "a2", "b1", "b2"];

export const LEVEL_LABEL: Record<Level, string> = {
  zero: "Zero",
  a1: "A1",
  a2: "A2",
  b1: "B1",
  b2: "B2",
};

export const LEVEL_DESC: Record<Level, string> = {
  zero: "Parti da zero: alfabeto, suoni e prime parole",
  a1: "Frasi semplici e situazioni quotidiane",
  a2: "Conversazioni di base su temi familiari",
  b1: "Ti esprimi in modo autonomo su molti argomenti",
  b2: "Comprendi e discuti testi complessi",
};

export const levelIndex = (l: Level): number => LEVELS.indexOf(l);
export const maxLevel = (a: Level, b: Level): Level => (levelIndex(a) >= levelIndex(b) ? a : b);
export const isLevel = (v: unknown): v is Level => typeof v === "string" && (LEVELS as readonly string[]).includes(v);

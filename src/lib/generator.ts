// Generatore interno di esercizi dai dati (parole e frasi). Serve finche' il banco curato
// (content/exercises) non e' abbastanza ricco. Produce gli stessi tipi del contratto, con id
// "g_..." deterministici. Nessuna AI: solo regole.
import type { Difficulty, Exercise, Level, Sentence, Word } from "./contract";
import { levelIndex } from "./levels";
import { seededRng, shuffle, type Rng } from "./rng";
import { stripStress } from "./normalize";

const LEVEL_DIFF: Record<Level, number> = { zero: 1, a1: 2, a2: 3, b1: 4, b2: 5 };
const clampDiff = (n: number): Difficulty => Math.min(5, Math.max(1, Math.round(n))) as Difficulty;

/** Spezza una glossa in parti ("casa, abitazione (formale)" -> ["casa", "abitazione"]). */
export function glossParts(entries: readonly string[]): string[] {
  const out: string[] = [];
  for (const e of entries) {
    for (const part of e.split(/[,;]/)) {
      const p = part.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
      if (p && !out.includes(p)) out.push(p);
    }
  }
  return out;
}

interface WordGloss {
  word: Word;
  parts: string[];
  lang: "it" | "en";
}

function glossOf(w: Word): WordGloss {
  const hasIt = !!w.it && w.it.length > 0;
  return { word: w, parts: glossParts(hasIt ? w.it! : w.en), lang: hasIt ? "it" : "en" };
}

function sample<T>(pool: readonly T[], n: number, rng: Rng, exclude: (x: T) => boolean): T[] {
  const out: T[] = [];
  if (pool.length === 0) return out;
  let guard = 0;
  while (out.length < n && guard++ < n * 40) {
    const x = pool[Math.floor(rng() * pool.length)];
    if (exclude(x) || out.includes(x)) continue;
    out.push(x);
  }
  return out;
}

function placeCorrect(correct: string, distractors: string[], rng: Rng): { options: string[]; correct: number } {
  const options = shuffle([correct, ...distractors], rng);
  return { options, correct: options.indexOf(correct) };
}

function mk(partial: Omit<Exercise, "qa_status" | "topics" | "grammar_tags"> & { topics?: string[]; grammar_tags?: string[] }): Exercise {
  return { topics: [], grammar_tags: ["lessico"], qa_status: "approved", ...partial } as Exercise;
}

export function generateExercises(words: Word[], sentences: Sentence[]): Exercise[] {
  const out: Exercise[] = [];
  const glosses = words.map(glossOf).filter((g) => g.parts.length > 0 && g.parts[0].length <= 28);
  const gById = new Map(glosses.map((g) => [g.word.id, g]));

  // Pool di distrattori: stessa categoria grammaticale e stesso livello, poi stesso livello, poi tutto.
  const pools = new Map<string, WordGloss[]>();
  const poolKey = (l: Level, p: string) => `${l}|${p}`;
  for (const g of glosses) {
    const k = poolKey(g.word.level, g.word.pos);
    (pools.get(k) ?? pools.set(k, []).get(k)!).push(g);
  }
  const distractorPool = (g: WordGloss): WordGloss[] => {
    const same = pools.get(poolKey(g.word.level, g.word.pos)) ?? [];
    if (same.length >= 8) return same;
    return glosses.filter((x) => levelIndex(x.word.level) <= levelIndex(g.word.level) && x.word.pos === g.word.pos).concat(same);
  };

  // Indice gloss primaria -> parole (per accettare sinonimi nella traduzione it->ru).
  const byPrimary = new Map<string, Word[]>();
  for (const g of glosses) {
    const key = g.parts[0].toLowerCase();
    (byPrimary.get(key) ?? byPrimary.set(key, []).get(key)!).push(g.word);
  }

  for (const g of glosses) {
    const w = g.word;
    const base = LEVEL_DIFF[w.level];
    const rng = seededRng("w:" + w.id);
    const langNote = g.lang === "en" ? " (in inglese)" : "";
    const primary = g.parts[0];
    const topics = w.topics;

    // 1) Scelta multipla: parola russa -> traduzione
    const pool = distractorPool(g);
    const seenP = new Set([primary.toLowerCase()]);
    const seenS = new Set([w.stress]);
    const ds = sample(pool, 8, rng, () => false).filter((x) => {
      const p = x.parts[0].toLowerCase();
      if (x.word.id === w.id || seenP.has(p) || seenS.has(x.word.stress)) return false;
      seenP.add(p);
      seenS.add(x.word.stress);
      return true;
    }).slice(0, 3);
    if (ds.length === 3) {
      const mc = placeCorrect(primary, ds.map((d) => d.parts[0]), rng);
      out.push(mk({ id: `g_mcw_${w.id}`, type: "multiple_choice", level: w.level, difficulty: clampDiff(base), topics, words: [w.id], est_seconds: 12,
        prompt_it: "Scegli la traduzione corretta" + langNote,
        payload: { type: "multiple_choice", question: w.stress, options: mc.options, correct: mc.correct } }));
      // 2) Scelta multipla: traduzione -> parola russa
      const mc2 = placeCorrect(w.stress, ds.map((d) => d.word.stress), rng);
      out.push(mk({ id: `g_mcg_${w.id}`, type: "multiple_choice", level: w.level, difficulty: clampDiff(base + 1), topics, words: [w.id], est_seconds: 14,
        prompt_it: "Scegli la parola russa" + langNote,
        payload: { type: "multiple_choice", question: g.parts.slice(0, 2).join(", "), options: mc2.options, correct: mc2.correct } }));
    }

    // 3) Traduzione russo -> italiano (solo se esiste `it`)
    if (g.lang === "it") {
      out.push(mk({ id: `g_tr_${w.id}`, type: "translate", level: w.level, difficulty: clampDiff(base + 1), topics, words: [w.id], est_seconds: 20,
        prompt_it: "Traduci in italiano",
        payload: { type: "translate", direction: "ru_it", source: w.stress, answer: g.parts[0], accepted: g.parts.slice(1) } }));
    }

    // 4) Traduzione glossa -> russo (scrittura in cirillico). Accetta i sinonimi con la stessa glossa primaria.
    if (primary.length <= 22 && w.pos !== "phrase") {
      const sibs = (byPrimary.get(primary.toLowerCase()) ?? []).filter((x) => x.id !== w.id);
      out.push(mk({ id: `g_rt_${w.id}`, type: "translate", level: w.level, difficulty: clampDiff(base + 2), topics, words: [w.id], est_seconds: 30,
        prompt_it: "Scrivi in russo" + langNote,
        payload: { type: "translate", direction: "it_ru", source: g.parts.slice(0, 2).join(", "), answer: w.stress, accepted: [w.ru, ...sibs.map((s) => s.ru)] } }));
    }
  }

  // 5) Abbinamento: gruppi di 4 parole dello stesso livello e categoria, glosse distinte
  const groupKey = (g: WordGloss) => `${g.word.level}|${g.word.pos}`;
  const groups = new Map<string, WordGloss[]>();
  for (const g of glosses) {
    if (g.parts[0].length > 20) continue;
    (groups.get(groupKey(g)) ?? groups.set(groupKey(g), []).get(groupKey(g))!).push(g);
  }
  for (const [key, arr] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const sorted = arr.slice().sort((a, b) => a.word.id.localeCompare(b.word.id));
    for (let i = 0; i + 4 <= sorted.length; i += 4) {
      const chunk = sorted.slice(i, i + 4);
      if (new Set(chunk.map((c) => c.parts[0].toLowerCase())).size < 4) continue;
      const level = chunk[0].word.level;
      out.push(mk({ id: `g_mt_${key.replace("|", "_")}_${i / 4}`, type: "match", level, difficulty: clampDiff(LEVEL_DIFF[level] + 1),
        topics: [], words: chunk.map((c) => c.word.id), est_seconds: 45,
        prompt_it: chunk.some((c) => c.lang === "en") ? "Abbina ogni parola russa alla traduzione (alcune in inglese)" : "Abbina ogni parola russa alla traduzione",
        payload: { type: "match", pairs: chunk.map((c) => ({ ru: c.word.stress, it: c.parts[0] })) } }));
    }
  }

  // Frasi
  const sByLevel = new Map<Level, Sentence[]>();
  for (const s of sentences) (sByLevel.get(s.level) ?? sByLevel.set(s.level, []).get(s.level)!).push(s);

  for (const s of sentences) {
    const rng = seededRng("s:" + s.id);
    const base = LEVEL_DIFF[s.level];
    const tokens = s.stress.split(/\s+/).filter(Boolean);
    const nWords = tokens.length;
    const topicsFromWords = [...new Set(s.words.flatMap((id) => gById.get(id)?.word.topics ?? []))].slice(0, 3);
    const common = { level: s.level, topics: topicsFromWords, words: s.words, grammar_tags: ["frasi"] };

    // 6) Scelta multipla: traduzione corretta della frase
    const pool = (sByLevel.get(s.level) ?? []).filter((x) => x.id !== s.id && Math.abs(x.ru.split(/\s+/).length - nWords) <= 2 && x.it !== s.it);
    const ds = sample(pool, 3, rng, () => false);
    if (ds.length === 3) {
      const mc = placeCorrect(s.it, ds.map((d) => d.it), rng);
      out.push(mk({ ...common, id: `g_smc_${s.id}`, type: "multiple_choice", difficulty: clampDiff(base + 1), est_seconds: 18,
        prompt_it: "Qual e' la traduzione della frase?",
        payload: { type: "multiple_choice", question: s.stress, options: mc.options, correct: mc.correct } }));
    }

    // 7) Completamento: una parola della frase diventa lacuna
    const candidates = tokens
      .map((t, i) => ({ t, i, bare: t.replace(/^[^\p{L}]+|[^\p{L}́]+$/gu, "") }))
      .filter((c) => stripStress(c.bare).length >= 3);
    if (nWords >= 3 && candidates.length > 0) {
      const c = candidates[Math.floor(rng() * candidates.length)];
      const lead = c.t.slice(0, c.t.indexOf(c.bare));
      const trail = c.t.slice(c.t.indexOf(c.bare) + c.bare.length);
      const text = tokens.map((t, i) => (i === c.i ? `${lead}___${trail}` : t)).join(" ");
      out.push(mk({ ...common, id: `g_cl_${s.id}`, type: "cloze", difficulty: clampDiff(base + 2), est_seconds: 22,
        prompt_it: "Completa la frase",
        payload: { type: "cloze", text, answer: c.bare, accepted: [stripStress(c.bare)], hint_it: s.it } }));
    }

    // 8) Traduzione ru -> it della frase (tolleranza ai refusi, vedi checkTranslate)
    out.push(mk({ ...common, id: `g_str_${s.id}`, type: "translate", difficulty: clampDiff(base + 2), est_seconds: 35,
      prompt_it: "Traduci la frase in italiano",
      payload: { type: "translate", direction: "ru_it", source: s.stress, answer: s.it, accepted: [] } }));

    // 9) Dettato (richiede la voce russa): solo frasi brevi
    if (nWords <= 6) {
      out.push(mk({ ...common, id: `g_dc_${s.id}`, type: "dictation", difficulty: clampDiff(base + 2), est_seconds: 40,
        prompt_it: "Ascolta e scrivi quello che senti",
        payload: { type: "dictation", text: s.stress, translation_it: s.it, accepted: [s.ru] } }));
    }
  }

  return out;
}

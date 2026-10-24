#!/usr/bin/env node
// Validatore del contratto dati, senza dipendenze. Uso:
//   node schema/validate.mjs word|sentence|lesson|exercise <file.json|cartella> ...
// Ogni file contiene un array di record. Riflette schema/types.ts (versione 1).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const LEVELS = ["zero", "a1", "a2", "b1", "b2"];
const POS = ["noun", "verb", "adj", "adv", "pron", "num", "prep", "conj", "part", "intj", "phrase"];
const SOURCES = ["openrussian", "wiktextract", "tatoeba", "original"];
const QA = ["pending", "approved", "rejected"];
const ACCENT = "́";

const isStr = (v) => typeof v === "string" && v.length > 0;
const isStrArr = (v, min = 0) => Array.isArray(v) && v.length >= min && v.every(isStr);
const stripAccent = (s) => s.replaceAll(ACCENT, "");

function provenance(r, e) {
  if (!SOURCES.includes(r.source)) e.push("source non valido");
  if (!isStr(r.license)) e.push("license mancante");
  if (["tatoeba", "wiktextract", "openrussian"].includes(r.source) && !isStr(r.attribution)) e.push("attribution mancante");
}

const checks = {
  word(r, e) {
    if (!/^w_[a-z0-9_]+$/.test(r.id ?? "")) e.push("id deve essere w_<slug>");
    if (!isStr(r.ru)) e.push("ru mancante");
    if (!isStr(r.stress)) e.push("stress mancante");
    else if (r.ru && stripAccent(r.stress).replaceAll("ё", "е") !== r.ru.replaceAll("ё", "е")) e.push("stress non corrisponde a ru");
    if (!isStr(r.translit)) e.push("translit mancante");
    if (!isStrArr(r.it, 1)) e.push("it deve avere almeno una traduzione");
    if (!POS.includes(r.pos)) e.push("pos non valido");
    if (!LEVELS.includes(r.level)) e.push("level non valido");
    if (!isStrArr(r.topics)) e.push("topics deve essere un array di stringhe");
    provenance(r, e);
  },
  sentence(r, e) {
    if (!/^s_[0-9]+$/.test(r.id ?? "")) e.push("id deve essere s_<numero>");
    for (const k of ["ru", "stress", "it"]) if (!isStr(r[k])) e.push(`${k} mancante`);
    if (!isStrArr(r.words, 1)) e.push("words deve avere almeno un id");
    if (!LEVELS.includes(r.level)) e.push("level non valido");
    provenance(r, e);
  },
  lesson(r, e) {
    if (!/^l_(zero|a1|a2|b1|b2)_[0-9]{2}$/.test(r.id ?? "")) e.push("id deve essere l_<livello>_<nn>");
    if (!LEVELS.includes(r.level)) e.push("level non valido");
    if (!Number.isInteger(r.order)) e.push("order deve essere intero");
    if (!isStr(r.title_it)) e.push("title_it mancante");
    if (!isStr(r.explanation_md)) e.push("explanation_md mancante");
    for (const k of ["grammar_tags", "new_words", "review_tags"]) if (!isStrArr(r[k])) e.push(`${k} deve essere un array`);
  },
  exercise(r, e) {
    if (!/^e_[0-9]{6}$/.test(r.id ?? "")) e.push("id deve essere e_<6 cifre>");
    if (!["translate", "cloze", "multiple_choice", "match", "dictation"].includes(r.type)) e.push("type non valido");
    if (!LEVELS.includes(r.level)) e.push("level non valido");
    if (![1, 2, 3, 4, 5].includes(r.difficulty)) e.push("difficulty deve essere 1-5");
    if (!isStrArr(r.topics)) e.push("topics non valido");
    if (!isStrArr(r.grammar_tags)) e.push("grammar_tags non valido");
    if (!isStrArr(r.words, 1)) e.push("words deve avere almeno un id");
    if (!(r.est_seconds >= 5 && r.est_seconds <= 300)) e.push("est_seconds deve stare tra 5 e 300");
    if (!isStr(r.prompt_it)) e.push("prompt_it mancante");
    if (!QA.includes(r.qa_status)) e.push("qa_status non valido");
    const p = r.payload;
    if (!p || p.type !== r.type) return e.push("payload.type deve coincidere con type");
    if (r.type === "translate") {
      if (!["ru_it", "it_ru"].includes(p.direction)) e.push("payload.direction non valido");
      if (!isStr(p.source) || !isStr(p.answer) || !Array.isArray(p.accepted)) e.push("payload translate incompleto");
    } else if (r.type === "cloze") {
      if (!isStr(p.text) || !p.text.includes("___")) e.push("payload.text deve contenere ___");
      if (!isStr(p.answer) || !Array.isArray(p.accepted)) e.push("payload cloze incompleto");
    } else if (r.type === "multiple_choice") {
      if (!isStr(p.question) || !isStrArr(p.options, 3)) e.push("payload multiple_choice incompleto (min 3 opzioni)");
      else if (!Number.isInteger(p.correct) || p.correct < 0 || p.correct >= p.options.length) e.push("payload.correct fuori range");
      else if (new Set(p.options).size !== p.options.length) e.push("opzioni duplicate");
    } else if (r.type === "match") {
      if (!Array.isArray(p.pairs) || p.pairs.length < 3 || p.pairs.length > 6 || !p.pairs.every((x) => isStr(x.ru) && isStr(x.it))) e.push("payload.pairs deve avere 3-6 coppie {ru,it}");
    } else if (r.type === "dictation") {
      if (!isStr(p.text) || !isStr(p.translation_it) || !Array.isArray(p.accepted)) e.push("payload dictation incompleto");
    }
  },
};

function files(path) {
  if (statSync(path).isDirectory())
    return readdirSync(path).flatMap((f) => files(join(path, f)));
  return path.endsWith(".json") ? [path] : [];
}

const [kind, ...targets] = process.argv.slice(2);
if (!checks[kind] || targets.length === 0) {
  console.error("Uso: node schema/validate.mjs word|sentence|lesson|exercise <file|cartella> ...");
  process.exit(2);
}
let bad = 0, total = 0;
const seen = new Set();
for (const t of targets) for (const f of files(t)) {
  let data;
  try { data = JSON.parse(readFileSync(f, "utf8")); } catch (x) { console.error(`${f}: JSON non valido (${x.message})`); bad++; continue; }
  if (!Array.isArray(data)) { console.error(`${f}: deve contenere un array`); bad++; continue; }
  data.forEach((r, i) => {
    total++;
    const e = [];
    checks[kind](r, e);
    if (r.id && seen.has(r.id)) e.push("id duplicato");
    seen.add(r.id);
    if (e.length) { bad++; console.error(`${f}[${i}] ${r.id ?? "?"}: ${e.join("; ")}`); }
  });
}
console.log(`${kind}: ${total - bad < 0 ? 0 : total} record controllati, ${bad} con errori`);
process.exit(bad ? 1 : 0);

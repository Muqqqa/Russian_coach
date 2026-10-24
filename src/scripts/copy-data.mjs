// Copia/serializza data/ e content/ in public/data/ (eseguito prima di dev e build).
// Contratto: ogni file .json e' un array di record. Si uniscono i file per tipo.
// Gli esercizi si pubblicano SOLO se qa_status === "approved".
// Cartelle o file mancanti non sono un errore: l'app usa il generatore interno.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, statSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = join(root, "public", "data");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

function listJson(full) {
  const out = [];
  for (const name of readdirSync(full).sort()) {
    const p = join(full, name);
    if (statSync(p).isDirectory()) out.push(...listJson(p));
    else if (name.endsWith(".json")) out.push(p);
  }
  return out;
}

// Legge ricorsivamente i .json di una cartella. I file che non sono array di record
// (per esempio metadati come topics.json) vengono saltati con un avviso.
function readArrays(dir) {
  const full = join(root, dir);
  if (!existsSync(full) || !statSync(full).isDirectory()) return { records: [], files: 0 };
  const records = [];
  let files = 0;
  for (const p of listJson(full)) {
    const data = JSON.parse(readFileSync(p, "utf8"));
    if (!Array.isArray(data)) {
      console.warn(`  salto ${p.slice(root.length + 1)}: non e' un array di record`);
      continue;
    }
    records.push(...data.filter((r) => r && typeof r === "object" && typeof r.id === "string"));
    files++;
  }
  return { records, files };
}

function dedupe(records, label) {
  const seen = new Set();
  return records.filter((r) => {
    if (seen.has(r.id)) {
      console.warn(`  attenzione: id duplicato in ${label}: ${r.id}`);
      return false;
    }
    seen.add(r.id);
    return true;
  });
}

const counts = {};
const kinds = [
  ["words", "data/words", (r) => true],
  ["sentences", "data/sentences", () => true],
  ["lessons", "content/curriculum", () => true],
  ["exercises", "content/exercises", (r) => r.qa_status === "approved"],
];
for (const [name, dir, keep] of kinds) {
  const { records, files } = readArrays(dir);
  const kept = dedupe(records.filter(keep), name);
  writeFileSync(join(out, `${name}.json`), JSON.stringify(kept));
  counts[name] = kept.length;
  const skipped = records.length - kept.length;
  console.log(`${name}: ${kept.length} record da ${files} file${skipped > 0 ? ` (${skipped} scartati)` : ""}`);
}

// Crediti: data/credits.json (data-curator). Se manca, l'app mostra un testo di riserva.
let credits = false;
const creditsPath = join(root, "data", "credits.json");
if (existsSync(creditsPath)) {
  writeFileSync(join(out, "credits.json"), JSON.stringify(JSON.parse(readFileSync(creditsPath, "utf8"))));
  credits = true;
}
console.log(`credits.json: ${credits ? "presente" : "assente (placeholder)"}`);

writeFileSync(
  join(out, "manifest.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), counts, credits }),
);

// Copia schema/types.ts in src/lib/contract.ts (sola lettura: schema/ non si modifica).
// Cosi' l'app importa il contratto da dentro src/ senza uscire dalla radice del progetto.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = readFileSync(join(root, "schema", "types.ts"), "utf8");
const out = join(root, "src", "lib", "contract.ts");
mkdirSync(dirname(out), { recursive: true });
const banner = "// FILE GENERATO da `npm run sync-contract` a partire da schema/types.ts. Non modificare a mano.\n";
writeFileSync(out, banner + src);
console.log("contract.ts aggiornato da schema/types.ts");

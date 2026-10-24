// Caricamento dei dati statici (public/data/*.json, copiati da `npm run copy-data`).
// Non e' un'API: sono file serviti staticamente insieme all'app.
import type { Exercise, Lesson, Sentence, Word } from "./contract";
import { buildBank, CURATED_MIN, type Bank } from "./bank";
import { generateExercises } from "./generator";

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const assetUrl = (p: string) => `${BASE_PATH}/${p.replace(/^\/+/, "")}`;

async function fetchJson<T>(name: string, optional = false): Promise<T | undefined> {
  try {
    const r = await fetch(assetUrl(`data/${name}`));
    if (!r.ok) {
      if (optional) return undefined;
      throw new Error(`${name}: HTTP ${r.status}`);
    }
    return (await r.json()) as T;
  } catch (e) {
    if (optional) return undefined;
    throw e;
  }
}

function isExercise(e: unknown): e is Exercise {
  const x = e as Exercise;
  return !!x && typeof x.id === "string" && typeof x.type === "string" && typeof x.payload === "object" && x.payload !== null && x.payload.type === x.type && Array.isArray(x.words) && typeof x.est_seconds === "number";
}

export async function loadBank(): Promise<Bank> {
  const [words, sentences, lessons, exercises] = await Promise.all([
    fetchJson<Word[]>("words.json"),
    fetchJson<Sentence[]>("sentences.json", true),
    fetchJson<Lesson[]>("lessons.json", true),
    fetchJson<Exercise[]>("exercises.json", true),
  ]);
  const curated = (exercises ?? []).filter(isExercise).filter((e) => e.qa_status === "approved");
  // Il generatore interno integra il banco curato finche' questo e' piccolo.
  const generated = curated.length >= CURATED_MIN ? [] : generateExercises(words ?? [], sentences ?? []);
  return buildBank({ words: words ?? [], sentences: sentences ?? [], lessons: lessons ?? [], curated, generated });
}

export interface CreditSource {
  name: string;
  license?: string;
  url?: string;
  attribution?: string;
  note?: string;
}

/** Legge data/credits.json: accetta un array di fonti oppure un oggetto con `sources`. */
export async function loadCredits(): Promise<{ sources: CreditSource[]; raw?: unknown } | undefined> {
  const data = await fetchJson<unknown>("credits.json", true);
  if (!data) return undefined;
  const arr = Array.isArray(data) ? data : Array.isArray((data as { sources?: unknown }).sources) ? (data as { sources: unknown[] }).sources : [];
  const sources = arr
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .map((x) => ({
      name: String(x.name ?? x.source ?? x.title ?? "Fonte"),
      license: x.license ? String(x.license) : undefined,
      url: x.url ? String(x.url) : undefined,
      attribution: x.attribution ? String(x.attribution) : x.text ? String(x.text) : undefined,
      note: x.note ? String(x.note) : x.notes ? String(x.notes) : undefined,
    }));
  return { sources, raw: data };
}

// Elenco degli autori delle frasi Tatoeba, ricavato dal campo `attribution` di ogni frase.
// Tatoeba (CC BY) richiede di citare l'autore: oltre al campo per record, la pagina Crediti li elenca tutti.

/** Estrae i nomi degli autori da una stringa `attribution` ("... frase #1 di zmoo; traduzione it #2 di Pharamp; ..."). */
export function parseAuthors(attribution: string): string[] {
  const names: string[] = [];
  for (const m of attribution.matchAll(/ #\d+ di ([^;(]+?)(?=\s*(?:;|\(|$))/g)) names.push(m[1].trim());
  for (const m of attribution.matchAll(/autore ([^;)]+?)(?=\s*(?:;|\)|$))/g)) names.push(m[1].trim());
  return names.filter(Boolean);
}

/** Autori unici con il numero di frasi, in ordine alfabetico senza distinguere maiuscole. */
export function collectAuthors(sentences: readonly { attribution: string }[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const s of sentences) for (const n of new Set(parseAuthors(s.attribution))) counts.set(n, (counts.get(n) ?? 0) + 1);
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
}

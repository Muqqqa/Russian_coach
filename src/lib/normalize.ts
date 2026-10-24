// Normalizzazione delle risposte: maiuscole, ё/е, accento tonico facoltativo, spazi e punteggiatura.

const ACCENT_RE = /[̀́]/g;

/** Rimuove l'accento tonico (U+0301) e il grave (U+0300). */
export function stripStress(s: string): string {
  return s.normalize("NFD").replace(ACCENT_RE, "").normalize("NFC");
}

export function normalizeAnswer(s: string): string {
  return stripStress(s)
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[’‘`´]/g, "'")
    .replace(/[.,;:!?¿¡"«»“”„()\[\]{}…–—-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Vero se la risposta dell'utente coincide con la risposta o con una delle accettate. */
export function checkAnswer(user: string, answer: string, accepted: readonly string[] = []): boolean {
  const u = normalizeAnswer(user);
  if (!u) return false;
  return [answer, ...accepted].some((a) => normalizeAnswer(a) === u);
}

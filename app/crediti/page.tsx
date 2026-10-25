"use client";
import { useEffect, useState } from "react";
import { loadCredits, loadSentenceAuthors, type CreditSource } from "@/lib/data";

// Testo di riserva finché data/credits.json non è disponibile. Derivato da LICENSES.md.
const FALLBACK: CreditSource[] = [
  {
    name: "OpenRussian.org",
    license: "CC BY-SA 4.0",
    url: "https://en.openrussian.org/dictionary-data",
    attribution: "OpenRussian.org (en.openrussian.org), dati su https://github.com/Badestrand/russian-dictionary. Parole, accenti e forme. Modifiche: normalizzazione, accenti convertiti, livelli rimappati.",
  },
  {
    name: "Tatoeba",
    license: "CC BY 2.0 FR (alcune frasi CC0)",
    url: "https://tatoeba.org",
    attribution: "Frasi di esempio e traduzioni italiane dai contributori di Tatoeba.org. L'autore di ogni frase è indicato nei dati.",
  },
  {
    name: "Wiktionary (Wiktextract / kaikki.org)",
    license: "CC BY-SA 4.0",
    url: "https://kaikki.org",
    attribution: "Forme, genere, argomenti e IPA integrati da Wiktionary via Wiktextract (Tatu Ylonen, LREC 2022).",
  },
  {
    name: "Wikizionario",
    license: "CC BY-SA 4.0",
    url: "https://it.wiktionary.org",
    attribution: "Traduzioni italiane di alcune parole, dai contributori di Wikizionario.",
  },
];

export default function CreditsPage() {
  const [sources, setSources] = useState<CreditSource[]>();
  const [placeholder, setPlaceholder] = useState(false);
  const [authors, setAuthors] = useState<{ name: string; count: number }[]>();

  useEffect(() => {
    loadCredits()
      .then((c) => {
        if (c && c.sources.length > 0) setSources(c.sources);
        else {
          setSources(FALLBACK);
          setPlaceholder(true);
        }
      })
      .catch(() => {
        setSources(FALLBACK);
        setPlaceholder(true);
      });
    loadSentenceAuthors().then(setAuthors).catch(() => setAuthors([]));
  }, []);

  return (
    <div className="stack">
      <h1>Crediti e licenze</h1>
      <p>
        Russian Coach non genera i contenuti mentre lo usi: parole, frasi ed esercizi sono dati statici costruiti a partire da fonti aperte. Grazie a tutte le persone che li hanno scritti e li mantengono.
      </p>
      {placeholder && (
        <div className="banner" role="status">
          <strong>Elenco provvisorio.</strong> L&apos;elenco completo dei crediti (data/credits.json) non è ancora disponibile: questo riepilogo è tratto da LICENSES.md.
        </div>
      )}
      {!sources && <p className="muted">Caricamento...</p>}
      {sources?.map((s) => (
        <section key={s.name} className="card stack" aria-label={s.name}>
          <h2 style={{ margin: 0 }}>{s.name}</h2>
          {s.license && (
            <p style={{ margin: 0 }}>
              {s.license_url ? <a className="chip" href={s.license_url} target="_blank" rel="noopener noreferrer">{s.license}</a> : <span className="chip">{s.license}</span>}
            </p>
          )}
          {s.used_for && <p className="muted" style={{ margin: 0 }}>Usato per: {s.used_for}</p>}
          {s.attribution && <p style={{ margin: 0 }}>{s.attribution}</p>}
          {s.note && <p className="muted small" style={{ margin: 0 }}>{s.note}</p>}
          {s.url && <p style={{ margin: 0 }}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.url}</a></p>}
        </section>
      ))}
      {authors && authors.length > 0 && (
        <section className="card stack" aria-labelledby="aut">
          <h2 id="aut" style={{ margin: 0 }}>Autori delle frasi (Tatoeba)</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Le frasi d&apos;esempio e le loro traduzioni sono scritte da volontari di <a href="https://tatoeba.org" target="_blank" rel="noopener noreferrer">Tatoeba</a>. Grazie a {authors.length} autori.
          </p>
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>Mostra l&apos;elenco completo</summary>
            <ul className="small" style={{ columns: "9em", margin: "8px 0 0", paddingLeft: "1.1rem" }}>
              {authors.map((a) => <li key={a.name}>{a.name} <span className="muted">({a.count})</span></li>)}
            </ul>
          </details>
        </section>
      )}
      <section className="card stack">
        <h2 style={{ margin: 0 }}>Licenza dei dati del progetto</h2>
        <p style={{ margin: 0 }}>
          I dati lessicali e le frasi sono distribuiti con licenza <strong>CC BY-SA 4.0</strong>: puoi copiarli e modificarli citando le fonti e mantenendo la stessa licenza. Le frasi di Tatoeba conservano l&apos;attribuzione al singolo autore.
        </p>
      </section>
    </div>
  );
}

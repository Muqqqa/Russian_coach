# Licenze delle fonti dati

Stato: verifica della Fase 1 del 2026-10-24. **Verifica INCOMPLETA**: dall'ambiente di sviluppo le pagine ufficiali (openrussian.org, wiktionary.org, kaikki.org, tatoeba.org, downloads.tatoeba.org, github.com) risultano bloccate dal proxy (HTTP 403 su CONNECT, policy di rete). Le informazioni qui sotto vengono da ricerche web secondarie (snippet di risultati, non le pagine ufficiali) e dalla conoscenza pregressa. Ogni voce e' marcata con il grado di certezza. Prima di pubblicare l'app, un umano deve confermare le voci "DA VERIFICARE" sulle pagine ufficiali.

## OpenRussian

- Licenza: CC BY-SA 4.0 (SPDX `CC-BY-SA-4.0`). Fonte: README del repository GitHub con i dati di OpenRussian, citato da ricerca web (file LICENSE non aperto). Certezza: media.
- Attribuzione: obbligatoria. Citare "OpenRussian.org", link alla licenza, indicare le modifiche. Le frasi della tabella sentences derivano da Tatoeba (ID e autore Tatoeba presenti): per quelle vale anche la licenza Tatoeba (vedi sotto).
- Share-alike: SI. Le opere derivate (il nostro `data/words`) vanno rilasciate con CC BY-SA 4.0 o compatibile.
- Compatibilita' con app + dati statici: si', distribuire i dati nell'app e' permesso con attribuzione. Il share-alike si applica ai DATI derivati, non al codice dell'app, a patto che i dati restino file distinti e separabili (JSON), con propria licenza dichiarata. Da confermare con il lead se si vuole una licenza unica.
- Formato/dump: nessun dump ufficiale verificato. Il README indica un database ospitato su TogetherDB con esportazione CSV per tabella ("un po' datati"). Un tool di terzi (`openrussian-to-sqlite`) converte i dati in SQLite. URL esatti: DA VERIFICARE.
- Italiano: le traduzioni di OpenRussian sono in inglese e tedesco (conoscenza pregressa, DA VERIFICARE). Nessuna traduzione italiana attesa.

## Wiktionary / Wiktextract (kaikki.org)

- Licenza del testo Wiktionary: doppia, CC BY-SA 4.0 e GFDL (conoscenza pregressa; pagina Wiktionary:Copyrights non raggiungibile). Certezza: alta ma non verificata qui. Si sceglie CC BY-SA 4.0 (`CC-BY-SA-4.0`).
- Wiktextract (software di estrazione di Tatu Ylonen): licenza del codice MIT (conoscenza pregressa, DA VERIFICARE). I dati estratti su kaikki.org restano contenuto Wiktionary, quindi CC BY-SA 4.0 / GFDL. Kaikki.org non mostra, secondo la ricerca, una dichiarazione di licenza propria.
- Attribuzione: obbligatoria. Citare "Wiktionary (en.wiktionary.org) contributori, CC BY-SA 4.0", link alla pagina della voce o alla cronologia, indicare le modifiche. Kaikki.org chiede inoltre di citare l'articolo LREC 2022 di Tatu Ylonen ("Wiktextract: Wiktionary as Machine-Readable Structured Data") e gradisce un link a kaikki.org.
- Share-alike: SI (come OpenRussian).
- Compatibilita' con app + dati statici: si', con le stesse condizioni di OpenRussian. CC BY-SA 4.0 e' unidirezionalmente compatibile con se stessa: le due fonti si possono fondere in un unico dataset CC BY-SA 4.0.
- Formato/dump: JSON Lines (un oggetto JSON per riga), per lingua. Pagina attesa `https://kaikki.org/dictionary/Russian/` con file `kaikki.org-dictionary-Russian.jsonl` (nome e dimensione DA VERIFICARE, e' noto essere nell'ordine delle centinaia di MB). Alternativa: dump ufficiali Wikimedia (dumps.wikimedia.org) elaborati con wiktextract.
- Italiano: la edizione inglese ha glosse in inglese. L'edizione italiana di Wiktionary ha pochissime voci russe.

## Tatoeba

- Licenza testo frasi: CC BY 2.0 FR (SPDX `CC-BY-2.0-FR` non esiste in SPDX; usare `CC-BY-2.0`, nota: la versione francese e' CC BY 2.0 FR). Alcune frasi originali sono CC0 1.0. Fonte: guida Tatoeba per utilizzatori del corpus (ricerca web, wiki.tatoeba.org). Certezza: media-alta. Termini d'uso correnti non letti: DA VERIFICARE.
- Audio: licenze diverse per contributore, NON incluso nel progetto (si usa la sintesi vocale del browser).
- Attribuzione: obbligatoria (unica condizione). Citare "Tatoeba.org, CC BY 2.0 FR" e l'autore della frase. L'export fornisce il nome utente per frase: va conservato in `attribution`.
- Share-alike: NO per CC BY 2.0 FR. Le frasi si possono ridistribuire in un dataset con altra licenza, con attribuzione. Il file combinato resta pero' soggetto a CC BY-SA per la parte OpenRussian/Wiktionary.
- Compatibilita' con app + dati statici: si'.
- Formato/dump: esportazioni settimanali su `https://downloads.tatoeba.org/exports/` (TSV, bz2): `sentences.tar.bz2` / `sentences_detailed.tar.bz2` (id, lingua, testo, utente, date), `links.tar.bz2` (coppie id-id di traduzione), per-lingua in `per_language/rus/` e `per_language/ita/`; `user_languages.tar.bz2`; tag e liste. Percorsi DA VERIFICARE.
- Italiano: Tatoeba ha un buon numero di coppie rus-ita (attese nell'ordine di decine di migliaia, da verificare), quindi e' la fonte principale per le traduzioni italiane delle frasi.

## Rischi

1. **Verifica incompleta**: nessuna pagina ufficiale letta (rete bloccata). Le licenze sopra sono probabili ma non confermate.
2. **Share-alike**: tutti i dati lessicali derivati da OpenRussian e Wiktionary vanno rilasciati CC BY-SA 4.0. Serve una pagina "Crediti e licenze" nell'app e un file `data/LICENSE` con questa dichiarazione. Il codice dell'app puo' avere altra licenza se i dati restano separati.
3. **Attribuzione per frase** (Tatoeba): conservare l'autore in `attribution`, mostrare un credito aggregato nell'app.
4. **OpenRussian**: i dati pubblici sono "un po' datati" e il canale ufficiale di download e' incerto; la qualita' e la completezza degli accenti vanno controllate.
5. **Traduzioni italiane**: OpenRussian e Wiktextract non hanno italiano. Solo Tatoeba (frasi) ne fornisce. Le parole avranno `it` vuoto: serve decisione dell'utente.
6. **Contenuti originali** del team (lezioni, esercizi): licenza a scelta del progetto, ma gli esercizi che citano frasi Tatoeba/parole OpenRussian ereditano attribuzione e, per le parole, share-alike.

## Scaricabilita' dall'ambiente

NO. Test eseguiti il 2026-10-24: `en.openrussian.org`, `en.wiktionary.org`, `kaikki.org`, `tatoeba.org`, `downloads.tatoeba.org`, `github.com` rispondono 403 sul CONNECT del proxy (denial di policy); WebFetch non risolve i nomi. `raw.githubusercontent.com` risponde 404 sul percorso provato. Non sono stati scaricati ne' inventati dati.

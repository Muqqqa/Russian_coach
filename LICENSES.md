# Licenze delle fonti dati

Verifica del 2026-10-24 sulle pagine ufficiali (ora raggiungibili). Le licenze sotto sono VERIFICATE con URL, salvo dove indicato. Parere tecnico del data-curator, non consulenza legale.

## Licenza dei dati del progetto (PROPOSTA, in attesa di conferma dell'utente)
CC BY-SA 4.0 per `data/words` e `data/sentences` e per ogni dato derivato (obbligo di share-alike dovuto a OpenRussian e Wiktionary). Il codice dell'app puo' avere altra licenza se i dati restano file JSON separati con la propria licenza dichiarata. L'app deve avere una pagina "Crediti e licenze" con i testi di attribuzione qui sotto.

## OpenRussian — USATA
- Licenza: **CC BY-SA 4.0** (`CC-BY-SA-4.0`). Verificata su https://en.openrussian.org/dictionary-data ("all data is licensed under the CC BY-SA license ... use the data in any way you want, also commercially, as long as you mention the source(s) and if you do modifications, make them public under the same license"), su https://github.com/Badestrand/russian-dictionary (README + file LICENSE = CC BY-SA 4.0 testo integrale).
- Attribuzione: obbligatoria. Testo usato: "OpenRussian.org (en.openrussian.org), dati su https://github.com/Badestrand/russian-dictionary, CC BY-SA 4.0"; indicare le modifiche (normalizzazione, accenti convertiti, livelli rimappati).
- Share-alike: SI, dati derivati sotto CC BY-SA 4.0 o compatibile.
- App + dati statici: consentito (anche uso commerciale) con attribuzione; share-alike sui dati.
- Fonti a monte di OpenRussian (ringraziate sulla pagina About): Tatoeba (frasi), Wiktionary (attributi e flessioni), Dicipedia (traduzioni), Starling (flessioni), Shtooka (audio, NON aperto, non usato).
- Dati usati: CSV nouns/verbs/adjectives/others del repo GitHub (snapshot 2021, ultimo commit 2021-08-09), elenchi per livello A1/A2/B1 letti dal sito pubblico (https://en.openrussian.org/list/all?level=A1, poche decine di richieste). Nessun dump piu' recente scaricabile da noi: il dump "nightly" e' su TogetherDB (https://app.togetherdb.com/db/fwoedz5fvtwvq03v/openrussian_public/words), app web con export manuale, non usata.
- Lingue delle traduzioni: inglese (e tedesco nei CSV). Nessun italiano.

## Tatoeba — USATA (solo testo delle frasi)
- Licenza: **CC BY 2.0 FR** per il testo delle frasi (https://tatoeba.org/en/terms_of_use, sez. 6.2). Alcune frasi sono CC0 (export dedicato `*_sentences_CC0.tsv.bz2`). SPDX: si usa `CC-BY-2.0`, la parte "FR" e' annotata in `attribution`. Nei file ogni frase CC0 e' marcata `CC0-1.0`.
- Attribuzione: obbligatoria, nome dell'autore della frase (sez. 6.5: "in the case of a CC-BY license, it is your responsibility to quote the author"). Salvata per frase in `attribution` (autore russo e autore della traduzione italiana). Anche la traduzione e' una frase con proprio autore.
- Share-alike: NO. Uso commerciale: non vietato in generale (sez. 6.5), ma dipende dai contributori; per il solo testo CC BY non c'e' restrizione NC.
- Audio: licenze per contributore, NON usato.
- App + dati statici: consentito con attribuzione.
- Dump: https://downloads.tatoeba.org/exports/per_language/ — usati `rus/rus_sentences_detailed.tsv.bz2`, `ita/ita_sentences_detailed.tsv.bz2`, `rus/rus-ita_links.tsv.bz2`, `rus/rus_sentences_CC0.tsv.bz2` (TSV, UTF-8, bz2). Aggiornati settimanalmente. Sono state scartate le frasi con autore ignoto (`\N`).
- Rischio: le frasi sono contributi utente, qualita' variabile; una frase puo' essere ricollocata sotto altra licenza (sez. 6.4), l'attribuzione resta quella dell'export al 2026-10-24.

## Wiktionary / Wiktextract (kaikki.org) — NON USATA (disponibile)
- Licenza testo Wiktionary: **doppia CC BY-SA 4.0 e GFDL, a scelta** (https://en.wiktionary.org/wiki/Wiktionary:Copyrights, verificata). Si sceglierebbe CC BY-SA 4.0.
- Wiktextract (codice): MIT (verificata: https://raw.githubusercontent.com/tatuylonen/wiktextract/master/LICENSE); alcuni file di test sotto licenza Wiktionary. I dati estratti su kaikki.org restano contenuto Wiktionary (CC BY-SA/GFDL); il sito non ha una licenza propria separata.
- Attribuzione: contributori Wiktionary + link alla voce; kaikki.org chiede di citare in ricerca accademica Tatu Ylonen, "Wiktextract: Wiktionary as Machine-Readable Structured Data", LREC 2022, pp. 1317-1325, e gradisce link a kaikki.org.
- Share-alike: SI. Compatibile con OpenRussian (stessa CC BY-SA 4.0).
- Dump: https://kaikki.org/dictionary/Russian/index.html (JSONL post-processato, ~905 MB, marcato DEPRECATED "will be removed"); dati grezzi https://kaikki.org/dictionary/rawdata.html (JSONL 24.8 GB, solo edizione inglese, tutte le lingue). Estrazione del 2026-10-21 da dump enwiktionary 2026-10-01.
- Perche' non usata: OpenRussian + Tatoeba coprono accenti, forme e frasi per i livelli richiesti; Wiktextract aggiungerebbe etimologie/IPA ma anche 905 MB di dati da filtrare. Utilizzabile in seguito (es. per IPA, esempi, verifica degli accenti).
- Italiano: glosse in inglese.

## Rischi e note
1. **Share-alike** sui dati lessicali: pubblicare `data/` come CC BY-SA 4.0 con pagina crediti.
2. **Attribuzione per frase** (Tatoeba): mostrare crediti aggregati nell'app (autori e link a tatoeba.org) e tenere `attribution` nei dati.
3. **OpenRussian**: i CSV pubblici del repo sono del 2021; il sito e' piu' recente. Per aggiornare servirebbe l'export TogetherDB (manuale).
4. **Scraping delle liste livello** dal sito OpenRussian: poche richieste, dati CC BY-SA e pubblicati come open data; da rifare con l'export ufficiale se si vuole una fonte formale.
5. **Traduzioni italiane delle parole**: assenti (usare `en`); le frasi hanno `it` da Tatoeba (contributi utente, qualita' variabile).
6. Dati non filtrati per contenuti sensibili nelle frasi (violenza, ecc.): richiede QA.

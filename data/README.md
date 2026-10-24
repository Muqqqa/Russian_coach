# Dati lessicali e frasi (data-curator)

Contratto: `schema/README.md` e `schema/types.ts`. Validazione:
`node schema/validate.mjs word data/words` e `node schema/validate.mjs sentence data/sentences`.
Licenza dei dati: CC BY-SA 4.0 (proposta, vedi `/LICENSES.md`). Ogni record ha `source`, `license`, `attribution`.

## Contenuto (aggiornato al 2026-10-24)
| File | Record |
|---|---|
| `words/zero.json` | 89 parole |
| `words/a1.json` | 233 parole |
| `words/a2.json` | 492 parole |
| `sentences/zero.json` | 70 frasi |
| `sentences/a1.json` | 332 frasi |
| `sentences/a2.json` | 1433 frasi |

Totale 814 parole, 1835 frasi. Parole con almeno una frase d'esempio: zero 88/89, a1 216/233, a2 439/492 (`examples`, max 3 per parola).

## Come sono assegnati i livelli (DECISIONE DA CONFERMARE)
OpenRussian ha le liste A1 (89 voci), A2 (233), B1 (492), B2 (985)... L'elenco A1 e' troppo piccolo per essere un "A1" didattico, quindi:
OpenRussian A1 -> `zero`, A2 -> `a1`, B1 -> `a2` (tutte le 492 voci; B2 escluso). La mappa e' `LEVEL_MAP` in `scripts/build_words.py`.
Il livello di una frase e' il massimo tra quelli delle sue parole.

## Fonti e trattamento
- **OpenRussian** (liste per livello dal sito, forme e accenti dai CSV del repo pubblico `Badestrand/russian-dictionary`, snapshot 2021). `en` = traduzioni correnti del sito. `it` non e' riempito (nessuna fonte italiana per le parole).
- **Tatoeba** (export per lingua del 2026-10-24): frasi `rus` con traduzione `ita` (link rus-ita). Autore russo e italiano in `attribution`. Frasi dal sottoinsieme CC0 hanno `license: CC0-1.0`, le altre `CC-BY-2.0` (nota: e' CC BY 2.0 FR, annotato in `attribution`).
- **Wiktextract/kaikki.org** (en.wiktionary, dump russo post-processato 2026-10-21): usato dopo, da `enrich_wiktextract.py`, per integrare forme mancanti, genere/animato mancanti, `topics` da categorie e confronti. **Wikizionario** (`kaikki.org/itwiktionary/Russo`, 2879 sensi): usato per `it`.
- Accenti: OpenRussian li segna con apostrofo -> convertiti in U+0301. Monosillabi senza segno: accento sull'unica vocale (non su ё). Due espressioni senza accento in fonte sono in `STRESS_FIX` (`добрый вечер`, `вай-фай`) e `до свидания` (clitico): da verificare in QA.
- Nelle frasi i monosillabi di preposizioni, congiunzioni e particelle (в, на, не, и, но, бы...) NON portano accento (sono clitici).
- `translit`: trascrizione leggibile da italiani, accento grave sulla tonica, senza riduzione vocalica (`ч`=c(i), `ш`=sc(i), `щ`=ssc(i), `ж`=zh, `ц`=z, `х`=kh, `й`=j, `ы`=y, `г`=gh davanti a е/и). Algoritmica, da rivedere in QA.
- `topics` e' vuoto: OpenRussian non fornisce argomenti nell'elenco. Da assegnare dal curriculum-writer (o in un passaggio dedicato).
- `pos`: dall'elenco OpenRussian; le voci "other"/"expression" sono state classificate a mano in `OTHER_POS` (`build_words.py`), da rivedere.
- ID parola: `w_<slug>` (slug ASCII dal russo); omografi con suffisso `_<pos>`. ID frase: `s_` + ID Tatoeba (zero-padded a 5 cifre).

## Selezione delle frasi
Frasi rus con traduzione ita e autori noti, 2-8 parole, <=70 caratteri, senza cifre/latino, in cui OGNI parola (anche flessa) e' una forma di una parola in `data/words`; esclusi omografi con accenti diversi. Scelta greedy delle piu' corte, fino a 3 esempi per parola.
Nome propri (Том, Мэри) e frasi con parole fuori vocabolario sono scartati.

## Chiavi di `forms`
- Nomi: `{nom,gen,dat,acc,ins,prep}_{sg,pl}`; `indeclinable: "1"`. Genere/animato nei campi `gender`/`animate`.
- Verbi: `aspect` (imperfective|perfective), `aspect_partner`, `presfut_{1,2,3}{sg,pl}` (presente o futuro semplice), `past_{m,f,n,pl}`, `imp_{sg,pl}`.
- Aggettivi/pronomi aggettivali: `{m,f,n,pl}_{nom,gen,dat,acc,ins,prep}`, `short_{m,f,n,pl}`, `comp`, `sup`.
- Varianti separate da ", " nello stesso valore (es. `"то́т, того́"`). Forme con ё scritte con ё. 8 parole senza riga nei CSV (nessuna forma): ваш, наш, чем, мем, вай-фай, попкорн, сидушка, безоблачно.

## Arricchimento Wiktextract / Wikizionario (`scripts/enrich_wiktextract.py`)
- **Forme**: vengono aggiunte solo chiavi MANCANTI; OpenRussian non viene mai sovrascritto. Integrate 413 forme in 68 parole (tra cui declinazioni complete di ваш, наш; plurali di мем, попкорн). Per i nomi con soli singolari/plurali in OpenRussian non si aggiungono forme del numero mancante. Parole senza alcuna forma restano 188: sono per lo piu' invariabili (avverbi, preposizioni, particelle...); tra nomi/verbi/aggettivi mancano solo вай-фай, кредитная карта, сидушка (nessuna entry Wiktionary utile).
- **Genere/animato**: integrati solo se assenti (6 generi, 1 animato).
- **topics**: 232 parole hanno almeno un argomento, derivato dalle categorie Wiktionary tramite la mappa `CATEGORY_TOPICS` (slug italiani: tempo, persone, numeri, corpo, cibo-bevande, famiglia, natura, casa, trasporti, salute, abbigliamento, ...). Sono categorie solo dell'entry scelta; le restanti 582 parole non hanno argomento. Da rivedere dal curriculum-writer.
- **`it`** (traduzione italiana): 132 parole (zero 21, a1 55, a2 56) da Wikizionario, solo se l'entry italiana e' unica, con un solo senso corto e pos compatibile (parentesi esplicative rimosse, glosse separate da virgola in lista). Altri 36 casi con piu' sensi NON usati e salvati come `it_candidates` in `extra/wiktextract.json` (l'ordine dei sensi di Wikizionario non garantisce che il primo sia quello di OpenRussian).
- **Sidecar `extra/wiktextract.json`** (id parola -> dati che il contratto non prevede): `ipa` (prima trascrizione di Wiktionary, fonetica stretta tra [ ], 784 parole), `grammar` (aspect, transitive/intransitive, reflexive, indeclinable, possessive, plural_only, uncountable, decl_class), `governs` (casi retti, 39 parole: gen/dat/acc/ins/prep), `forms_added` (chiavi aggiunte da Wiktionary: provenienza per chiave), `topics_from`, `it_from`, `it_candidates`, `no_wiktionary_entry` (30 parole).
- **Provenienza**: `source` resta `openrussian` (fonte principale); `attribution` aggiunge "forme/genere/argomenti integrati da Wiktionary via Wiktextract, CC BY-SA 4.0" e/o "traduzione it da Wikizionario, CC BY-SA" quando usati. Licenza dichiarata invariata `CC-BY-SA-4.0`.
- **Report per qa-russian**: `reports/stress_disagreements.json`. Accenti dei lemmi: 730 confrontati con Wiktionary, 0 disaccordi (OpenRussian e' in parte derivato da Wiktionary, quindi la verifica non e' indipendente). Disaccordi sulle FORME: 31 (es. `год` prep_sg `году́` vs `го́де`, `колено` plurale, `худой` comparativo) e 2 su animato (`лицо`, `кошка`). Spesso sono varianti legittime (locativo, doppi plurali): vanno decisi da QA, nulla e' stato modificato.

## Proposte di modifica al contratto (per il lead; NON applicate)
Campi opzionali su `Word`: `ipa?: string`; `aspect?: "impf" | "pf" | "both"`; `grammar_tags?: string[]` (es. reflexive, transitive, indeclinable, possessive); `governs?: ("gen"|"dat"|"acc"|"ins"|"prep")[]`. Oggi stanno nel sidecar. Servono aumento di `SCHEMA_VERSION` e approvazione dell'utente. In alternativa restano in `extra/` e l'app builder li legge a parte.

## Script (`scripts/`)
1. `fetch_sources.sh`: scarica OpenRussian (git clone), liste livelli (`fetch_levels.py`), export Tatoeba in `data/raw/` (in `.gitignore`).
2. `build_words.py`: genera `words/*.json`.
3. `build_sentences.py`: genera `sentences/*.json` e aggiorna `examples`. Eseguire sempre dopo `build_words.py`.
4. `subset_wiktextract.py` poi `enrich_wiktextract.py`: arricchimento (ultimo passo; ordine obbligato: build_words, build_sentences, subset, enrich).
`common.py`: accenti, translit, slug.

## Problemi aperti
- Parole: `it` presente solo per 132 su 814 (Wikizionario); per le altre 682 l'app mostra `en` oppure serve una traduzione del team con QA.
- Dati OpenRussian dal repo GitHub fermi al 2021 (le liste di livello e le traduzioni sono invece correnti).
- Contenuto delle frasi non filtrato per sensibilita' (es. violenza): serve un passaggio QA.
- Qualita' traduzioni Tatoeba variabile (alcune sono libere); QA su un campione.
- Alcune parole B1 poco adatte a "a2" (es. `сидушка`, `мем`) per effetto del mapping.

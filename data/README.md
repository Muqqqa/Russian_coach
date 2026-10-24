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
- **Wiktextract/kaikki.org**: NON usato (vedi problemi aperti). I 3 dump Tatoeba/OpenRussian bastano per il contratto.
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

## Script (`scripts/`)
1. `fetch_sources.sh`: scarica OpenRussian (git clone), liste livelli (`fetch_levels.py`), export Tatoeba in `data/raw/` (in `.gitignore`).
2. `build_words.py`: genera `words/*.json`.
3. `build_sentences.py`: genera `sentences/*.json` e aggiorna `examples`. Eseguire sempre dopo `build_words.py`.
`common.py`: accenti, translit, slug.

## Problemi aperti
- Parole: solo `en`. Tre vie per `it`: traduzione da parte del team in un secondo passaggio (con QA), oppure nulla (l'app mostra `en`).
- Dati OpenRussian dal repo GitHub fermi al 2021 (le liste di livello e le traduzioni sono invece correnti).
- Contenuto delle frasi non filtrato per sensibilita' (es. violenza): serve un passaggio QA.
- Qualita' traduzioni Tatoeba variabile (alcune sono libere); QA su un campione.
- Alcune parole B1 poco adatte a "a2" (es. `сидушка`, `мем`) per effetto del mapping.

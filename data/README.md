# Dati lessicali e frasi (data-curator)

Contratto: `schema/README.md` e `schema/types.ts`. Validazione:
`node schema/validate.mjs word data/words` e `node schema/validate.mjs sentence data/sentences`.
Licenza dei dati: CC BY-SA 4.0 (confermata; vedi `LICENSE.md`, `credits.json` per la pagina Crediti dell'app, e `/LICENSES.md`). Ogni record ha `source`, `license`, `attribution`.

## Contenuto (aggiornato al 2026-10-24)
| File | Record |
|---|---|
| `words/zero.json` | 89 parole |
| `words/a1.json` | 231 parole |
| `words/a2.json` | 484 parole |
| `sentences/zero.json` | 88 frasi |
| `sentences/a1.json` | 401 frasi |
| `sentences/a2.json` | 1398 frasi |

Totale 804 parole, 1887 frasi (dopo filtro e correzioni QA). Parole con almeno una frase d'esempio: zero 88/89, a1 218/231, a2 424/484 (`examples`, max 3 per parola).

## Come sono assegnati i livelli (mappa confermata)
OpenRussian ha le liste A1 (89 voci), A2 (233), B1 (492), B2 (985)... L'elenco A1 e' troppo piccolo per essere un "A1" didattico, quindi:
OpenRussian A1 -> `zero`, A2 -> `a1`, B1 -> `a2` (tutte le voci, meno 8 rimosse dopo QA; B2 escluso). La mappa e' `LEVEL_MAP` in `scripts/build_words.py`.
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
- **Campi del contratto** popolati da Wiktextract: `ipa` (784 parole; fonetica stretta tra [ ]), `aspect` (impf 85, pf 82, both 1), `grammar_tags` (transitive, intransitive, reflexive, indeclinable, uncountable, plural_only, possessive), `governs` (39 parole, formato `+gen`, `+dat`, `+acc`, `+ins`, `+prep`). Sono scritti da `enrich_wiktextract.py`, quindi rigenerare riproduce lo stesso risultato.
- **Sidecar `extra/wiktextract.json`**: solo cio' che il contratto non prevede: `forms_added` (provenienza per chiave), `topics_from`, `it_from`, `it_candidates` (36, NON usate: le rivede qa-russian), `decl_class` (classe di declinazione/accento Wiktionary), `no_wiktionary_entry` (30 parole).
- **Provenienza**: `source` resta `openrussian` (fonte principale); `attribution` aggiunge "forme/genere/argomenti integrati da Wiktionary via Wiktextract, CC BY-SA 4.0" e/o "traduzione it da Wikizionario, CC BY-SA" quando usati. Licenza dichiarata invariata `CC-BY-SA-4.0`.
- **Report per qa-russian**: `reports/stress_disagreements.json`. Accenti dei lemmi: 730 confrontati con Wiktionary, 0 disaccordi (OpenRussian e' in parte derivato da Wiktionary, quindi la verifica non e' indipendente). Disaccordi sulle FORME: 31 (es. `год` prep_sg `году́` vs `го́де`, `колено` plurale, `худой` comparativo) e 2 su animato (`лицо`, `кошка`). Spesso sono varianti legittime (locativo, doppi plurali): vanno decisi da QA, nulla e' stato modificato.

## Filtro contenuti sensibili (`scripts/filter_sentences.py`)
Euristica a radici/espressioni regolari in russo (sui token) e in italiano (sulla traduzione): violenza/armi, morte, sesso, droga/alcol, politica, religione, insulti/razzismo (anche discriminazione sul corpo). Per cautela esclude anche falsi positivi (es. "Sono il vostro capitano" per la categoria politica/militare). Viene applicato al pool dei candidati in `build_sentences.py` PRIMA della selezione, cosi' le parole mantengono gli esempi; lo script da solo ricontrolla `data/sentences`, verifica che ogni parola delle frasi esista in `data/words` e ricalcola `examples`.
- `reports/filtered_sentences.json`: 482 frasi escluse su 12824 candidate (id, motivo, termine, testo). Per motivo: morte 92, violenza/armi 80, droga/alcol 60, politica 32, religione 31, insulti/razzismo 24, nomi propri mappati male 142, rifiutate da qa 21. Dopo la revisione QA il filtro e' piu' preciso: `полиция` ammessa, radice `бой-` solo come sostantivo (non `не бойся`), `чёрт` solo con ё, niente `brutto/anima/prete` come sottostringhe, `в общих чертах` ammessa; piu' severo su urlare/gridare (`крич-`), bere (`пил/пьёт`), `небес-`. **Alcol: `пиво` e' ammesso** (adulti), il resto (ubriaco, vodka, bere in generale) resta escluso.
- `reports/unsuitable_words.json`: 36 parole NON cancellate ma segnalate come inadatte a principianti (argomento sensibile, gergo, lemmi non standard). Le rifiutate da QA e non citate in `content/` sono state rimosse (vedi sotto).
- Il filtro non e' garanzia assoluta: resta un campionamento QA.

## Correzioni di qa-russian (applicate)
Fonte: `qa/data_fixes.json` (517 voci, snapshot in `scripts/qa_fixes.json`; `scripts/qa_fixes.py` le applica, richiamato da build_words, build_sentences ed enrich, quindi rigenerare riproduce tutto).
- **Parole**: forme dei pronomi personali (paradigmi corretti, chiave extra `after_prep` con le forme con н-), accenti (происходить, среда, пора...), short_f/short_n di собственный, genere/animato mancanti, `plural_only` di ветер, aspetto di бежать, glosse EN, 72 `f_ins` senza parentesi, separatori `//` e `*` ripuliti, `aspect_partner: "-"` eliminati. Gia' applicati anche `pos: phrase` per `кредитная карта` e `ru: "меня зовут"` per `w_zovut` (stress `меня́ зову́т`).
- **Non applicato**: l'accento di `w_vay_fay` (QA: incerto).
- **Rimosse da data/words** (rifiutate da QA e NON citate in `content/`): w_pisat_verb, w_stringi, w_chyom, w_zh, w_bezoblachno, w_getero, w_sidushka, w_chlen. Elenco in `reports/removed_words.json`. Rifiutate da QA ma MANTENUTE perche' citate: w_neskolkie e w_mem non sono piu' citate nelle lezioni (aggiornamento content del 2026-10-25) e vengono rimosse dal rigenerare; `w_vay_fay` e' citata (l_a1_25) e mantenuta.
- **Glosse `it`**: applicate le 58 decisioni (22 correzioni alle esistenti, 36 per le `it_candidates`); `it` ora su 167 parole. Se la glossa viene dalla revisione QA, l'`attribution` lo indica.
- **Translit**: regola `ч/ш/щ` davanti a consonante/ь/fine parola + `i` (`ci/sci/ssci`) in `common.py`, piu' eccezioni per `что`, `чтобы`, `ничто`, `что-то`, `коне́чно`; riproduce esattamente le 41 correzioni proposte.
- **Topics**: ora solo dalle categorie del PRIMO senso Wiktionary (prima contaminate dai sensi secondari: мама era "tecnologia", кошка "abbigliamento"...), `numeri` solo per i numerali, piu' override manuali in `TOPIC_OVERRIDES` (`enrich_wiktextract.py`). 197 parole con topics; le altre sono coperte da `content/curriculum/word_topics.json` (slug del curriculum) tranne poche decine.
- **Frasi**: 145 frasi con nomi propri (Том, Пол, Сами...) scartate (si scarta anche ogni frase con `Том`), 21 rifiutate da QA, 33 delle 34 escluse a torto recuperate (la 34a, s_4440956, contiene un nome proprio), 62 delle 69 frasi con correzione a `it`/`ru` presenti (le altre 7 contengono nomi propri o parole fuori vocabolario) (`s_05565` -> "В чём проблема?" con `w_chto`, che ha ora `prep_sg: чём`); le frasi corrette hanno una nota in `attribution`. Ogni parola delle frasi esiste in `data/words`.

## Script (`scripts/`)
1. `fetch_sources.sh`: scarica OpenRussian (git clone), liste livelli (`fetch_levels.py`), export Tatoeba in `data/raw/` (in `.gitignore`).
2. `build_words.py`: genera `words/*.json`.
3. `build_sentences.py`: genera `sentences/*.json` e aggiorna `examples`. Eseguire sempre dopo `build_words.py`.
4. `subset_wiktextract.py` poi `enrich_wiktextract.py`: arricchimento. 5. `filter_sentences.py`: ricontrollo frasi, report parole inadatte. Ordine: build_words (applica anche i fix QA), build_sentences (filtro + fix QA), subset, enrich, filter_sentences. Rigenerare e' deterministico.
`common.py`: accenti, translit, slug.

## Problemi aperti
- Parole: `it` presente solo per 132 su 814 (Wikizionario); per le altre 682 l'app mostra `en` oppure serve una traduzione del team con QA.
- Dati OpenRussian dal repo GitHub fermi al 2021 (le liste di livello e le traduzioni sono invece correnti).
- Il filtro contenuti e' euristico: campione QA consigliato.
- Qualita' traduzioni Tatoeba variabile (alcune sono libere); QA su un campione.
- Alcune parole B1 poco adatte a "a2" (es. `сидушка`, `мем`) per effetto del mapping.

# Audit linguistico dei dati (data/) - qa-russian

Data: 2026-10-24. Branch `claude/ecstatic-rubin-1ztlio`. Revisore: qa-russian.
Cosa ho toccato: solo `qa/`. I file in `data/` non sono stati modificati. Le correzioni proposte sono in `qa/data_fixes.json` (517 voci) e le applica il lead.

Metodo e limiti (leggere prima):
- Nessun dizionario esterno e' stato consultato (ambiente senza rete utile): le valutazioni si basano sulla mia conoscenza del russo e dell'italiano. Dove non sono sicuro scrivo **incerto** e non approvo.
- Zero e a1: tutte le 322 parole riviste a mano, una per una (accento, genere, animatezza, aspetto, pos, EN, IT, translit). Riviste tutte le `forms` con controlli automatici.
- a2: campione casuale riproducibile di 150 parole su 492 (`random.Random(20261024).sample(range(492),150)`, ordinate) + controlli automatici su tutte le 814 parole. Le altre 342 a2 NON sono state riviste una per una.
- Frasi: campione di 200 (`random.Random(20261025).sample(frasi in ordine zero, a1, a2, 200)`; 7 zero, 31 a1, 162 a2) + lettura di TUTTE le 1786 frasi per traduzione russo/italiano. Gli accenti russi delle frasi sono stati verificati a mano solo sul campione e con controllo automatico di coerenza sul resto (il controllo automatico non e' indipendente: l'accento delle frasi deriva dalle parole).
- Filtro: ricontrollato l'intero `filtered_sentences.json` (236 frasi), non solo il campione di 60 richiesto (60 seed `random.Random(20261026)`).

## 1. Sintesi

| Area | Esito | Gravita' |
|---|---|---|
| Accenti dei lemmi (zero+a1 322 e a2 campione 150) | 0 errori certi; 1 incerto (`вай-фай`) | - |
| Forme flesse (`forms`) | Paradigma di 'он' copiato su 9 pronomi personali; 4 forme errate di accento certe (происходить, среда, собственный scambio f/n, больной comp.) e 3 probabili (пора, голодный, год); valori troncati/spuri in 8 parole | ALTA |
| Nomi propri nelle frasi (Том -> `w_tot`) | 144 frasi (8,1% del corpus) hanno il nome proprio mappato al pronome 'тот' | ALTA |
| Glosse IT inserite (132) | 1 errore grave (`w_pisat_verb`), 4 media, 17 migliorabili | MEDIA |
| it_candidates (36) | tutte decise: 32 accettate/ripulite, 4 scartate e sostituite da glossa manuale (`w_u`, `w_na`, `w_vykhod`, `w_um`) | - |
| Traduzioni IT/RU delle frasi | 91 frasi (5,1%) con almeno un problema oltre al mapping dei nomi; 12 con significato errato/invertito | ALTA/MEDIA |
| Filtro contenuti | Troppo severo: 34 frasi sicuramente innocue escluse; 6 frasi problematiche NON intercettate | MEDIA |
| Parole inadatte (44) | 44 esaminate; confermate da rifiutare 10, incerta 1, falsi positivi 12, decisione editoriale 21; +2 nuove da aggiungere | - |
| Translit | Difetto di regola su ч/ш/щ in coda/prima di consonante: 41 parole | MEDIA/BASSA |

### Problemi piu' gravi (in ordine)
1. **Pronomi personali: `forms` corrotto** (`w_ya`, `w_ty`, `w_on`, `w_ona`, `w_ono`, `w_oni`, `w_vy`, `w_my`, `w_sebya`). Tutti portano il paradigma di 'он' (es. `w_ya.forms.m_nom = "он, on, онъ"`), con latino (`njom`, `jej`), grafia pre-1918 (`онъ`, `нихъ`, `онѣ́`) e note di fonte (`¹ ² ³`). Per `я/ты/мы/вы` e' proprio sbagliato. Sono parole zero: chi usa `forms` per esercizi mostrerebbe errori fin dalla prima lezione. Paradigmi corretti proposti in `data_fixes.json`.
2. **Nomi propri mappati a parole comuni**: 'Том/Тому' -> `w_tot` (144 frasi), 'Пол' -> `w_pol`, 'Сами' -> `w_sam`. Contraddice il README (nomi propri scartati) e fa insegnare 'тот' con frasi che parlano di Tom. Decisione per il lead: (A) togliere `w_tot` da `words`, (B) creare un id nome proprio, (C) scartare le frasi con nomi.
3. **Frasi con traduzione italiana sbagliata/invertita**: `s_8176966` ('Я живу под землёй' -> "Vivo sulla terra!"), `s_5179532` ('Хоть бы дождь пошёл' -> "Se solo smettesse di piovere"), `s_4224575` ('Никак не могу понять' -> "Nessuno riesce"), `s_05565` ('В чём проблема?' -> "Dov'è il problema?" e `ru` senza ё, mappato a `w_chem`), `s_2497338` ('Том снова один' -> "Sei di nuovo solo"), `s_5384716` (idioma sbagliato), `s_2650654`, `s_2772306`, `s_5427153`, `s_3341886`, `s_13338670`, `s_5629864`.
4. **`w_pisat_verb`** ('пи́сать' = fare pipi'): glossa IT 'scrivere' (errata, e' di писа́ть); parola non in `unsuitable_words`. Rifiutare.
5. **Forme flesse con errori di accento** (verificati): `w_proiskhodit` 3sg/2pl, `w_sreda` plurale (dat/ins/prep), `w_sobstvennyy` short_f/short_n scambiati, `w_bolnoy.comp = "больн"` (troncato), `w_pyat.forms` (gen_pl = 'пя'), `w_nachatsya.past_m` con 'нача́лся'.
6. **Plurale tantum spurio**: `w_veter` ha `grammar_tags: ["plural_only"]` (falso) e mancano genere/animato; 6 sostantivi a2 senza genere (`w_bereg`, `w_oruzhie`, `w_pravo`, `w_dyadya`, `w_literatura`, `w_veter`).
7. **Traslitterazione**: ч/ш/щ prima di consonante, ь o fine parola producono 'c/sc/ssc' letti /k/, /sk/, /ssk/ da un italiano ('что' = `ctò` si legge 'kto', identico a 'никто́' = `niktò`, mentre 'ничто́' = `nictò`).

## 2. Tassi di errore per categoria

Metodo di conteggio: un record e' 'con problema' se ha almeno una voce in `data_fixes.json` di quel tipo. Severita': alta = significato/forma errata o contenuto inadatto, media = errore evidente ma non fuorviante, bassa = refuso/cosmesi.

### Parole
| Insieme | Record | Con problema (esclusa translit) | Alta/media (esclusa translit) | Con translit da correggere |
|---|---|---|---|---|
| zero+a1 (rivisti tutti) | 322 | 43 (13,4%) | 15 (4,7%) | 22 |
| a2 campione | 150 | 24 (16,0%) | 5 (3,3%) | 6 |
| Tutte (controlli auto + riviste) | 814 | 121 | 33 | 41 |

Per categoria (parole distinte, 814 totali; il grosso delle 'bassa' sono 50 parentesi in `f_ins`):
| Categoria | Parole | Note |
|---|---|---|
| Accento del lemma | 1 incerto (0 certi) | `вай-фай` ha due accenti; tutti gli altri lemmi coerenti (controllo automatico: `stress` senza segno = solo parole con ё) |
| Forme flesse | 94 | 9 pronomi (alta), 8 con errori di accento/valore (alta/media), ~50 parentesi f_ins, 3 separatori '//' , ~20 altri |
| Genere/animato/pos/aspetto/tag | 12 | 6 sostantivi senza genere, `w_veter` tag falso, `w_kreditnaya_karta` pos, `w_pyat` gender su numerale, `w_bezhat` aspect |
| Glossa EN | 7 | maiuscole spurie (Problem, Weather, State, Credit card), 'difficultly', `w_u`, `w_vremya` |
| Lemma inadatto / non lemma | 11 | vedi sezione 6 |
| Translit | 41 | difetto di regola (sezione 7) |
| Aspetto verbale | 1 errore certo | `w_bezhat` 'both' -> impf; 4 `aspect_partner: "-"` (placeholder) |

### Frasi
| Insieme | Frasi | Con problema (esclusi i nomi) | Alta | Media | Bassa |
|---|---|---|---|---|---|
| Campione 200 | 200 | 16 (8,0%) | 2 | 6 | 8 |
| Tutte (lettura completa) | 1786 | 91 (5,1%) | 12 | 47 | 32 |
| Nomi propri mappati a parole comuni | 146 | 146 (8,2%) | - | - | - |

(12 alta, 47 media, 32 bassa = gravita' massima per frase.) Nel campione di 200: 10 frasi su 200 hanno inoltre il nome proprio (5%). Accenti russi nel campione: 0 errori certi. Traduzione italiana: 13/200 con problemi (6,5%), di cui 3 sostanziali.

Il tasso a2 della traduzione e' piu' alto perche' piu' frasi Tatoeba 'libere'. Zero e a1 sono quasi tutti buoni (principali: `s_05565`, `s_5419267`, `s_5470434`, `s_10180000`, `s_2776233`, accenti su 'sì').

### Glosse IT (132 inserite)
Errori: 1 alta (`w_pisat_verb`), 4 media (`w_vtoroy`, `w_tretiy` (definizione al posto della traduzione), `w_novyy` ('recente'), `w_son` (solo 'sogno')), 17 bassa (sinonimi migliori, lacune di senso). Tasso alta/media: 5/132 = 3,8%; ogni suggerimento: 22/132 = 16,7%. Le altre 110 sono corrette.

## 3. Disaccordi OpenRussian / Wiktionary (31 forme + 2 animato)

Criterio: scelgo la forma che mi risulta standard; se non sono sicuro lo scrivo. Ogni 'fix' e' in `data_fixes.json`.

| Parola | Chiave | OpenRussian (attuale) | Wiktionary | Decisione |
|---|---|---|---|---|
| год | prep_sg | году́ | го́де | Entrambe corrette: в году́ (locativo), о го́де. Mantieni OR e aggiungi го́де. |
| новый | comp | нове́е | но́вее, но́вей | Mantieni нове́е (standard, +нове́й); но́вее non standard. |
| молодой | sup | молодейший | са́мый молодо́й | Aggiungi accento: молоде́йший (rara); forma d'uso la analitica. FIX (bassa). |
| голодный | short_n | голо́дно | го́лодно | Wiktionary. Coerente con го́лоден (m) gia' nel dato. FIX media, **incerto ~85%**. |
| среда | dat_pl | среда́м | сре́дам | Wiktionary ('по сре́дам'). FIX media. |
| среда | ins_pl | среда́ми | сре́дами | Wiktionary. FIX. |
| среда | prep_pl | среда́х | сре́дах | Wiktionary. FIX. |
| пора | acc_sg | пору́ | по́ру | Wiktionary, **probabile**, da verificare (paradigma come ру́ку); FIX media. |
| происходить | presfut_3sg | происходи́т | происхо́дит | Wiktionary. FIX alta. |
| происходить | presfut_2pl | происходи́те | происхо́дите | Wiktionary. FIX alta. |
| сильный | short_m | силён | си́лен | Mantieni OR (си́лен non standard). |
| собственный | short_n | со́бственна | со́бственно | Scambio: n=со́бственно, f=со́бственна (non e' una scelta tra fonti: OR ha n e f invertiti). FIX. |
| собственный | short_f | со́бственно | со́бственна | Vedi sopra. |
| больной | comp | больн | больне́е, больне́й | Valore troncato in OR. Wiktionary. FIX media. |
| пол | nom_pl | полы́ | по́лы | Mantieni OR (полы́ = pavimenti; по́лы = falde, altro lessema). |
| пол | acc_pl | полы́ | по́лы | Mantieni OR. |
| пол | prep_sg | полу́ | по́ле | Mantieni OR (на полу́). Wiktionary e' errata (по́ле = campo). |
| великий | comp | бо́льше;бо́лее | бо́лее вели́кий, бо́льший | Nessuno dei due e' ideale; usare бо́лее вели́кий. FIX bassa. |
| короткий | sup | кратча́йший | са́мый коро́ткий | Mantieni OR (valido); forma analitica come alternativa. |
| длинный | short_n | длинно́ | дли́нно | Mantieni OR (длинно́), дли́нно variante ammessa. |
| крупный | short_pl | кру́пны́ | крупны́, кру́пны | Doppio accento impossibile. FIX bassa -> 'кру́пны, крупны́'. |
| колено | nom_pl | коле́ни | коле́нья | Mantieni OR (ginocchia: коле́ни). коле́нья e' un altro senso (giunture). |
| колено | gen_pl | коле́ней | коле́ньев | Mantieni OR. |
| колено | dat_pl | коле́ням | коле́ньям | Mantieni OR. |
| колено | acc_pl | коле́ни | коле́нья | Mantieni OR. |
| колено | ins_pl | коле́нями | коле́ньями | Mantieni OR. |
| колено | prep_pl | коле́нях | коле́ньях | Mantieni OR. |
| ряд | prep_sg | ряду́ | ря́де | Entrambe: в ряду́, о ря́де. Mantieni OR, aggiungi ря́де. |
| худой | comp | худе́е | ху́же | Mantieni OR (худе́е = piu' magro). ху́же e' il comparativo di 'cattivo'. |
| худой | sup | худе́йший | ху́дший | Mantieni OR (stesso motivo). |
| худой | short_pl | худы́ | ху́ды | Mantieni OR; ху́ды ammessa. |
| лицо | animate | false | true | Mantieni false (senso primario 'viso'; nel senso 'persona' il neutro ha comunque acc=nom). |
| кошка | animate | true | false | Mantieni true (animale). Wiktionary errata. |

Riepilogo: 13 forme da correggere (11 certe: происходить x2, среда x3, собственный x2, больной, крупный, молодой, великий; 2 probabili/incerte: пора, голодный), 18 da mantenere, 2 animato da mantenere.

Altre forme errate trovate fuori dal report (tutte in `data_fixes.json`): `w_pyat` (troncato), `w_nachatsya.past_m` ('нача́лся'), `w_svet` ('*' spurio), `w_khod.acc_pl` ('хода́'), `w_god.nom_pl` ('лета́', incerto sul resto del plurale), `f_ins` con parentesi (50 aggettivi), `//` in `w_nedalyokiy`/`w_udatsya`.

## 4. it_candidates (36): decisioni

Legenda: A = accettata (eventualmente ripulita), S = scartata, sostituita da glossa manuale. Tutte in `data_fixes.json` (kind `it_gloss`, `[it_candidates]`).

| id | Proposta `it` | Esito / motivo |
|---|---|---|
| w_ne | non | A, prima parte; il resto e' una definizione |
| w_u | presso, vicino a | **S**: 'pressoda' (due glosse fuse) e 'usato per esprimere il possesso' non sono traduzioni |
| w_zhit | vivere, abitare | A |
| w_dom | casa | A |
| w_bolshoy | grande, grosso | A |
| w_dver | porta | A |
| w_v | in, a | A ripulita (note di caso tra parentesi) |
| w_na | su, a | **S**: '+ accusativo' / '+ preposizionale' sono solo casi |
| w_raz | volta, occasione | A; scartata 'uno (quando si conta)' |
| w_pervyy | primo | A; scartate 'iniziale', 'migliore' (= лучший) |
| w_gorod | città | A; scartata 'centro di città' |
| w_iskat | cercare | A; scartata 'citare in giudizio' |
| w_sestra | sorella | A; 'infermiera' secondaria, 'suora' arcaico |
| w_dorogoy | caro, costoso | A |
| w_inogda | a volte, talvolta | A |
| w_svobodnyy | libero | A ripulita |
| w_vykhod | uscita | **S**: 'l'atto dell'uscire', 'presentazione', 'rendimento'... sono definizioni o sensi rari |
| w_byt | essere, esistere | A solo le prime due |
| w_mir | mondo, pace | A riordinata (primo senso 'mondo') |
| w_imya | nome | A; scartate 'nomea', 'sostantivo' |
| w_oba | entrambi, ambedue | A ridotta |
| w_ladno | d'accordo, va bene | A; scartata 'elegantemente' (omografo arcaico) |
| w_tochno | esattamente, proprio | A |
| w_yazyk | lingua | A |
| w_storona | lato, direzione | A; scartate 'mano', 'posto', 'regione'; suggerire 'parte' |
| w_bog | dio | A; sensibile |
| w_svet | luce, mondo | A; scartata la terza (troppo lunga) |
| w_um | mente, intelligenza | **S**: tre definizioni lunghe; glossa manuale |
| w_chyornyy | nero | A; scartati i sensi figurati |
| w_ogon | fuoco, fiamma | A; scartata 'arma da fuoco' |
| w_lyogkiy | leggero, facile | A, riordinata |
| w_edva | appena, a malapena | A |
| w_chislo | numero, data | A |
| w_boy | battaglia, scontro | A; sensibile |
| w_sredstvo | mezzo, rimedio | A; scartate le definizioni e 'pl possibilità...' |
| w_khozyain | padrone, proprietario | A; scartati 'marito' (regionale) e 'capofamiglia' |

(In `data_fixes.json` le S sono sempre marcate: `w_u`, `w_na`, `w_vykhod`, `w_um`.) Nessuna candidata 'incerta' dal punto di vista linguistico.

## 5. Frasi Tatoeba: campione e lettura completa

Campione di 200 (riproducibile: `random.Random(20261025).sample(zero+a1+a2, 200)` con le frasi nell'ordine dei file); i 16 con problemi sono: `s_12373137, s_2606597, s_2778788, s_3043020, s_3164924, s_3803856, s_4224575, s_446126, s_5384716, s_5387296, s_5513583, s_5517953, s_5574374, s_5683052, s_6764600, s_6901336`; piu' 10 con il nome proprio (mapping).

Tipi di difetto sull'intero corpus (91 frasi):
- Significato errato/invertito (alta): 12. Es.: 'sotto terra'/'sulla terra', 'smettesse di piovere'/'magari piovesse'.
- Italiano sgrammaticato o con refusi (media/bassa): `sanque`, `E 'diventato`, `Si,` senza accento (4), `un enorme ricchezza`, `dal larghe vedute`, `lo lo`, `Le era seduta`, `Se già arrivato`, `solitamante`, `trovo` per `trovò`, `le una`.
- Discordanza di genere/numero tra RU e IT: `s_2776233` (nato/nata), `s_2651239`, `s_3082214` ('Siete intelligente'), `s_3082213`.
- Registro troppo alto/idiomatico per a2 (rifiuto consigliato): `s_5513583`, `s_2668113` ('Быть по сему'), `s_6905825`, `s_5599422`, `s_446126` (proverbio).
- Frasi poco naturali in russo (calchi dall'inglese): `s_6764600`, `s_6764601`, `s_5910741` ('Приведи/приведу помощь'), `s_1953146` ('Получи жизнь!'), `s_2606846`, `s_2606848`, `s_2606849` (esercizi di grammatica 'Я получу некоторое').
- Contenuto sensibile NON intercettato dal filtro: `s_4785579` (sangue ovunque, con refuso), `s_5629864` (voglio sentirti urlare), `s_3257772` ('Ты собака' = insulto possibile), `s_5465886` ('il futuro è nei cieli'), `s_4000041`/`s_5542544` ('Том пьёт/пил' alcol). Incoerenza con il README: il filtro dichiara di escludere droga/alcol, ma restano 'пиво' e 'вино' nel lessico zero e 6 frasi con birra (`s_3668039`, `s_3052025`, `s_1498708`, `s_5549380`, `s_6882656`, `s_3452565`) e le frasi con 'пить': e' una scelta editoriale da esplicitare.
- Livello: nessuna incoerenza tra livello frase e max livello parole (0 su 1786); `examples` tutti validi; ma 4 frasi con `words` di 1 solo id.
- Duplicati/varianti quasi identiche (gemelli di genere) numerosi (es. `s_1800924`/`s_1801308`, `s_3801849`-`s_3801852`): ok per la grammatica, ma contano 2-3 volte negli esempi.

### Filtro: troppo severo e lacune
Su 236 frasi escluse ne ho riviste tutte: la maggior parte (circa 170-200, a seconda di quanto rigorosa si voglia la politica) e' esclusa giustamente (morte, violenza, religione, 'толстый'). **34 frasi sono falsi positivi sicuri** e vanno recuperate (in `data_fixes.json` con `field: "filter"`, `proposed: "include"`):
- 'Не бойся / Не бойтесь' (6): la radice `бой-` di `бойся` e' stata scambiata per `бой` (battaglia). Frase di grande utilita' didattica.
- 'полиция/полицию/полиции' (17): lessico neutro, utile ('Вызовите полицию!'); w_politsiya e' in a1 ma non e' esempio in nessuna frase.
- 'Расскажите в общих чертах' (`чертах`: scambiato per 'чёрт').
- 'Он молод душой', 'Том молод сердцем', 'В душе я очень добрый' (parola 'anima' dalla traduzione).
- 'Я требую правды' (`prete` come sottostringa di 'Pretendo').
- 'Я плохой человек', 'Он плохой человек', 'Вчера была плохая погода', 'Много хорошего и плохого' ('brutto' nel testo italiano).
- 'Из ничего ничего не бывает' ('combatte' in un proverbio italiano), 'Закон знают все' e simili (politica 'закон').
Cause: regex a sottostringa. Raccomandazione: usare confini di parola e controllare il lemma, non la sottostringa; non filtrare la traduzione italiana per sinonimi comuni ('brutto', 'anima', 'prete').
Restano giustamente escluse: tutte le frasi su morte, uccisioni, armi, religione, 'толстый/толстая' (body shaming), 'член'.

Campione 60 di `filtered_sentences.json` (seed 20261026): circa 43 esclusioni giuste e 17 falsi positivi o discutibili (stima: `чертах`, `anima`, `brutta`, `brutte`, `полиция` x5, 'Кровь красная', 'Президент казался сильным', 'Мы не враги', 'Государство — это я!', 'Теперь это закон', 'Я не твой командир', 'Он стал капитаном', 'Куда идут солдаты?'). Il filtro scarta quindi troppo (~25-30% di falsi positivi nel campione), soprattutto sulla categoria 'politica'.

## 6. Parole inadatte (44): verdetti

Legenda: **R** = confermo, rifiutare/escludere (non per principianti o non e' un lemma); **OK** = falso positivo del filtro, approvare; **ED** = decisione editoriale: linguisticamente corretta, tema sensibile (morte/politica/violenza/religione), consiglio di tenere nel dataset ma non nelle prime lezioni (decide il curriculum-writer); **I** = incerto, non approvare.

| id | Verdetto | Nota |
|---|---|---|
| w_zovut | R (come lemma) | sostituire con la frase 'меня́ зову́т' / legare a звать |
| w_a | OK | congiunzione essenziale, non slang |
| w_politsiya | OK | neutra, utile ('Вызовите полицию') |
| w_nedalyokiy | OK con nota | il senso 'poco intelligente' e' secondario; en[0] corretto; evitare in esercizi su persone |
| w_mem | R | neologismo, non per a1 |
| w_vay_fay | I | accento non confermato (due accenti nel dato); utile per viaggi se corretto |
| w_kreditnaya_karta | R (come lemma) | e' un sintagma; pos phrase |
| w_neskolkie | R | forma rara; esiste gia' w_neskolko |
| w_chyom | R | forma di что; rimappare 8 frasi |
| w_ubit | ED | 'убить' B1; escluderlo dai percorsi iniziali |
| w_umeret | ED | B1 standard |
| w_plan | OK | 'slang' e' errato |
| w_smert | ED | B1 standard |
| w_nikakoy | OK | non slang |
| w_bog | ED | religione; tenere |
| w_voyna | ED | B1 standard |
| w_gospodin | OK | 'signor', non religioso |
| w_prezident | ED/OK | neutro |
| w_oruzhie | ED | B1; non nelle prime lezioni |
| w_zakon | OK | neutro |
| w_vrag | ED | B1; non nelle prime lezioni |
| w_kapitan | OK | neutro |
| w_chlen | R | omonimo volgare, en cita 'penis' |
| w_soldat | ED | neutro |
| w_vlast | ED | neutro |
| w_armiya | ED | neutro |
| w_boy | ED | B1; sensibile |
| w_tolstyy | OK con nota | aggettivo neutro; evitare frasi che lo riferiscano a persone |
| w_voennyy | ED | neutro |
| w_guba | OK | 'labbro', non slang |
| w_partiya | ED | 'partito'/'lotto': ambiguo, ok |
| w_leytenant | ED | militare, raro per principianti |
| w_general | ED | idem |
| w_gosudarstvo | ED | neutro |
| w_politicheskiy | ED | neutro |
| w_gosudarstvennyy | ED | neutro |
| w_cherta | OK | falso positivo ('чёрт') |
| w_komandir | ED | neutro |
| w_sovetskiy | OK/ED | neutro, storico |
| w_klassno | OK con nota | colloquiale ma corrente; marcare come informale |
| w_getero | R | gergo/tema sensibile |
| w_sidushka | R | neologismo di nicchia |
| w_zh | R | enclitica abbreviata |
| w_bezoblachno | R | rara |

Conteggio: R 10 (zovut, mem, kreditnaya_karta, neskolkie, chyom, chlen, getero, sidushka, zh, bezoblachno), I 1 (vay_fay), OK 12, ED 21 (di cui `w_prezident` e `w_sovetskiy` al limite dell'OK).

**Da aggiungere al report (non c'erano):** `w_pisat_verb` ('пи́сать', R), `w_stringi` ('стринги', R). Da valutare come 'non adatte a un principiante' perche' arcaiche/colloquiali: `w_koy` ('кой'), `w_sey` ('сей'), `w_chtob` ('чтоб'), `w_taki`, `w_muzhik` (colloquiale). Non rifiuto, ma andrebbero fuori da a2.

## 7. Translit: difetto di regola (41 parole)

La regola 'ч=c(i), ш=sc(i), щ=ssc(i)' funziona solo prima di vocale. Prima di consonante, ь o fine parola produce stringhe che un italiano legge male:
- `что́` = `ctò` -> 'kto'; `ничто́` = `nictò` vs `никто́` = `niktò` (quasi omografe). Pronuncia reale [što].
- `де́вочка` = `dèvocka` -> 'devokka'; `но́чь` = `nòc` -> 'nok'; `ве́щь` = `vèssc` -> 'vessk'.
Proposte (non applicate): aggiungere 'i' ('ci','sci','ssci') in coda e prima di consonante; forme speciali per что/чтобы/ничто/что-то/потому что (`stò`...), коне́чно (`konèsno`). Il lead puo' preferire un'altra convenzione. 41 voci in `data_fixes.json` (7 media, 34 bassa).
Altre osservazioni sul translit (non in fixes): `ц` = 'z' e' ambiguo (z sorda/sonora); vocale non ridotta per scelta; 'здра́вствуйте' pronunciato 'zdràstvujte' (в muta).

## 8. Raccomandazioni
1. Correggere `forms` dei pronomi personali (alta) o rimuovere `forms` da `pron`.
2. Decidere sui nomi propri e rimappare/rimuovere `w_tot` dalle 144 frasi; togliere questi id dagli `examples` di `w_tot`.
3. Applicare le 12 correzioni di significato alle frasi e rifiutare le 21 frasi indicate; tenere conto che `build_sentences.py` deve rieseguire l'assegnazione di `examples` dopo i rifiuti.
4. Risistemare `filter_sentences.py`: confini di parola, niente match sulla traduzione per termini comuni italiani; aggiungere 'sangue', 'пить' (se l'alcol e' davvero da evitare), `крич*`+'услышать'.
5. Aggiungere un controllo in `build_words.py`: sostantivi senza `gender`; `grammar_tags` `plural_only` solo se manca il singolare; niente '*', '(', '//', latino o caratteri pre-1918 in `forms`.
6. Un secondo passaggio QA sulle 342 parole a2 non riviste (tasso atteso ~3% alta/media: ~10 parole) prima dell'approvazione.
7. Eseguire `node schema/validate.mjs` dopo ogni correzione: i controlli attuali passano (814 parole, 1786 frasi, 0 errori) ma non vedono gli errori sopra.

## 9. Lotti: approvare / rifiutare

### Parole zero + a1 (322)
- **Approvabili senza blocchi**: 306 (tutte tranne i seguenti). Applicare comunque i fix 'bassa'/translit.
- **Approvare dopo correzione (15)**: `w_ya, w_ty, w_on, w_ona, w_ono, w_oni, w_vy, w_my` (forms, alta); `w_pyat` (forms); `w_sreda` (plurale); `w_golodnyy` (incerto, verificare); `w_god` (plurale, incerto); `w_vay_fay` (**incerto, non approvare** finche' accento non verificato); `w_kreditnaya_karta` (pos/EN); `w_zovut` (sostituire con frase).
- **Rifiutare (1)**: `w_mem`.

### Parole a2 (492)
- Campione di 150 (ids sotto): 24 con problemi (esclusa la translit). Alta/media 5: `w_bereg, w_chlen, w_nachatsya, w_oruzhie, w_pora` (da correggere prima di approvare; `w_chlen` da rifiutare); gli altri 19 sono cosmetici (bassa). Rifiutare dal campione: `w_chlen`, `w_zh`. Approvabili: 144 (150 meno i 5 da correggere meno `w_zh`), applicando i fix 'bassa' e la regola translit.
- Fuori campione (342): **NON approvato** (non riesaminato). Rifiutare gia' ora: `w_pisat_verb`, `w_stringi`, `w_getero`, `w_sidushka`, `w_chyom`, `w_neskolkie`, `w_bezoblachno`. Correggere prima: `w_veter`, `w_pravo`, `w_dyadya`, `w_literatura`, `w_sobstvennyy`, `w_bolnoy`, `w_proiskhodit`, `w_pora` (gia' nel campione), `w_sebya`, `w_velikiy`, `w_krupnyy`, `w_molodoy`.
- Ids del campione a2 (150): w_etot, w_svoy, w_dolzhnyy, w_priyti, w_li, w_samyy, w_ni, w_sam, w_vzyat, w_vernutsya, w_nu, w_slyshat, w_davat, w_uvidet, w_rasskazat, w_potomu, w_tut, w_uznat, w_pora, w_cherez, w_poluchit, w_gotovyy, w_ved, w_pomoshch, w_stoyat, w_pravyy, w_konets, w_vid, w_deystvitelno, w_oba, w_sovsem, w_luchshiy, w_tochno, w_sledovat, w_nikakoy, w_vesti, w_nad, w_umet, w_imenno, w_brosit, w_protiv, w_pisat, w_zemlya, w_igra, w_pri, w_utro, w_para, w_svet, w_otvetit, w_dobryy, w_provesti, w_otvet, w_vysokiy, w_zhivoy, w_ravno, w_vstrecha, w_doktor, w_vecher, w_brat_verb, w_uzh, w_smysl, w_srazu, w_chyornyy, w_prinimat, w_zametit, w_son, w_nachinat, w_kompaniya, w_skoryy, w_volos, w_vozmozhnost, w_vstat, w_prostoy, w_otvechat, w_predstavit, w_mysl, w_vyzvat, w_tsel, w_pol, w_rech, w_nachatsya, w_stena, w_ogon, w_prezident, w_okolo, w_sushchestvovat, w_oruzhie, w_otkrytyy, w_zakon, w_lezhat, w_vrag, w_takzhe, w_predlozhit, w_gost, w_zvat, w_nakonets, w_nebolshoy, w_inache, w_podobnyy, w_lyogkiy, w_tsentr, w_forma, w_bumaga, w_pustoy, w_vozdukh, w_chlen, w_dlinnyy, w_prokhodit, w_krichat, w_spina, w_pochuvstvovat, w_dannyy, w_vmesto, w_shag, w_vzglyad, w_sredi, w_dukh, w_dvadtsat, w_edva, w_russkiy, w_geroy, w_prislat, w_libo, w_podnyatsya, w_pokazatsya, w_sled, w_dvizhenie, w_tovarishch, w_tolstyy, w_direktor, w_koleno, w_zal, w_neobkhodimyy, w_bereg, w_khod, w_mimo, w_glava, w_guba, w_pisatel, w_nemets, w_moskva, w_gosudarstvo, w_politicheskiy, w_cherta, w_komandir, w_prezhniy, w_ranniy, w_rossiyskiy, w_zh, w_pora_noun.

### Frasi (1786)
- **Rifiutare (21)**: `s_1953146, s_2606846, s_2606848, s_2606849, s_2668113, s_3043020, s_3257772, s_3898579, s_4000041, s_4785579, s_5384716, s_5465886, s_5501160, s_5513583, s_5542544, s_5599422, s_5629864, s_5910741, s_6764600, s_6764601, s_6905825`.
- **Correggere e poi approvare (70)**: tutte le altre con voce in `data_fixes.json` (kind `sentence`, field `it`/`ru`/`stress`).
- **Nomi propri (146)**: in attesa della decisione del lead (vedi sopra); la traduzione IT/RU delle frasi e' generalmente corretta, il problema e' solo `words`.
- **Recuperare dal filtro (34)**: vedi `data_fixes.json` (`field: "filter"`).
- Le restanti ~1.570 frasi: approvabili (traduzione e naturalezza verificate in lettura; accenti: campione + coerenza automatica).
- Il campione di 200 e' riproducibile con il seed indicato nel metodo; i 16 con problemi sono elencati nella sezione 5.

## 10. Elementi incerti (non approvare finche' non verificati)
- `w_vay_fay`: accento (вай-фа́й vs ва́йфай) e genere.
- `w_pora`: acc_sg `по́ру` (probabile) e plurale in -ам.
- `w_golodnyy`: short_n `го́лодно` (~85%).
- `w_god`: nome del plurale (`го́ды`) e resto del paradigma.
- `w_sreda`: certo (по сре́дам); considero comunque la fonte OR errata.
- `s_3898579` ('Я знаю счёт'): senso non chiaro.
- `s_1953146` ('Получи жизнь!'): naturalezza.
- Parole `w_koy`, `w_sey`, `w_chtob`, `w_taki`, `w_muzhik` (adeguatezza al livello).

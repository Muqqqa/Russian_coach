# Audit linguistico e didattico degli esercizi - qa-russian

Data: 2026-10-25. Branch `claude/ecstatic-rubin-1ztlio`. Modificato solo `qa/`.
Oggetto: `content/exercises/` allo stato del commit 42ebd02: **1904 esercizi** (non 1898: l_a1_18 e l_a1_25 sono stati rigenerati durante l'audit). Tutti gli id citati nei file esistono in questo stato. File prodotti: questo report, `qa/exercises_fixes.json` (array di 216 voci `{id, field, current, proposed, severity, reason}`), `qa/exercises_verdicts.json` (rifiutare / incerto / correggere / approvare).

## Metodo e limiti
- Campione riproducibile: tutti i 218 esercizi di zero 01-06, piu' 1 esercizio per ogni coppia (lezione, tipo) delle altre 44 lezioni, scelto con `random.Random(20261026)` su id ordinati: **438 esercizi** (zero 248, a1 125, a2 65; translate 94, cloze 88, MC 88, dictation 88, match 80). Lista in `exercises_verdicts.json` > `campione`.
- Fuori campione ho comunque letto: tutte le 580 frasi usate come sorgente, tutti i 173 esercizi `gram`, tutte le cloze di frase, tutti gli MC di frasi/parole, le glosse delle 446 parole nuove e il glossario manuale; piu' controlli automatici su tutti i 1904 (accenti, articoli, lettere note, sincronia con `data/`, ambiguita' di distrattori e abbinamenti). NON ho riletto uno a uno match, dettati di parola e translate di parola fuori campione: verificati solo per regola.
- Nessun dizionario esterno: dove non sono certo scrivo **incerto** e non approvo.
- Il normalizzatore dell'app (`src/lib/normalize.ts`) toglie accenti, maiuscole, punteggiatura e ё: le varianti con/senza accento in `accepted` sono ridondanti, non un difetto.

## Sintesi
| Voce | Esito |
|---|---|
| Esercizi con problema alta/media, o da rifiutare/incerto | 156 su 1904 (8,2%); nel campione 56 su 438 (12,8%) |
| Voci in exercises_fixes.json | 216: 13 alta, 108 media, 95 bassa |
| Da rifiutare (`rejected`) | **78** |
| Incerto (non approvare) | **39** |
| Da correggere poi approvare | 39 |
| Approvabili: rivisti a mano / per regole | 382 / 1366 |

Problemi piu' gravi, in ordine:
1. **Risposte italiane errate accettate** (11 esercizi, alta): `la ristorante`, `il notte`, `il madre`, `lo stazione`, `la cane`, `la paese`, `la sole`, `il parete`, `la cuore`, `la sistema` (manca `il sistema`), `una russia`. Causa: `_articles()` in `gen_lib.py` indovina il genere italiano dalla desinenza.
2. **Accento su consonante** `ис́торию` (e_001488; stessa riga in `gen_data.py`, ASPECT_TEMPLATES).
3. **Contenuto inadatto**: `s_1603183` («У неё большая грудь», e_001873 e_001880) sessualizzato: rifiutare. Frasi strane: «Я собака» (e_000988), «Ты мой/моя» (e_001399, e_001424, e_001426), «Где дождь?» (5 esercizi), «Quanto ha/hanno?» per «Сколько ей/им?» (6 esercizi, italiano sbagliato).
4. **Lettere non ancora introdotte** in 25 esercizi di zero 01-04 (es. «Где́ до́м?» in zero_01 richiede Г, Е; «Что́» richiede Ч); in 13 l'allievo deve digitarle.
5. **Livello incoerente**: accordo aggettivo prima di a1_06 (e_000149, e_000157, e_000296, e_000303), genere dei nomi prima di zero_08 (e_000052, e_000087, e_000123, e_000201), futuro perfettivo in zero_11 e a1_20/21; 50 esercizi con tag di lezioni successive.
6. **Famiglia gram/adj da rifiutare** (39 es.): cornice fissa «Э́то ___ вода́ / до́м / вино́ / дома́» produce frasi assurde («Это золотая вода», «Это короткое вино», «Это далёкое вино», «Это прошлые дома»), con «вино» come nome base.
7. **Distrattori/risposte ambigue**: MC con distrattore valido (e_000855 «là» per туда́, e_001677, e_001843, e_001949); 16 cloze con piu' risposte corrette; e_000197 rivela la risposta con l'unico accento acuto.
8. **Cornici scritte a mano**: «Ма́ма на дворе́» (= fuori, non «nel cortile», e_001750); `в среду́` (standard `в сре́ду`, incerto, e_000450); distrattore `де́лаю` con «за́втра» grammaticale.
9. **Italiano non grammaticale nelle frasi**: «Siete padre?», «Siete sporco.», «Siete il prossimo.», «Lui ha parlato» per «сказал», «Sono prima».

## 1. Glossario (manuale + ricavato dalle lezioni)
Riletti 157 manuali, 108 dai dati, 180 dalle lezioni. Nessuna glossa gravemente errata; correzioni proposte:
- `w_tuda` «verso là» -> «là» (anche «laggiu'»): «là» e' distrattore valido in e_000855 (rifiutato).
- `w_dvoe` «in due» -> «due (persone)» (media, 8 esercizi).
- `w_vash` «suo» -> «Suo (cortesia)».
- `w_muzhchina` «uomo»: accettare anche челове́к nell'it->ru.
- `w_dolzhnyy` «tenuto a»: il lemma e' l'aggettivo «должный» (dovuto); «deve» e' должен. Dato da rivedere.
- Migliorabili (bassa): `w_gromkiy`/`w_gromko` «forte» ambiguo (meglio «rumoroso»/«ad alta voce»); `w_tikho` «piano» (meglio «sottovoce»); `w_vkusnyy` primaria «gustoso» -> «buono/saporito»; `w_mimo` «davanti a» non corretto; `w_chem` «di» -> «che/rispetto a»; `w_uchit` -> «imparare, insegnare»; `w_poyti`/`w_idti`/`w_khodit` tutte «andare a piedi»; `w_kafe` accetta «bar» per «caffetteria»; `w_botinok` aggiungere «scarpa».
- `w_zovut` e `w_politsiya` non hanno esercizi: manca «Mi chiamo…» (lacuna didattica).

## 2. Cornici di grammatica (gen_data.py, ~70)
Verificati caso, preposizione, numero, accento di risposte e distrattori: tutte corrette tranne
- `Ма́ма на ___` -> `дворе́` (media): per «nel cortile» serve `во дворе́`.
- `ис́торию` (alta, accento su consonante, 2 righe aspetto).
- `Я́ рабо́таю в ___` -> `среду́`: standard `сре́ду` (incerto).
- ASPECT: `За́втра я́ ___ рабо́ту` ha distrattore `де́лаю` valido; «Мы́ весь ве́чер ___ .» ha spazio prima del punto; hint «storia. - La racconto…» disordinato.
- NEG (6): distrattori quasi tutti grammaticali; si sceglie dalla traduzione, non dalla doppia negazione (bassa).
- L6_MC: `ristarán` unico con accento acuto; notazione grave/acuta mista; «sorde» vs «mute» ambiguo.
- Deboli ma grammaticali: «Он ви́дит го́лову» (e_000971), «До ___ далеко́» (IT «Fino alla citta' e' lontano»).
- LETTERS: etichetta «z dolce» per З sbagliata (in italiano e' /dz/); la З russa e' la s di «rosa». Compare in piu' esercizi.
- Sillabe: `гя`, `хя` non esistono nel russo nativo e `gia` si legge /dʒa/ (bassa).

## 3. Tassi di errore
«Problema» = almeno una voce alta/media, oppure rifiuto/incerto. Campione (438):

| Tipo | n | problemi | % |
|---|---|---|---|
| cloze | 88 | 16 | 18,2 |
| multiple_choice | 88 | 11 | 12,5 |
| dictation | 88 | 10 | 11,4 |
| match | 80 | 9 | 11,2 |
| translate | 94 | 10 | 10,6 |

Livello zero / a1 / a2 (campione): 35/248 (14,1%), 14/125 (11,2%), 7/65 (10,8%).
Intera popolazione (regole + letture complete): cloze 15,6%, MC 8,7%, translate 7,4%, dictation 4,5%, match 4,4%; zero 10,4%, a1 7,4%, a2 7,7%.
Per famiglia (popolazione): gram 24,3% (42/173), read 16,7%, w_read 25%, s_cloze 12,4%, s_it_ru 11,3%, s_pairs 10,8%, s_dict 8,3%, w_ru_it 6,3%, s_ru_it 5,1%, w_it_ru 0,7%, w_dict 0,6%, w_new 0,8%, w_rev 0%, syllable/letter_sound/sound_letter 0%.

## 4. Il translate «lettura» dell'alfabeto (12 es.)
Parere: tipo e prompt non coincidono. «translate» fa pensare a una traduzione, ma l'allievo scrive una trascrizione ad hoc (grave, `zh`, `sc`, `kh`, `ỳ`) con ortografia canonica unica (`ciàj`, non `chai`). L'app toglie gli accenti (`kto` passa) ma `chay` o `shto` no. In zero_06 la stessa parola ha due «letture» (`rossìia` vs `Rassìia`) mentre il prompt dice «come si pronuncia». Digitare accenti da mobile e' scomodo. Il `translit` aveva difetti noti su ч/ш/щ (in parte corretti: `stò`, `nistò`).
Trattamento proposto: (a) convertire i 12 in MC «Come si legge…?» (ne esistono gia' 6) o in match parola-lettura; (b) se resta input libero, generare varianti accettate (ch/c/ci/tch, kh/h/ch, zh/j/z, sh/sc, y/i, ts/z, ia/ya) e dichiarare la convenzione nel prompt; (c) in zero_06 separare «trascrizione di lettura» e «pronuncia reale con riduzione»; (d) al lead: tipo o campo `payload.mode` dedicato invece di abusare di `translate`.

## 5. Difficolta' / livello / est_seconds / grammar_tags
- Difficolta' relativa al livello (zero 1-3, a1 2-4, a2 3-5): d1 solo in zero, d5 solo in a2 (103, di cui 35 gram). Lo stesso tipo varia 1->5 (accordo aggettivo: d1/d2 in zero_05, d4 in a1_18, d5 in a2_07) per il bonus +1 delle lezioni avanzate, non per difficolta' reale. Se la selezione adattiva la usa in assoluto, riscalare.
- est_seconds: 10-45, media 19,4, da formule su lunghezza/coppie; 86 match saturano a 45 s (probabile sottostima). Nessuna incoerenza grave.
- grammar_tags: ogni esercizio eredita **tutti** i tag della lezione (745 esercizi di lessico portano tag di grammatica irrilevanti, es. «Che cosa significa “вчера”?» ha `copula-zero`), sporcando il conteggio errori ricorrenti. 50 esercizi usano tag di lezioni successive (`adjectives-agreement` vs `agreement` di a1_06, `genitive-after-numbers`, `accusative`, `future-perfective`, `gender`): vedi fixes (bassa).

## 6. Regole da correggere per famiglia (gen.py / gen_data.py)
1. `gen_lib._articles`/`gloss_variants`: tabella di genere italiano a mano o niente articoli; mai per nomi propri.
2. `g_adj`: nome scelto per aggettivo da lista semantica (non «вино»); altrimenti rifiutare la famiglia (39 es.).
3. `b_sent_cloze`: scartare se l'IT del hint ha piu' soluzioni (pronomi, m/f «intelligente», извините/простите, мой/свой, Он/Она); evitare IT identiche per frasi diverse (s_1749706/08/10).
4. `b_sent_translate` it_ru: varianti con soggetto espresso (Я, Мы) e ordine alternativo; escludere IT ambigui o idiomatici (Dov'e'?, Sono tra noi, L'orologio segna…); fix IT «Siete + singolare».
5. Lettere note: in zero 01-05 usare solo lettere introdotte; spostare `gender` e `adj` dopo le lezioni che li spiegano.
6. `distract_sentences`: escludere distrattori con ≥2 parole contenuto in comune o sinonimi (e_001677, e_001843).
7. `word_distractors`: non usare come distrattore una glossa traduzione valida (là/verso là).
8. letter cloze: evitare e/э, ц/з, ь; etichetta `s sonora` per З.
9. L6_MC: stessa accentazione per tutte le opzioni.
10. Tag: per tipo di esercizio, non ereditare tutti i tag della lezione.

## 7. Lotti
Vedi `qa/exercises_verdicts.json`: `reject` (78, con motivo), `incerto` (39), `fix_prima_di_approvare` (39), `approve_rivisti` (382, nel campione), `approve_per_regole` (1366, non riesaminati uno a uno: approvabili dopo le correzioni di regola; il lead puo' lasciarli pending se vuole verifica manuale). Le correzioni «bassa» non bloccano l'approvazione.
Correzioni ai dati che sbloccano molti id: IT di `s_5875092/s_5875099`, `s_12783171`, `s_6480750`, `s_5885621/23`, `s_5897084`; rimappare `w_poslat` in `s_1618244/s_2233092`; scartare `s_1603183`.

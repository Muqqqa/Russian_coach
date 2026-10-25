# Audit delle 50 lezioni (content/curriculum) - qa-russian

Data: 2026-10-25. Modificato solo `qa/`. Correzioni proposte in `qa/lessons_fixes.json` (47 voci: 1 alta, 22 media, 24 bassa).

## Metodo e limiti
- Letto per intero il testo di tutte le 50 lezioni (zero 12, a1 25, a2 13; ~86.000 caratteri), con controlli automatici su: accenti nelle parole in grassetto, lettere citate prima di essere introdotte (zero 01-05), ordine di introduzione delle parole negli esempi, id frase `s_...` nei commenti, `new_words`/`review_tags`.
- Esempi liberi (non presenti in `data/sentences`): 68 frasi, tutte controllate (caso, accento, traduzione).
- Le «13 frasi riscritte» dal curriculum-writer non sono identificabili dalla storia git (nessuna sentenza con provenienza diversa da tatoeba): se il lead mi passa gli id le ricontrollo; nel frattempo i 68 esempi liberi coprono le riscritture possibili.
- Nessuna fonte esterna: dove non sono certo scrivo **incerto**.

## Sintesi
| Area | Esito |
|---|---|
| Struttura (new_words esistenti, nessun duplicato tra lezioni, review_tags gia' introdotti) | OK. Unica nota: `w_prostoy` (a1_18), `w_telefon`, `w_sistema` (a1_25) sono di livello a2 |
| Alfabeto: 33 lettere distribuite 8+7+7+6+5 | corretto |
| Errori certi di contenuto | 1 alta, 22 media (vedi sotto) |
| Id frase non piu' esistenti nei commenti | 4 (`s_7433914`, `s_796489`, `s_643972`, `s_3543631`) |
| Lettere/parole usate prima dell'introduzione | zero_01 (Ч, Г, Е), zero_02 (Г, Е), zero_03 (Ы in «ты»), zero_04 (Й in «ча́й») |

## Problemi piu' gravi
1. **l_zero_03: «З з | z dolce | rosa, zero»** (alta). In italiano la «z dolce» e' /dz/ (zero), mentre la З russa e' /z/ come la s di «rosa». Gli esercizi sono gia' stati corretti in «s sonora (come in rosa)»: la lezione deve allinearsi (e `gen_data.LETTERS`).
2. **w_chay in l_zero_04 contiene Й**, introdotta in zero_05 (anche gli esercizi di lettura/dettato di ча́й sono in zero_04). Proposta: spostare `w_chay` in zero_05 oppure aggiungere una nota «й: suono breve i, la vedrai nella prossima lezione». Stesso tipo di problema in zero_01 («Что́ э́то?», «Где́ до́м?» con Ч, Г, Е), zero_02 («Где́ они́?») e zero_03 («Где́ ты́?»).
3. **«в среду́» / «в сре́ду»** (l_a1_01): la lezione usa `В среду́ я́ свобо́дна` ma nel «Trucco» subito sotto scrive `в сре́ду (v srèdu)`: incoerenza certa. La forma normativa e' `в сре́ду` (stress sul tema, come ру́ку, но́гу); sono ~85% sicuro, quindi **incerto**: verificare anche `w_sreda.forms.acc_sg` (ha `среду́`) e la frase `s_6712593`. Esercizi coinvolti: e_000450, e_001114, e_001904, e_002058 (incerto).
4. **l_zero_07, `здра́вствуйте`**: «la в iniziale non si sente» e' sbagliato (la lettera iniziale e' з; la в muta e' la prima di «-вств-»).
5. **l_zero_07 e gli esercizi su «Меня́ зову́т»**: gli esercizi nuovi usano `Тебя́/Его́/Её зову́т`, mai spiegati nella lezione. Aggiungere le tre forme o toglierle dagli esercizi.
6. **l_a2_02, `до́лжный`** presentato come «devo»: il significato «deve» e' della forma breve `до́лжен/должна́/должно́/должны́`; `должный` (dovuto) e' un altro aggettivo. Incide su e_001433 (it->ru «dovuto» -> до́лжный).
7. **l_a2_11, `на́д`** indicato come preposizione a due casi: regge solo lo strumentale.
8. **l_a2_04, coppia «ходи́ть / пойти́»** presentata come coppia aspettuale: non lo e'.
9. **l_a2_05, `попроси́ть`** tra i verbi col dativo: non regge il dativo.
10. **l_zero_11, elenco terminazioni**: «-ют/-ут» ma la tabella ha «говоря́т» (-ят/-ат non citata).
11. **Refusi visibili**: `Он' рабо́тает врачо́м` (a2_06), `холо'дный → хо'лодно` (a1_07), `solo..` (a1_02), `senza orologio..` (a1_15).
12. **Traduzioni italiane non allineate ai dati corretti**: «Lui ha parlato» per `О́н сказа́л` (a1_21), «Siete il prossimo» (a1_24), «Sono nella macchina» (a1_08, a1_20), `учи́ть` = «studiare» (a1_10) contro «imparare» del glossario, `дво́е` = «in due» (a2_12).

## Esempi e frasi
- Ancora presenti nel testo ma tolte dai dati/esercizi: «Жи́ли мы́ тру́дно» (zero_10), dialogo «Кото́рый ча́с?» (a1_02), «Где́ до́ждь?» (a1_17), «Уже́ сплю́ давно́» (a2_09). Vanno eliminati insieme agli id nei commenti.
- Deboli ma non errati: «Я́ ко́шка» (a1_14), «Я́ зна́ю счёт» (a1_13), «Широ́кая у́лица» senza traduzione.
- Ordine di introduzione: ~70 esempi usano parole di lezioni successive (es. zero_09 сын/отец/стол, zero_10 хочу, a1_02 час, a1_03 снег, a1_06 еда/собака, a1_12 вот/как): accettabile come anticipazione solo se segnalato; consiglio una nota «(vedi lezione X)».

## Accenti e trascrizioni
- Accenti nelle parole in grassetto: nessun accento su consonante o doppio; mancanti solo `ждут`, `у нас/вас/них` e monosillabi (convenzione disomogenea).
- Convenzione della trascrizione: «sci/ci» davanti a consonante (`kòsciki`, `dèvuscika`, `ciàscika`) aggiunge una sillaba che l'italiano legge ma il russo no; incoerenze puntuali: `nicitò` vs `nistò` (a1_19), `Konècino` vs `konèsno` (a1_23), `net` vs `nèt` (zero_03/10/12), `ristarán` (acuto) in zero_06.
- Grammatica verificata e corretta: tabelle di caso (prepositivo, accusativo, genitivo, dativo, strumentale), plurali, coniugazioni (-ать, -ить, irregolari: ждать, искать, пить, есть, мочь, жить), passato, comparativi, numeri con genitivo, colori e regola ортографica г/к/х/ж/ш/ч/щ + и.

## Coerenza con gli esercizi
- Lezioni zero_05, zero_09, a1_06 e seguenti: gli esercizi di accordo dell'aggettivo (e_000149, e_000157, e_000296) risultano gia' rejected; verificare che `tags` (`agreement` in a1_06, `adjectives-agreement` solo in a2_07) siano coerenti (vedi `qa/exercises_batch3.json`).
- zero_07: vedi punto 5.

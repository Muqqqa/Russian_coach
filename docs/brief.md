# Russian Coach: brief di sviluppo

## Obiettivo
App web per imparare il russo partendo da zero, con lezioni giornaliere adattive. Interfaccia in italiano; il russo compare solo nei contenuti didattici (con trascrizione e accento tonico segnato).

## Decisione chiave: nessuna API a runtime
I contenuti non vengono generati mentre l'utente usa l'app. Il team di agenti li produce **prima**, in Claude Code (token dell'abbonamento), e li distribuisce come dati statici. L'app funziona senza backend AI e senza costi per lezione.

## Funzionalità v1
- Test d'ingresso adattivo (10-15 domande) che assegna il livello (Zero, A1, A2, B1, B2). Scelta manuale possibile.
- Lezione del giorno composta dal banco di esercizi, scegliendo in base a: errori ricorrenti, ripetizione dilazionata (SRS) del lessico, tempo disponibile (15/30/45 min). Adattività algoritmica, senza AI.
- Esercizi: traduzione, completamento, scelta multipla, abbinamento parola-traduzione, dettato.
- Audio: sintesi vocale del browser (Web Speech API, gratuita). Avvisare se la voce russa non è installata; il dettato è opzionale.
- Streak e obiettivo settimanale.
- Progressi nel browser con esportazione/importazione. Login con sincronizzazione solo come estensione successiva.

## Fuori dalla v1
Conversazione con tutor AI e correzione di risposte libere (richiedono API), promemoria via mail, pacchetti a tema (Dota, scacchi).

## Fonti dati da scaricare (verificare le licenze prima dell'uso)
- OpenRussian: parole con accento, declinazioni, coniugazioni.
- Wiktionary tramite Wiktextract.
- Tatoeba: frasi d'esempio con traduzione.
Rispettare l'attribuzione richiesta dalle licenze Creative Commons.

## Stack
Next.js + TypeScript, sito statico/PWA, nessun backend obbligatorio.

## Team di agenti (richiede CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1, già in .claude/settings.json)
| Teammate | Corsia |
|---|---|
| data-curator | Scarica, pulisce e unifica vocabolario, regole e frasi |
| curriculum-writer | Scrive percorso e lezioni in italiano per livello |
| exercise-generator | Crea il banco di esercizi etichettato per argomento e difficoltà |
| qa-russian | Controlla la correttezza linguistica di tutto il contenuto |
| app-builder | Sito, test d'ingresso, SRS, adattività, streak |

## Ordine di lavoro
1. Il lead definisce il contratto dati (formato JSON di parola, lezione ed esercizio) e lo fa approvare.
2. Parte la sola data-curator per verificare fonti e licenze.
3. Poi curriculum, esercizi e QA, e in parallelo l'app-builder sul contratto dati.
4. Un solo proprietario per cartella; piano da approvare prima di scrivere codice.

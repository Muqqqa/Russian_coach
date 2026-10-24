# Contratto dati (v1)

Definisce il formato di parole, frasi, lezioni, esercizi e stato utente.
Fonte di verità: `types.ts`. Validatore: `validate.mjs` (senza dipendenze).

```
node schema/validate.mjs word data/words
node schema/validate.mjs sentence data/sentences
node schema/validate.mjs lesson content/curriculum
node schema/validate.mjs exercise content/exercises
```

Regole comuni
- Ogni file `.json` contiene un array di record.
- Livelli: `zero`, `a1`, `a2`, `b1`, `b2`.
- Parole: `en` obbligatorio (dalle fonti), `it` facoltativo; l'app mostra `it` se c'è, altrimenti `en`. Frasi: `it` obbligatorio (da Tatoeba).
- Il russo ha sempre l'accento tonico (U+0301) nei campi `stress`.
- Ogni record derivato da fonti esterne conserva `source`, `license`, `attribution`.
- Solo esercizi con `qa_status: "approved"` arrivano all'utente.
- Gli ID sono stabili: non vanno mai rinominati dopo la pubblicazione.
- Modificare il contratto richiede approvazione dell'utente e aumento di `SCHEMA_VERSION`.

Esempi in `examples/`.

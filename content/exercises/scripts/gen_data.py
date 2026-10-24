# Dati scritti a mano per il generatore: lettere dell'alfabeto, modelli grammaticali, esercizi fissi.
# Tutte le parole citate (id) devono esistere in data/words: lo verifica check.py.

# lezione -> [(maiuscola, minuscola, suono, esempio italiano)]
LETTERS = {
    "l_zero_01": [("А", "а", "a", "casa"), ("О", "о", "o", "sole"), ("К", "к", "k", "casa"), ("М", "м", "m", "mamma"),
                  ("Т", "т", "t", "tavolo"), ("Э", "э", "e aperta", "è"), ("Д", "д", "d", "dado"), ("С", "с", "s sorda", "sole")],
    "l_zero_02": [("Н", "н", "n", "notte"), ("В", "в", "v", "vino"), ("Р", "р", "r", "rosa"), ("У", "у", "u", "luna"),
                  ("И", "и", "i", "vino"), ("П", "п", "p", "pane"), ("Б", "б", "b", "bello")],
    "l_zero_03": [("Е", "е", "ie", "ieri"), ("Я", "я", "ia", "iato"), ("Л", "л", "l", "luna"), ("Г", "г", "g dura", "gatto"),
                  ("Ф", "ф", "f", "fiore"), ("З", "з", "z dolce", "rosa"), ("Х", "х", "kh", "Bach")],
    "l_zero_04": [("Ж", "ж", "zh", "jour"), ("Ш", "ш", "sc", "scia"), ("Ч", "ч", "c dolce", "ciao"),
                  ("Щ", "щ", "ssc", "pesce"), ("Ц", "ц", "z sorda", "pizza"), ("Ё", "ё", "io", "iodio")],
    "l_zero_05": [("Ы", "ы", "y (i all'indietro)", ""), ("Й", "й", "j (i breve)", "mai"), ("Ю", "ю", "iu", "più"),
                  ("Ь", "ь", "segno debole (nessun suono)", ""), ("Ъ", "ъ", "segno duro (nessun suono)", "")],
}
# lettere latine che ingannano
LOOKALIKE = {"Н": "h", "В": "b", "Р": "p", "У": "y", "С": "c", "Х": "x", "Ы": "bl"}
# trascrizione latina semplice per sillabe
LAT_C = {"К": "k", "М": "m", "Т": "t", "Д": "d", "С": "s", "Н": "n", "В": "v", "Р": "r", "П": "p", "Б": "b",
         "Л": "l", "Ф": "f", "Г": "g", "Х": "kh"}
LAT_V = {"А": "a", "О": "o", "Э": "e", "У": "u", "И": "i", "Е": "ie", "Я": "ia"}
SYL_CONS = {"l_zero_01": "КМТДС", "l_zero_02": "НВРПБ", "l_zero_03": "ЛГФХ"}
SYL_VOW = {"l_zero_01": "АОЭ", "l_zero_02": "УИ", "l_zero_03": "ЕЯ"}

# modelli: (lezione, cornice con ___, id parola, chiave forma corretta, chiavi distrattori, traduzione, istruzione)
P_IN = "Scegli la forma giusta (stato in luogo: dove?)."
P_ACC = "Scegli la forma giusta (complemento oggetto)."
CASE_TEMPLATES = [
    ("l_a1_01", "Я́ рабо́таю в ___.", "w_sreda", "acc_sg", ["nom_sg", "gen_sg", "prep_sg", "ins_sg"], "Lavoro il mercoledì.", "Scegli la forma giusta (in che giorno?)."),
    ("l_a1_01", "Мы́ рабо́таем в ___.", "w_pyatnitsa", "acc_sg", ["nom_sg", "gen_sg", "prep_sg", "ins_sg"], "Lavoriamo il venerdì.", "Scegli la forma giusta (in che giorno?)."),
    ("l_a1_01", "Он спи́т в ___.", "w_subbota", "acc_sg", ["nom_sg", "gen_sg", "prep_sg", "ins_sg"], "Lui dorme il sabato.", "Scegli la forma giusta (in che giorno?)."),
    ("l_a1_08", "Я́ в ___.", "w_gorod", "prep_sg", ["nom_sg", "gen_sg", "acc_sg", "ins_sg"], "Sono in città.", P_IN),
    ("l_a1_08", "Мы́ в ___.", "w_komnata", "prep_sg", ["nom_sg", "gen_sg", "acc_sg", "ins_sg"], "Siamo in camera.", P_IN),
    ("l_a1_08", "Она́ в ___.", "w_derevnya", "prep_sg", ["nom_sg", "gen_sg", "acc_sg", "ins_sg"], "Lei è in campagna.", P_IN),
    ("l_a1_08", "Он на ___.", "w_ulitsa", "prep_sg", ["nom_sg", "gen_sg", "acc_sg", "ins_sg"], "Lui è in strada.", P_IN),
    ("l_a1_08", "Мы́ на ___.", "w_stantsiya", "prep_sg", ["nom_sg", "gen_sg", "acc_sg", "ins_sg"], "Siamo alla stazione.", P_IN),
    ("l_a1_08", "Вино́ на ___.", "w_stol", "prep_sg", ["nom_sg", "gen_sg", "dat_sg", "ins_sg"], "Il vino è sul tavolo.", P_IN),
    ("l_a1_08", "Они́ в ___.", "w_restoran", "prep_sg", ["nom_sg", "gen_sg", "dat_sg", "ins_sg"], "Sono al ristorante.", P_IN),
    ("l_a1_08", "Я́ в ___.", "w_gostinitsa", "prep_sg", ["nom_sg", "gen_sg", "acc_sg", "ins_sg"], "Sono in albergo.", P_IN),
    ("l_a1_13", "Я́ ищу́ ___.", "w_kurtka", "acc_sg", ["nom_sg", "gen_sg", "dat_sg", "ins_sg"], "Cerco una giacca.", P_ACC),
    ("l_a1_13", "Я́ зна́ю ___.", "w_problema", "acc_sg", ["nom_sg", "gen_sg", "dat_sg", "ins_sg"], "Conosco il problema.", P_ACC),
    ("l_a1_13", "Мы́ и́щем ___.", "w_kurtka", "acc_sg", ["nom_sg", "gen_sg", "dat_sg", "ins_sg"], "Cerchiamo la giacca.", P_ACC),
    ("l_a1_13", "Я́ люблю́ ___.", "w_mama", "acc_sg", ["nom_sg", "gen_sg", "dat_sg", "ins_sg"], "Amo la mamma.", P_ACC),
    ("l_a1_14", "Я́ ви́жу ___.", "w_koshka", "acc_sg", ["nom_sg", "gen_sg", "dat_sg", "ins_sg"], "Vedo una gatta.", P_ACC),
    ("l_a1_14", "Мы́ ви́дим ___.", "w_sobaka", "acc_sg", ["nom_sg", "gen_sg", "dat_sg", "ins_sg"], "Vediamo il cane.", P_ACC),
    ("l_a1_14", "Она́ лю́бит ___.", "w_sobaka", "acc_sg", ["nom_sg", "gen_sg", "dat_sg", "ins_sg"], "Lei ama il cane.", P_ACC),
    ("l_a1_14", "Я́ ви́жу ___.", "w_brat", "acc_sg", ["nom_sg", "dat_sg", "ins_sg", "prep_sg"], "Vedo mio fratello.", P_ACC),
    ("l_a1_14", "Я́ ви́жу ___.", "w_ruka", "acc_sg", ["nom_sg", "gen_sg", "dat_sg", "ins_sg"], "Vedo la mano.", P_ACC),
    ("l_a1_14", "Он ви́дит ___.", "w_golova", "acc_sg", ["nom_sg", "gen_sg", "dat_sg", "ins_sg"], "Lui vede la testa.", P_ACC),
    ("l_zero_12", "У ___ е́сть до́м.", "w_mama", "gen_sg", ["nom_sg", "dat_sg", "acc_sg", "ins_sg"], "La mamma ha una casa.", "Scegli la forma giusta (dopo «у»)."),
    ("l_zero_12", "У ___ е́сть вино́.", "w_brat", "gen_sg", ["nom_sg", "dat_sg", "acc_sg", "ins_sg"], "Mio fratello ha del vino.", "Scegli la forma giusta (dopo «у»)."),
    ("l_zero_12", "У ___ е́сть ко́фе.", "w_zhena", "gen_sg", ["nom_sg", "dat_sg", "acc_sg", "ins_sg"], "Mia moglie ha del caffè.", "Scegli la forma giusta (dopo «у»)."),
    ("l_a1_15", "Э́то для ___.", "w_mama", "gen_sg", ["nom_sg", "dat_sg", "acc_sg", "ins_sg"], "Questo è per la mamma.", "Scegli la forma giusta (dopo «для»)."),
    ("l_a1_15", "Э́то для ___.", "w_sestra", "gen_sg", ["nom_sg", "dat_sg", "acc_sg", "ins_sg"], "Questo è per mia sorella.", "Scegli la forma giusta (dopo «для»)."),
    ("l_a1_15", "Я́ из ___.", "w_rossiya", "gen_sg", ["nom_sg", "dat_sg", "acc_sg", "ins_sg"], "Vengo dalla Russia.", "Scegli la forma giusta (dopo «из»)."),
    ("l_a1_15", "Мы́ из ___.", "w_derevnya", "gen_sg", ["nom_sg", "dat_sg", "acc_sg", "ins_sg"], "Veniamo dal villaggio.", "Scegli la forma giusta (dopo «из»)."),
    ("l_a1_15", "Он из ___.", "w_gorod", "gen_sg", ["nom_sg", "dat_sg", "prep_sg", "ins_sg"], "Lui viene dalla città.", "Scegli la forma giusta (dopo «из»)."),
    ("l_a1_15", "До ___ далеко́.", "w_gorod", "gen_sg", ["nom_sg", "dat_sg", "prep_sg", "ins_sg"], "Fino alla città è lontano.", "Scegli la forma giusta (dopo «до»)."),
    ("l_a1_20", "Я́ е́ду на ___.", "w_avtobus", "prep_sg", ["nom_sg", "gen_sg", "dat_sg", "ins_sg"], "Vado in autobus.", "Scegli la forma giusta (con quale mezzo?)."),
    ("l_a1_20", "Мы́ е́дем на ___.", "w_mashina", "prep_sg", ["nom_sg", "gen_sg", "acc_sg", "ins_sg"], "Andiamo in macchina.", "Scegli la forma giusta (con quale mezzo?)."),
    ("l_a1_20", "Она́ е́дет на ___.", "w_avtobus", "prep_sg", ["nom_sg", "gen_sg", "dat_sg", "ins_sg"], "Lei va in autobus.", "Scegli la forma giusta (con quale mezzo?)."),
    ("l_a2_05", "Он даёт ___ ча́й.", "w_mama", "dat_sg", ["nom_sg", "gen_sg", "acc_sg", "ins_sg"], "Lui dà il tè alla mamma.", "Scegli la forma giusta (a chi?)."),
    ("l_a2_05", "Она́ даёт ___ ко́фе.", "w_brat", "dat_sg", ["nom_sg", "gen_sg", "acc_sg", "ins_sg"], "Lei dà il caffè al fratello.", "Scegli la forma giusta (a chi?)."),
    ("l_a2_05", "Я́ покажу́ ___ го́род.", "w_sestra", "dat_sg", ["nom_sg", "gen_sg", "acc_sg", "ins_sg"], "Mostrerò la città a mia sorella.", "Scegli la forma giusta (a chi?)."),
    ("l_a2_05", "Я́ объясню́ ___ сло́во.", "w_syn", "dat_sg", ["nom_sg", "gen_sg", "acc_sg", "ins_sg"], "Spiegherò la parola a mio figlio.", "Scegli la forma giusta (a chi?)."),
    ("l_a2_05", "Мы́ даём ___ во́ду.", "w_zhena", "dat_sg", ["nom_sg", "gen_sg", "acc_sg", "ins_sg"], "Diamo l'acqua a mia moglie.", "Scegli la forma giusta (a chi?)."),
    ("l_a2_06", "Я́ рабо́таю ___.", "w_vrach", "ins_sg", ["nom_sg", "gen_sg", "dat_sg", "prep_sg"], "Lavoro come medico.", "Scegli la forma giusta (come chi?)."),
    ("l_a2_06", "Он рабо́тает ___.", "w_direktor", "ins_sg", ["nom_sg", "gen_sg", "dat_sg", "prep_sg"], "Lui lavora come direttore.", "Scegli la forma giusta (come chi?)."),
    ("l_a2_06", "Я́ иду́ с ___.", "w_brat", "ins_sg", ["nom_sg", "gen_sg", "dat_sg", "prep_sg"], "Vado con mio fratello.", "Scegli la forma giusta (con chi?)."),
    ("l_a2_06", "Мы́ идём с ___.", "w_sestra", "ins_sg", ["nom_sg", "gen_sg", "dat_sg", "prep_sg"], "Andiamo con mia sorella.", "Scegli la forma giusta (con chi?)."),
    ("l_a2_06", "Она́ идёт с ___.", "w_drug", "ins_sg", ["nom_sg", "gen_sg", "dat_sg", "prep_sg"], "Lei va con un amico.", "Scegli la forma giusta (con chi?)."),
    ("l_a2_06", "Он идёт с ___.", "w_podruga", "ins_sg", ["nom_sg", "gen_sg", "dat_sg", "prep_sg"], "Lui va con un'amica.", "Scegli la forma giusta (con chi?)."),
    ("l_a2_10", "Я́ в ___.", "w_kvartira", "prep_sg", ["nom_sg", "gen_sg", "acc_sg", "ins_sg"], "Sono in appartamento.", P_IN),
    ("l_a2_10", "Мы́ в ___.", "w_shkola", "prep_sg", ["nom_sg", "gen_sg", "acc_sg", "ins_sg"], "Siamo a scuola.", P_IN),
    ("l_a2_10", "Он в ___.", "w_kabinet", "prep_sg", ["nom_sg", "gen_sg", "dat_sg", "ins_sg"], "Lui è nello studio.", P_IN),
    ("l_a2_10", "Они́ в ___.", "w_zal", "prep_sg", ["nom_sg", "gen_sg", "dat_sg", "ins_sg"], "Sono nella sala.", P_IN),
    ("l_a2_10", "Мы́ в ___.", "w_koridor", "prep_sg", ["nom_sg", "gen_sg", "dat_sg", "ins_sg"], "Siamo nel corridoio.", P_IN),
    ("l_a2_10", "Ко́шка на ___.", "w_pol", "prep_sg", ["nom_sg", "gen_sg", "dat_sg", "ins_sg"], "Il gatto è sul pavimento.", P_IN),
    ("l_a2_10", "Ма́ма на ___.", "w_dvor", "prep_sg", ["nom_sg", "gen_sg", "dat_sg", "ins_sg"], "La mamma è nel cortile.", P_IN),
    ("l_a2_11", "Ко́шка под ___.", "w_stol", "ins_sg", ["nom_sg", "gen_sg", "dat_sg", "prep_sg"], "Il gatto è sotto il tavolo.", "Scegli la forma giusta (posizione: dove?)."),
    ("l_a2_11", "Соба́ка за ___.", "w_dom", "ins_sg", ["nom_sg", "gen_sg", "dat_sg", "prep_sg"], "Il cane è dietro la casa.", "Scegli la forma giusta (posizione: dove?)."),
    ("l_a2_11", "Маши́на пе́ред ___.", "w_dom", "ins_sg", ["nom_sg", "gen_sg", "dat_sg", "prep_sg"], "L'auto è davanti alla casa.", "Scegli la forma giusta (posizione: dove?)."),
    ("l_a2_11", "Соба́ка о́коло ___.", "w_dom", "gen_sg", ["nom_sg", "dat_sg", "ins_sg", "prep_sg"], "Il cane è vicino alla casa.", "Scegli la forma giusta (dopo «о́коло»)."),
    ("l_a2_11", "Ко́шка во́зле ___.", "w_krovat", "gen_sg", ["nom_sg", "dat_sg", "ins_sg", "prep_sg"], "Il gatto è vicino al letto.", "Scegli la forma giusta (dopo «во́зле»)."),
    ("l_a2_11", "Ко́шка пе́ред ___.", "w_stul", "ins_sg", ["nom_sg", "gen_sg", "dat_sg", "prep_sg"], "Il gatto è davanti alla sedia.", "Scegli la forma giusta (posizione: dove?)."),
]

# numeri + nome: (lezione, numero, id nome, chiave, traduzione)
NUM_TEMPLATES = [
    ("l_a1_02", "оди́н", "w_chas", "nom_sg", "un'ora"), ("l_a1_02", "два́", "w_chas", "gen_sg", "due ore"),
    ("l_a1_02", "три́", "w_minuta", "gen_sg", "tre minuti"), ("l_a1_02", "четы́ре", "w_sekunda", "gen_sg", "quattro secondi"),
    ("l_a1_02", "пя́ть", "w_minuta", "gen_pl", "cinque minuti"), ("l_a1_02", "ше́сть", "w_chas", "gen_pl", "sei ore"),
    ("l_a1_03", "два́", "w_den", "gen_sg", "due giorni"), ("l_a1_03", "пя́ть", "w_den", "gen_pl", "cinque giorni"),
    ("l_a1_03", "три́", "w_nedelya", "gen_sg", "tre settimane"), ("l_a1_03", "пя́ть", "w_nedelya", "gen_pl", "cinque settimane"),
    ("l_a1_03", "два́", "w_mesyats", "gen_sg", "due mesi"), ("l_a1_03", "пя́ть", "w_mesyats", "gen_pl", "cinque mesi"),
    ("l_a1_03", "два́дцать", "w_minuta", "gen_pl", "venti minuti"), ("l_a1_03", "де́сять", "w_sekunda", "gen_pl", "dieci secondi"),
    ("l_a2_12", "два́", "w_rubl", "gen_sg", "due rubli"), ("l_a2_12", "пя́ть", "w_rubl", "gen_pl", "cinque rubli"),
    ("l_a2_12", "сто́", "w_rubl", "gen_pl", "cento rubli"), ("l_a2_12", "два́дцать", "w_chas", "gen_pl", "venti ore"),
    ("l_a2_12", "два́", "w_god", "gen_sg", "due anni"), ("l_a2_12", "де́сять", "w_god", "gen_pl", "dieci anni"),
]
# due/due (m/f): (cornice, risposta, traduzione, id nome)
DUE_TEMPLATES = [
    ("___ мину́ты", "две́", "due minuti", "w_minuta"), ("___ часа́", "два́", "due ore", "w_chas"),
    ("___ неде́ли", "две́", "due settimane", "w_nedelya"), ("___ ме́сяца", "два́", "due mesi", "w_mesyats"),
    ("___ секу́нды", "две́", "due secondi", "w_sekunda"),
]

# negazione doppia (a1_19): (cornice, risposta, distrattori, traduzione, parole)
NEG_TEMPLATES = [
    ("Я́ ___ не зна́ю.", "ничего́", ["что́-то", "ничто́", "никто́"], "Non so niente.", ["w_nichego", "w_znat"]),
    ("Он ___ не говори́т.", "никогда́", ["всегда́", "иногда́", "нигде́"], "Lui non parla mai.", ["w_nikogda", "w_govorit"]),
    ("___ не зна́ет.", "Никто́", ["Кто́-то", "Ничто́", "Никогда́"], "Nessuno sa.", ["w_nikto", "w_znat"]),
    ("Я́ ___ не живу́.", "нигде́", ["везде́", "никогда́", "где́-то"], "Non vivo da nessuna parte.", ["w_nigde", "w_zhit"]),
    ("Он ___ рабо́тает.", "всегда́", ["никогда́", "иногда́", "нигде́"], "Lui lavora sempre.", ["w_vsegda", "w_rabotat"]),
    ("Мы́ ___ не понима́ем.", "ничего́", ["что́-то", "ничто́", "кто́-то"], "Non capiamo niente.", ["w_nichego", "w_ponimat"]),
]

# aspetto (a2_03): (cornice, risposta, distrattori, traduzione, parole)
ASPECT_TEMPLATES = [
    ("Вчера́ я́ ___ те́кст. (L'ho scritto per intero.)", "написа́л", ["писа́л", "пишу́", "напишу́"], "Ieri ho scritto il testo (completato).", ["w_napisat", "w_pisat"]),
    ("Вчера́ я́ весь ве́чер ___ те́кст. (Ci ho lavorato a lungo.)", "писа́л", ["написа́л", "пишу́", "напишу́"], "Ieri ho scritto il testo tutta la sera.", ["w_pisat", "w_napisat"]),
    ("Я́ уже́ ___ рабо́ту. (Ho finito.)", "сде́лал", ["де́лал", "де́лаю", "сде́лаю"], "Ho già fatto il lavoro.", ["w_sdelat", "w_delat"]),
    ("Вчера́ он до́лго ___ рабо́ту. (Processo lungo.)", "де́лал", ["сде́лал", "де́лает", "сде́лает"], "Ieri ha fatto il lavoro a lungo.", ["w_delat", "w_sdelat"]),
    ("За́втра я́ ___ рабо́ту. (La finirò.)", "сде́лаю", ["де́лал", "сде́лал", "де́лаю"], "Domani farò (finirò) il lavoro.", ["w_sdelat", "w_delat"]),
    ("Он ___ на вопро́с. (Ha dato la risposta, una volta.)", "отве́тил", ["отвеча́л", "отвеча́ет", "отве́чу"], "Lui ha risposto alla domanda.", ["w_otvetit", "w_otvechat"]),
    ("Она́ ча́сто ___ на вопро́сы. (Ripetuto, abitudine.)", "отвеча́ла", ["отве́тила", "отве́тит", "отве́чу"], "Lei rispondeva spesso alle domande.", ["w_otvechat", "w_otvetit"]),
    ("Вчера́ я́ ___ фильм. (L'ho guardato tutto.)", "посмотре́л", ["смотре́л", "смотрю́", "посмотрю́"], "Ieri ho guardato il film.", ["w_posmotret", "w_smotret"]),
    ("Мы́ весь ве́чер ___ . (Per ore.)", "смотре́ли", ["посмотре́ли", "смо́трим", "посмо́трим"], "Abbiamo guardato per tutta la sera.", ["w_smotret", "w_posmotret"]),
    ("Я́ ___ ему́ ис́торию. (La racconto adesso, in corso.)", "расска́зываю", ["рассказа́л", "расскажу́", "расска́зывал"], "Gli sto raccontando una storia.", ["w_rasskazyvat", "w_rasskazat"]),
    ("За́втра я́ ___ ему́ ис́торию. (La racconterò per intero.)", "расскажу́", ["расска́зываю", "рассказа́л", "расска́зывал"], "Domani gli racconterò la storia.", ["w_rasskazat", "w_rasskazyvat"]),
]

# sillabe/parole di lettura e riconoscimento del suono (lezione 6): (domanda, risposta, distrattori, parola)
L6_MC = [
    ("Come suona circa «хорошо́» (khorosciò) con la riduzione della о non accentata?", "kharashò", ["khorosciò", "khuruscio", "kharoshò"], "w_khorosho"),
    ("Come suona circa «Росси́я» (rossìia) con la riduzione?", "Rassìia", ["Rossìia", "Russìia", "Rassèia"], "w_rossiya"),
    ("Come suona circa «ме́дленно» (mèdlenno) con la riduzione?", "mièdlenna", ["mèdlenno", "mièdlenno", "mèdlenna"], "w_medlenno"),
    ("Come suona circa «пра́вильно» (pràvilno)?", "pràvilna", ["pràvilno", "pràvelno", "pròvilna"], "w_pravilno"),
    ("Come suona circa «рестора́н» (restoràn)?", "ristarán", ["restoràn", "ristoràn", "ristarèn"], "w_restoran"),
    ("Come si legge «клу́б» (b finale)?", "klup", ["klub", "glup", "kluf"], "w_klub"),
    ("Come si legge «вхо́д» (v e d)?", "fkhòt", ["vkhòd", "fkhòd", "vkhòt"], "w_vkhod"),
    ("Una vocale non accentata «о» si pronuncia come una...", "a debole", ["o chiusa", "u lunga", "e aperta"], "w_khorosho"),
    ("In russo le consonanti sonore a fine parola diventano...", "sorde", ["più sonore", "doppie", "mute"], "w_klub"),
    ("Quale vocale è sempre pronunciata chiaramente in una parola russa?", "quella accentata", ["la prima", "l'ultima", "nessuna"], "w_rossiya"),
]
L6_MATCH = [
    ("Росси́я", "si pronuncia circa «Rassìia»", "w_rossiya"),
    ("ме́дленно", "si pronuncia circa «mièdlenna»", "w_medlenno"),
    ("пра́вильно", "si pronuncia circa «pràvilna»", "w_pravilno"),
    ("клу́б", "si legge «klup»", "w_klub"),
    ("вхо́д", "si legge «fkhòt»", "w_vkhod"),
    ("хорошо́", "si pronuncia circa «kharashò»", "w_khorosho"),
]

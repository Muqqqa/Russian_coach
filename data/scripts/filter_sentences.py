#!/usr/bin/env python3
"""Filtro contenuti sensibili per le frasi + report parole inadatte ai principianti.

Come modulo: `check(ru, it)` -> None oppure (categoria, termine trovato). Usato da build_sentences.py
sul pool dei candidati PRIMA della selezione, cosi' le parole mantengono i loro esempi.
Come script: ricontrolla data/sentences (idempotente), rimuove le frasi sensibili, verifica che ogni
parola delle frasi esista in data/words, aggiorna `examples`, scrive reports/filtered_sentences.json
(se lanciato da solo, unisce i risultati) e reports/unsuitable_words.json.
Uso: python3 -I data/scripts/filter_sentences.py"""
import collections, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import strip_acc
import qa_fixes

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Russo: espressioni regolari su token minuscoli interi (senza accento). Evitano falsi positivi (es. "убирать").
RU = {
    "violenza/armi": r"уби(ть|т|ты|л|ла|ли|в|вать|й\w*|ю|ём|ет|ют|шь|йте|йца)|убей\w*|убь\w*|драк\w*|дерут\w*|насил\w*|пытк\w*|резн\w*|стрел\w*|выстрел\w*|"
                     r"оруж\w*|пистолет\w*|ружь\w*|ружьё|автомат\w*|нож(а|у|ом|е|и|ей|ам|ами|ах)?|бомб\w*|взрыв\w*|террор\w*|казн\w*|"
                     r"враг\w*|жертв\w*|ранен\w*|удар(ить|ил\w*|ю|ишь)|бить|бью|бьёт|избил\w*|напад\w*|атак\w*|топор\w*|гибел\w*|погиб\w*|"
                     r"воен\w*|войн\w*|война|сражен\w*|бой|боя|бою|бои|боем|боёв|боях|бойн\w*|бойц\w*|крич\w*|орать|орёт|орут",
    "morte": r"смерт\w*|умер\w*|умир\w*|умрёт|умрет|умрут|мертв\w*|мёртв\w*|труп\w*|похорон\w*|гроб\w*|кладбищ\w*|покойн\w*|самоубий\w*|суицид\w*|повес\w*|ад|аду|аде",
    "sesso": r"секс\w*|порно\w*|проститут\w*|шлюх\w*|изнасил\w*|эрот\w*|интим\w*|сиськ\w*|член(а|у|ом|е|ы|ов|ам|ами|ах)?|гол(ый|ая|ое|ые|ого|ому|ым|ых|ой|ую)|"
              r"голышом|раздет\w*|любовниц\w*|любовник\w*|гей\w*|геев|гетеро|лесби\w*|педик\w*|трах\w*|беременн\w*",
    "droga/alcol": r"наркот\w*|пил(а|и)?|пью|пьёшь|пьёт|пьём|пьёте|пьют|наркоман\w*|героин\w*|кокаин\w*|марихуан\w*|нарк\w*|пьян\w*|напил\w*|напив\w*|алкогол\w*|алкаш\w*|водк\w*|самогон\w*|курить|куришь|курю|сигарет\w*|табак\w*",
    "politica": r"полити\w*|президент\w*|правительств\w*|парти(я|и|ей|ю|ям|ях)|коммунис\w*|социалис\w*|фашис\w*|нацис\w*|гитлер\w*|сталин\w*|путин\w*|трамп\w*|украин\w*|крым\w*|"
                r"оккупа\w*|революц\w*|оппозиц\w*|власт\w*|выбор(ы|ов|ах|ам)|государств\w*|советск\w*|ссср|депутат\w*|министр\w*|генерал\w*|лейтенант\w*|капитан\w*|командир\w*|"
                r"армия|армии|армию|армией|солдат\w*|тюрьм\w*|арест\w*|преступ\w*|закон\w*",
    "religione": r"бог(а|у|ом|е|и|ов|ам)?|бож\w*|господ\w*|христ\w*|ислам\w*|мусульман\w*|иудей\w*|еврей\w*|церк\w*|молитв\w*|молить\w*|аллах\w*|библи\w*|рай|раю|"
                 r"религи\w*|священ\w*|дьявол\w*|сатан\w*|чёрт(а|у|ом|е|и|ей|ов)?|проклят\w*|ангел\w*|небес\w*|загробн\w*",
    "insulti/razzismo": r"дурак\w*|дура|дуры|идиот\w*|тупо\w*|тупиц\w*|дебил\w*|урод\w*|сволоч\w*|мраз\w*|ублюд\w*|говн\w*|дерьм\w*|хрен\w*|сука|суки|суку|бля\w*|пизд\w*|хуй\w*|хуе\w*|"
                        r"ёб\w*|еб\w*|ебан\w*|негр\w*|чурк\w*|хохо\w*|жид\w*|ненавид\w*|ненавис\w*|ненавиж\w*|глуп\w*|мерзк\w*|гад\w*|скот\w*|свин\w*|толст\w*|жирн\w*|псих\w*|сумасшед\w*|безум\w*",
}
RU_RX = {k: re.compile(r"^(?:" + v + r")$") for k, v in RU.items()}
IT = {
    "violenza/armi": r"uccid\w*|ucciso|uccis\w*|ammazz\w*|violen\w*|stupr\w*|pistol\w*|fucil\w*|\barm[ai]\b|armat\w*|bomb\w*|esplo(s|d)\w*|guerr\w*|terror\w*|attacc\w*|picchi\w*|colpit\w*|ferit\w*|coltell\w*|\bspara(re|to|ta|no|ndo)?\b|soldat\w*|militar\w*|nemic\w*|vittim\w*|botte|bastona\w*",
    "morte": r"mort[eioa]\b|mori\w*|muor\w*|morì|cadaver\w*|funeral\w*|cimiter\w*|tomba|bara|suicid\w*|impicc\w*|defunt\w*|decedut\w*|sangue|sangui\w*|inferno",
    "sesso": r"\bsess(o|uale|uali|ualita)\b|porn\w*|prostitut\w*|\bnud[oiae]\b|erotic\w*|amant[ei]\b|gay|omosess\w*|lesbic\w*|incinta|bacia\w*|baci\b",
    "droga/alcol": r"drog\w*|eroina|cocaina|marijuana|ubriac\w*|alcol\w*|sbornia|fum[ao]\w*|sigaret\w*|tabacc\w*|vodka|whisky",
    "politica": r"politic\w*|president\w*|govern\w*|comunis\w*|social\w*|fascis\w*|nazis\w*|putin|trump|ucrain\w*|crimea|rivoluz\w*|sovietic\w*|ministr\w*|tenente|capitano|comandante|polizia|prigion\w*|carcer\w*|arrest\w*|crimin\w*",
    "religione": r"\bdio\b|gesù|cristian\w*|islam\w*|musulman\w*|ebre\w*|ebraic\w*|chiesa|preghier\w*|pregare|bibbia|religi\w*|sacerdot\w*|\bprete\b|diavol\w*|satan\w*|demon\w*|maledett\w*|angelo|paradiso",
    "insulti/razzismo": r"stupid\w*|idiot\w*|imbecill\w*|cretin\w*|stronz\w*|cazz\w*|merda|puttan\w*|bastard\w*|negro|negri|odi[ao]\w*|odiar\w*|matt[oaie]\b|pazz\w*|grasso\w*|grassa|maiale|porco|scem\w*",
}
IT_RX = {k: re.compile(r"\b(?:" + v + r")", re.I) for k, v in IT.items()}
TOKEN = re.compile(r"[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*")


def check(ru, it):
    """None se la frase e' adatta; altrimenti (categoria, termine)."""
    for t in TOKEN.findall(strip_acc(ru)):
        tl = t.lower()
        for cat, rx in RU_RX.items():
            if rx.match(tl):
                return cat, tl
    for cat, rx in IT_RX.items():
        m = rx.search(it)
        if m:
            return cat, m.group(0).lower()
    return None


def write_report(excluded, total_pool, path=None):
    path = path or os.path.join(ROOT, "reports", "filtered_sentences.json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    per = collections.Counter(e["motivo"] for e in excluded)
    json.dump({"generato_da": "scripts/filter_sentences.py", "frasi_controllate": total_pool,
               "frasi_escluse": len(excluded), "per_motivo": dict(per),
               "nota": "Euristica a radici in russo e italiano; esclude per cautela (anche falsi positivi). id = id frase (s_<Tatoeba>).",
               "frasi": excluded}, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


# ---------------------------------------------------------------- parole inadatte
MANUAL_UNSUITABLE = {
    "сидушка": "gergale/neologismo di nicchia (sedile imbottito), poco utile a un principiante",
    "мем": "neologismo di internet, poco utile a un principiante",
    "вай-фай": "prestito informale con accento non attestato in OpenRussian (corretto a mano)",
    "гетеро": "prefisso/gergo su orientamento sessuale, poco utile a un principiante",
    "безоблачно": "avverbio raro",
    "несколькие": "forma plurale rara di 'несколько'",
    "кредитная карта": "espressione composta fuori standard (non e' una parola singola)",
    "ж": "particella enclitica abbreviata, non e' una parola autonoma",
    "чём": "forma flessa di 'что' trattata come lemma",
    "зовут": "forma verbale (3a pl.) trattata come lemma",
}


def unsuitable_words(words):
    out = {}
    sub = os.path.join(ROOT, "raw", "wiktextract", "ru_subset.jsonl")
    bad_tags = {"vulgar", "offensive", "derogatory", "obscene", "ethnic-slur"}
    wtags = collections.defaultdict(set)
    if os.path.exists(sub):
        for line in open(sub, encoding="utf-8"):
            d = json.loads(line)
            for s in d["senses"][:1]:
                wtags[strip_acc(d["word"])] |= set(s.get("tags") or []) & bad_tags
            if d["senses"] and all("slang" in (s.get("tags") or []) for s in d["senses"]):
                wtags[strip_acc(d["word"])].add("slang")
    for w in words:
        reasons = []
        if w["ru"] in MANUAL_UNSUITABLE:
            reasons.append(MANUAL_UNSUITABLE[w["ru"]])
        t = wtags.get(w["ru"])
        if t:
            reasons.append("Wiktionary marca il primo senso come: " + ", ".join(sorted(t)))
        c = check(w["ru"], " ".join(w["en"]) if False else "")
        if c:
            reasons.append(f"argomento sensibile ({c[0]}: {c[1]})")
        if reasons:
            out[w["id"]] = {"id": w["id"], "ru": w["ru"], "level": w["level"], "pos": w["pos"], "en": w["en"][:2], "motivi": reasons}
    return list(out.values())


def main():
    words = []
    for lvl in ["zero", "a1", "a2"]:
        words += json.load(open(os.path.join(ROOT, "words", f"{lvl}.json"), encoding="utf-8"))
    ids = {w["id"] for w in words}
    # report esistente (da build_sentences) + nuove esclusioni
    rp = os.path.join(ROOT, "reports", "filtered_sentences.json")
    prev = json.load(open(rp, encoding="utf-8")) if os.path.exists(rp) else {"frasi": [], "frasi_controllate": 0}
    excluded = list(prev["frasi"])
    seen = {e["id"] for e in excluded}
    kept = {}
    rules = qa_fixes.sentence_rules()
    n = 0
    for lvl in ["zero", "a1", "a2"]:
        p = os.path.join(ROOT, "sentences", f"{lvl}.json")
        keep = []
        for s in json.load(open(p, encoding="utf-8")):
            n += 1
            c = None if s["id"] in rules["include"] else check(s["ru"], s["it"])
            if s["id"] in rules["reject"] or s["id"] in rules["names"]:
                c = ("qa", "frase rifiutata da qa-russian")
            missing = [x for x in s["words"] if x not in ids]
            if c and s["id"] not in seen:
                excluded.append({"id": s["id"], "motivo": c[0], "termine": c[1], "ru": s["ru"], "it": s["it"]})
            elif missing:
                excluded.append({"id": s["id"], "motivo": "parola_fuori_vocabolario", "termine": ",".join(missing), "ru": s["ru"], "it": s["it"]})
            elif not c:
                keep.append(s)
        kept[lvl] = keep
        json.dump(keep, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    ex = collections.defaultdict(list)
    for lvl, ss in kept.items():
        for s in ss:
            for wid in s["words"]:
                ex[wid].append(s["id"])
    for lvl in ["zero", "a1", "a2"]:
        p = os.path.join(ROOT, "words", f"{lvl}.json")
        ws = json.load(open(p, encoding="utf-8"))
        for w in ws:
            w.pop("examples", None)
            if ex.get(w["id"]):
                w["examples"] = ex[w["id"]][:3]
        json.dump(ws, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    write_report(excluded, max(prev.get("frasi_controllate", 0), n))
    uw = unsuitable_words(words)
    json.dump({"generato_da": "scripts/filter_sentences.py", "nota": "Parole NON cancellate: segnalate per revisione (curriculum-writer / qa-russian).",
               "totale": len(uw), "parole": uw},
              open(os.path.join(ROOT, "reports", "unsuitable_words.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("frasi rimaste:", {k: len(v) for k, v in kept.items()}, "| escluse nel report:", len(excluded), "| parole inadatte:", len(uw))


if __name__ == "__main__":
    main()

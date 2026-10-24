#!/usr/bin/env python3
"""Normalizza OpenRussian in data/words/*.json.
Livelli: elenchi A1/A2/B1 di OpenRussian -> zero/a1/a2 (vedi LEVEL_MAP e data/README.md).
Forme flesse: CSV nouns/verbs/adjectives del repo pubblico (CC BY-SA 4.0).
Uso: python3 -I data/scripts/build_words.py"""
import csv, json, os, sys, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import qa_fixes

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "raw", "openrussian")
OUT = os.path.join(ROOT, "words")

# Il livello OpenRussian A1 conta solo 89 voci: lo usiamo come "zero", A2 come "a1", B1 come "a2".
LEVEL_MAP = {"A1": "zero", "A2": "a1", "B1": "a2"}

LIST_POS = {"noun": "noun", "verb": "verb", "adjective": "adj", "adverb": "adv", "pronoun": "pron",
            "preposition": "prep", "numeral": "num"}
# Per le voci classificate "other"/"expression"/None da OpenRussian: classificazione grammaticale
# manuale (da rivedere in QA).
OTHER_POS = {}
def _o(pos, words):
    for w in words.split(","):
        OTHER_POS[w.strip()] = pos
_o("part", "не,да,нет,бы,же,ли,ни,ну,ведь,уж,хоть,пусть,лишь,разве,именно,таки,ж,вот,даже,только,ещё,уже")
_o("conj", "и,или,а,но,если,чтобы,чтоб,когда,хотя,потому что,либо,словно,будто,чем,однако")
_o("pron", "это,всё,все,ничего,чём,сей,что")
_o("intj", "пожалуйста,спасибо,извините,простите,здравствуйте,давай")
_o("phrase", "до свидания,доброе утро,добрый день,добрый вечер,зовут")
_o("adv", "здесь,где,там,тут,как,так,потом,по-русски,почему,надо,можно,нельзя,видно,недалеко,налево,везде,нигде,где-то,"
          "теперь,тогда,назад,туда,сюда,домой,зачем,куда,откуда,снова,много,немного,совсем,сразу,опять,чуть,также,"
          "наконец,однажды,вперёд,иначе,кстати,затем,едва,вполне,никак,вниз,вовсе,классно,менее,более,вообще,давно,"
          "никогда,иногда,почти,вместе,поэтому,потому,пока,прежде,мимо,несколько,добро,вокруг,около,очень,сегодня,быстро")
_o("prep", "перед,после,около,вокруг,против,мимо,без,из,с,у,в,на,по,для,до,за,к,о,от,при,про,над,под,между,через")
_o("num", "несколько,несколькие")
_o("adv", "тоже")
# eccezioni: queste voci OpenRussian sono avverbi/preposizioni anche se il test sopra le avrebbe cambiate
OTHER_POS["вокруг"] = "prep"; OTHER_POS["около"] = "prep"; OTHER_POS["мимо"] = "prep"
OTHER_POS["прежде"] = "adv"; OTHER_POS["что"] = "pron"
OTHER_POS["есть"] = "verb"; OTHER_POS["хорошо"] = "adv"

# accenti non presenti in OpenRussian per queste espressioni (norma standard; da confermare in QA)
STRESS_FIX = {"до свидания": "до свида\u0301ния", "добрый вечер": "до\u0301брый ве\u0301чер", "вай-фай": "ва\u0301й-фа\u0301й"}

TENSE_KEYS = [("presfut_sg1", "presfut_1sg"), ("presfut_sg2", "presfut_2sg"), ("presfut_sg3", "presfut_3sg"),
              ("presfut_pl1", "presfut_1pl"), ("presfut_pl2", "presfut_2pl"), ("presfut_pl3", "presfut_3pl"),
              ("past_m", "past_m"), ("past_f", "past_f"), ("past_n", "past_n"), ("past_pl", "past_pl"),
              ("imperative_sg", "imp_sg"), ("imperative_pl", "imp_pl")]
CASES = {"nom": "nom", "gen": "gen", "dat": "dat", "acc": "acc", "inst": "ins", "prep": "prep"}


def read(name):
    with open(os.path.join(RAW, name + ".csv"), encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f, delimiter="\t", quoting=csv.QUOTE_NONE))


def conv_form(v):
    """'то'т, того'' -> 'то́т, того́' ; ritorna stringa o None."""
    v = (v or "").strip().strip('"')
    if not v:
        return None
    return ", ".join(to_stress(p.strip()) for p in v.split(","))


def main():
    levels = json.load(open(os.path.join(RAW, "levels.json"), encoding="utf-8"))
    tables = {n: read(n) for n in ["nouns", "verbs", "adjectives", "others"]}
    index = collections.defaultdict(list)  # (bare, accented) -> [(table, row)]
    by_bare = collections.defaultdict(list)
    for n, rows in tables.items():
        for r in rows:
            index[(r["bare"], to_stress(r["accented"]))].append((n, r))
            by_bare[r["bare"]].append((n, r))

    prefer = {"noun": ["nouns"], "verb": ["verbs"], "adj": ["adjectives"]}
    words, ids, unresolved_stress, unmatched, dup_level = [], set(), [], [], []
    seen_lemmas = {}
    missing_pos = []
    for lv in ["A1", "A2", "B1"]:
        for e in levels[lv]:
            bare = e["bare"]
            acc_list = to_stress(e["accented"])
            key = (bare, acc_list)
            lp = e["pos"]
            pos = LIST_POS.get(lp) or OTHER_POS.get(bare)
            if pos is None:
                missing_pos.append(bare); continue
            if lp in ("other", "expression", None) and bare in OTHER_POS:
                pos = OTHER_POS[bare]
            # riga CSV
            cands = index.get(key) or [c for c in by_bare.get(bare, [])]
            row = None
            tab = None
            want = prefer.get(pos, ["others", "adjectives", "nouns", "verbs"])
            for t in want + ["nouns", "verbs", "adjectives", "others"]:
                m = [c for c in cands if c[0] == t]
                if m:
                    tab, row = m[0]
                    break
            if row is None:
                unmatched.append(bare)
            stress_src = acc_list if ACC in acc_list or not row else to_stress(row["accented"])
            if " " in bare:
                stress, ok = stress_word_by_word(stress_src)
            else:
                stress, ok = add_default_stress(stress_src)
            if bare in STRESS_FIX:
                stress, ok = STRESS_FIX[bare], True
            if not ok:
                unresolved_stress.append(bare)
            w = {
                "id": None,
                "ru": bare,
                "stress": stress,
                "translit": translit(stress),
                "en": [t.strip() for t in e["translations"] if t and t.strip()],
                "pos": pos,
                "level": LEVEL_MAP[lv],
                "topics": [],
                "source": "openrussian",
                "license": "CC-BY-SA-4.0",
                "attribution": "OpenRussian.org (en.openrussian.org), dati su https://github.com/Badestrand/russian-dictionary, CC BY-SA 4.0",
            }
            if not w["en"]:
                w["en"] = ["(nessuna traduzione inglese nella fonte)"]
            forms = {}
            if row and tab == "nouns":
                g = row.get("gender", "")
                if g in ("m", "f", "n"):
                    w["gender"] = g
                if row.get("animate") in ("0", "1"):
                    w["animate"] = row["animate"] == "1"
                for num in ("sg", "pl"):
                    for src, dst in CASES.items():
                        v = conv_form(row.get(f"{num}_{src}"))
                        if v:
                            forms[f"{dst}_{num}"] = v
                if row.get("indeclinable") == "1":
                    forms["indeclinable"] = "1"
            elif row and tab == "verbs":
                forms["aspect"] = row.get("aspect", "")
                if row.get("partner"):
                    forms["aspect_partner"] = to_stress(row["partner"])
                for src, dst in TENSE_KEYS:
                    v = conv_form(row.get(src))
                    if v:
                        forms[dst] = v
            elif row and tab == "adjectives":
                for k in ["comparative", "superlative", "short_m", "short_f", "short_n", "short_pl"]:
                    v = conv_form(row.get(k))
                    if v:
                        forms[{"comparative": "comp", "superlative": "sup"}.get(k, k)] = v
                for g in ("m", "f", "n", "pl"):
                    for src, dst in CASES.items():
                        v = conv_form(row.get(f"decl_{g}_{src}"))
                        if v:
                            forms[f"{g}_{dst}"] = v
            if forms:
                w["forms"] = {k: v for k, v in forms.items() if v}
            # id stabile: w_<slug>; omografi con suffisso pos
            base = "w_" + (slug(bare) or "x")
            wid = base
            if wid in ids:
                wid = f"{base}_{pos}"
            n = 2
            while wid in ids:
                wid = f"{base}_{pos}{n}"; n += 1
            ids.add(wid)
            w["id"] = wid
            if bare in seen_lemmas and seen_lemmas[bare] != w["level"]:
                dup_level.append(bare)
            seen_lemmas.setdefault(bare, w["level"])
            words.append(w)

    if missing_pos:
        raise SystemExit(f"pos non classificata: {missing_pos}")
    # --- correzioni qa-russian: parole rifiutate (rimosse solo se NON citate in content/) e fix ai campi ---
    excl = qa_fixes.exclude_ids()
    cited = qa_fixes.cited_ids(excl)
    removed = [w for w in words if w["id"] in excl and w["id"] not in cited]
    kept_cited = [w for w in words if w["id"] in excl and w["id"] in cited]
    words = [w for w in words if w["id"] not in {r["id"] for r in removed}]
    qa_fixes.apply_word_fixes(words)
    os.makedirs(os.path.join(ROOT, "reports"), exist_ok=True)
    json.dump({"generato_da": "scripts/build_words.py (qa_fixes.json)",
               "rimosse": [{"id": w["id"], "ru": w["ru"], "level": w["level"]} for w in removed],
               "rifiutate_da_qa_ma_citate_in_content_mantenute": [
                   {"id": w["id"], "ru": w["ru"], "level": w["level"], "citata_in": cited[w["id"]]} for w in kept_cited]},
              open(os.path.join(ROOT, "reports", "removed_words.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("rimosse:", [w["id"] for w in removed], "| mantenute perche' citate:", [w["id"] for w in kept_cited])
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith(".json"):
            os.remove(os.path.join(OUT, f))
    # il file words_<livello>.json viene riscritto da build_sentences.py (examples); qui scrittura base
    for lvl in ["zero", "a1", "a2"]:
        chunk = [w for w in words if w["level"] == lvl]
        json.dump(chunk, open(os.path.join(OUT, f"{lvl}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(lvl, len(chunk), "parole")
    print("senza riga CSV (niente forme):", len(unmatched), unmatched)
    print("accento non risolto (plurisillabi senza segno):", len(unresolved_stress), unresolved_stress)
    print("stesso lemma in livelli diversi:", dup_level)


if __name__ == "__main__":
    main()

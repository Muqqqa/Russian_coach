"""Applicazione delle correzioni di qa-russian (snapshot in qa_fixes.json = qa/data_fixes.json del 2026-10-24).
Usato da build_words.py, build_sentences.py ed enrich_wiktextract.py, cosi' rigenerare riproduce sempre il risultato."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REPO = os.path.dirname(ROOT)
FIXES = json.load(open(os.path.join(HERE, "qa_fixes.json"), encoding="utf-8"))
# correzioni successive all'audit (stesso formato), applicate dopo quelle dello snapshot
_extra = os.path.join(HERE, "extra_fixes.json")
if os.path.exists(_extra):
    FIXES += json.load(open(_extra, encoding="utf-8"))

# fix volutamente NON applicati
SKIP = {("w_vay_fay", "stress")}  # QA: incerto, non approvare finche' non confermato
# parole con accento/frase scelti qui (override espliciti)
EXPLICIT = {("w_zovut", "ru")}
PRON_PREP_FORMS = {"w_chto": {"nom_sg": "что́", "gen_sg": "чего́", "dat_sg": "чему́", "acc_sg": "что́", "prep_sg": "чём"}}


def by(kind, field=None):
    return [x for x in FIXES if x["kind"] == kind and (field is None or x["field"] == field)]


def exclude_ids():
    return {x["id"] for x in by("word", "status") if x["proposed"] == "exclude"}


def cited_ids(ids):
    """Id citati nelle lezioni e negli esercizi in content/ (NON in word_topics.json, che elenca tutte le parole)."""
    cited = {}
    base = os.path.join(REPO, "content")
    for dp, _, fns in os.walk(base):
        if "__pycache__" in dp:
            continue
        for fn in fns:
            if fn == "word_topics.json" or not fn.endswith(".json"):
                continue
            p = os.path.join(dp, fn)
            try:
                t = open(p, encoding="utf-8").read()
            except OSError:
                continue
            for i in ids:
                if f'"{i}"' in t:
                    cited.setdefault(i, []).append(os.path.relpath(p, REPO))
    return cited


def clean_forms(forms):
    out = {}
    for k, v in forms.items():
        if k == "aspect_partner" and v.strip() in ("-", ""):
            continue
        if isinstance(v, str):
            v = v.replace("//", ", ")
            v = re.sub(r"\(([^)]*)\)", r"\1", v)
            v = ", ".join(x.strip().lstrip("*") for x in v.split(",") if x.strip())
        out[k] = v
    return out


def apply_word_fixes(words):
    """Modifica in place la lista di dict parola. Idempotente."""
    byid = {w["id"]: w for w in words}
    log = []
    for w in words:
        if w.get("forms"):
            w["forms"] = clean_forms(w["forms"])
    for x in FIXES:
        if x["kind"] not in ("word", "it_gloss") or x["id"] not in byid:
            continue
        w = byid[x["id"]]
        f, v = x["field"], x["proposed"]
        if (x["id"], f) in SKIP:
            continue
        if x["kind"] == "it_gloss":
            w["it"] = list(v)
            continue
        if f == "status":
            continue
        if f == "forms":
            w["forms"] = dict(v)
        elif f.startswith("forms."):
            w.setdefault("forms", {})[f[6:]] = v
        elif f == "grammar_tags":
            if v:
                w["grammar_tags"] = v
            else:
                w.pop("grammar_tags", None)
        elif f in ("gender", "animate"):
            if v is None:
                w.pop(f, None)
            else:
                w[f] = v
        elif f == "ru":
            if x["id"] == "w_zovut":
                w["ru"] = "меня зовут"
                w["stress"] = "меня́ зову́т"
                w["pos"] = "phrase"
                w.pop("forms", None)
                w["translit"] = translit(w["stress"])
        elif f == "translit":
            w["translit"] = v
        else:
            w[f] = v
    for wid, fo in PRON_PREP_FORMS.items():
        if wid in byid:
            byid[wid].setdefault("forms", {}).update({k: v for k, v in fo.items() if k not in byid[wid].get("forms", {})})
    # coerenza aspetto: forms.aspect segue il campo aspect
    for w in words:
        if w.get("aspect") and w.get("forms", {}).get("aspect"):
            w["forms"]["aspect"] = {"impf": "imperfective", "pf": "perfective", "both": "both"}[w["aspect"]]
        if w.get("forms") is not None and not w["forms"]:
            w.pop("forms")
    return words


def sentence_rules():
    """dict con: reject (ids), names (ids da scartare), include (ids forzati), it, ru"""
    r = {"reject": set(), "names": set(), "include": set(), "it": {}, "ru": {}}
    for x in by("sentence"):
        f = x["field"]
        if f == "status" and x["proposed"] == "reject":
            r["reject"].add(x["id"])
        elif f == "words":
            if x["id"] != "s_05565":  # unico caso di rimappatura vera (w_chem -> w_chto); gli altri sono nomi propri
                r["names"].add(x["id"])
        elif f == "filter" and x["proposed"] == "include":
            r["include"].add(x["id"])
        elif f == "it":
            r["it"][x["id"]] = x["proposed"]
        elif f == "ru":
            r["ru"][x["id"]] = x["proposed"]
    return r

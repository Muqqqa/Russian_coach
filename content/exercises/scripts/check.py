#!/usr/bin/env python3
# Controllo automatico del banco esercizi: riferimenti, risposte, ambiguita', conteggi.
import json, os, sys, glob, collections, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glossary import *
from gen_lib import *

W = load_words(); S = load_sentences(); L = load_lessons()
LID = {l["id"]: l for l in L}
UNS = {x["id"] for x in json.load(open(ROOT + "/data/reports/unsuitable_words.json"))["parole"]}
TOP = json.load(open(ROOT + "/content/curriculum/topics.json"))
ex = []
for f in sorted(glob.glob(ROOT + "/content/exercises/*.json")):
    ex += json.load(open(f, encoding="utf-8"))
probs = []
def P(e, msg): probs.append((e["id"], e["lesson"], msg))
ids = set()
cyr = re.compile("[А-Яа-яЁё]")
def nk(s): return noyo(s).lower().strip()
for e in ex:
    if e["id"] in ids: P(e, "id duplicato")
    ids.add(e["id"])
    if e["lesson"] not in LID: P(e, "lezione inesistente")
    elif LID[e["lesson"]]["level"] != e["level"]: P(e, "livello non coerente")
    for w in e["words"]:
        if w not in W: P(e, "parola inesistente " + w)
        if w in UNS: P(e, "parola non adatta " + w)
    for t in e["topics"]:
        if t not in TOP: P(e, "topic sconosciuto " + t)
    if e["qa_status"] != "pending": P(e, "qa_status")
    if not (10 <= e["est_seconds"] <= 45): P(e, "est_seconds")
    p = e["payload"]
    t = e["type"]
    if t == "translate":
        if p["answer"] not in p["accepted"]: P(e, "answer non in accepted")
        if len(set(p["accepted"])) != len(p["accepted"]): P(e, "accepted duplicati")
        if p["direction"] == "it_ru":
            if not cyr.search(p["answer"]): P(e, "it_ru senza russo")
            for a in p["accepted"]:
                if not cyr.search(a): P(e, "accepted non russo")
    elif t == "cloze":
        if p["text"].count("___") != 1: P(e, "lacuna non unica")
        if p["answer"] not in p["accepted"]: P(e, "answer non in accepted")
        if not p.get("hint_it"): P(e, "senza hint_it")
    elif t == "multiple_choice":
        o = p["options"]
        if not (3 <= len(o) <= 4): P(e, "numero opzioni")
        if not (0 <= p["correct"] < len(o)): P(e, "correct fuori range")
        if len({nk(x) for x in o}) != len(o): P(e, "opzioni equivalenti: %s" % o)
        if len(o) != len(set(o)): P(e, "duplicati")
    elif t == "match":
        pr = p["pairs"]
        if not (3 <= len(pr) <= 6): P(e, "n coppie")
        if len({x["ru"] for x in pr}) != len(pr) or len({x["it"].lower() for x in pr}) != len(pr): P(e, "coppie duplicate")
    elif t == "dictation":
        if p["text"] not in p["accepted"] and plain(p["text"]) not in p["accepted"]: P(e, "dictation: testo non in accepted")
        if not any(plain(a) == a for a in p["accepted"]): P(e, "manca variante senza accento")
    # accenti: parole russe con >=2 vocali devono avere U+0301
    def need_acc(s):
        for tok in re.findall("[А-Яа-яЁё́\\-]+", s):
            if vowels_count(tok) >= 2 and "́" not in tok and "ё" not in tok.lower():
                return tok
        return None
    ru_fields = []
    if t == "translate" and p["direction"] == "ru_it": ru_fields.append(p["source"])
    if t == "translate" and p["direction"] == "it_ru": ru_fields.append(p["answer"])
    if t == "dictation": ru_fields.append(p["text"])
    if t == "match": ru_fields += [x["ru"] for x in p["pairs"] if cyr.search(x["ru"]) and len(x["ru"]) > 3]
    if t == "multiple_choice" and cyr.search(p["options"][0]) and e["lesson"] not in ("l_zero_01","l_zero_02","l_zero_03","l_zero_04","l_zero_05"):
        ru_fields += p["options"]
    for f in ru_fields:
        bad = need_acc(f)
        if bad and not (t == "match" and e["lesson"] in ("l_zero_01","l_zero_02","l_zero_03","l_zero_04","l_zero_05")):
            P(e, "manca accento in «%s»" % bad)

# coerenza con i dati: frasi e parole
BY_STRESS = {x["stress"]: x for x in S.values()}
BY_IT = collections.defaultdict(list)
for x in S.values(): BY_IT[x["it"]].append(x)
WSTRESS = {w["stress"]: w for w in W.values()}
for e in ex:
    p = e["payload"]; t = e["type"]
    if t == "multiple_choice":
        q = p["question"]; ans = p["options"][p["correct"]]
        if q in BY_STRESS and not (ans == BY_STRESS[q]["it"]): P(e, "MC frase: risposta non coincide con la traduzione")
        if q in BY_IT and not any(ans == x["stress"] for x in BY_IT[q]): P(e, "MC it->ru: risposta non coincide")
        if q in BY_STRESS:
            for i, o in enumerate(p["options"]):
                if i != p["correct"] and o == BY_STRESS[q]["it"]: P(e, "distrattore uguale alla risposta")
    elif t == "cloze" and e["prompt_it"] == "Completa la frase con la parola mancante.":
        full = p["text"].replace("___", p["answer"])
        if full not in BY_STRESS: P(e, "cloze: frase ricostruita non presente nei dati: " + full)
        elif BY_STRESS[full]["it"] != p["hint_it"]: P(e, "cloze: hint non coincide")
    elif t == "translate":
        if p["direction"] == "ru_it" and p["source"] in BY_STRESS and BY_STRESS[p["source"]]["it"] != p["answer"]: P(e, "translate ru_it incoerente")
        if p["direction"] == "it_ru" and p["source"] in BY_IT and not any(x["stress"] == p["answer"] for x in BY_IT[p["source"]]): P(e, "translate it_ru incoerente")
    elif t == "dictation":
        if p["text"] in BY_STRESS and BY_STRESS[p["text"]]["it"] != p["translation_it"]: P(e, "dictation incoerente")
    elif t == "match":
        for x in p["pairs"]:
            if x["ru"] in BY_STRESS and BY_STRESS[x["ru"]]["it"] != x["it"]: P(e, "match frase incoerente")
# ambiguita' tra esercizi: stessa domanda con risposte diverse
qa = collections.defaultdict(set)
ACC = {}
for e in ex:
    p = e["payload"]
    if e["type"] == "multiple_choice": qa[("mc", p["question"])].add(p["options"][p["correct"]])
    if e["type"] == "translate": qa[("tr", e["prompt_it"], p["direction"], p["source"])].add(p["answer"]); ACC[(e["prompt_it"], p["direction"], p["source"])] = ACC.get((e["prompt_it"], p["direction"], p["source"]), set()) | set(p["accepted"])
    if e["type"] == "cloze": qa[("cz", p["text"], p.get("hint_it"))].add(p["answer"])
for k, v in qa.items():
    if k[0] == "tr" and all(a in ACC[k[1:]] for a in v): continue
    if len(v) > 1: probs.append(("-", "-", "stessa domanda con risposte diverse: %s -> %s" % (k, v)))

# conteggi
c_type = collections.Counter(e["type"] for e in ex)
c_lv = collections.Counter(e["level"] for e in ex)
c_d = collections.Counter(e["difficulty"] for e in ex)
print("TOTALE", len(ex))
print("per tipo", dict(c_type))
print("per livello", dict(c_lv))
print("per difficolta'", dict(sorted(c_d.items())))
print("tipo x livello", {k: dict(collections.Counter(e["type"] for e in ex if e["level"] == k)) for k in ("zero", "a1", "a2")})
print("livello x difficolta'", {k: dict(sorted(collections.Counter(e["difficulty"] for e in ex if e["level"] == k).items())) for k in ("zero", "a1", "a2")})
print("est_seconds min/media/max", min(e["est_seconds"] for e in ex), round(sum(e["est_seconds"] for e in ex) / len(ex), 1), max(e["est_seconds"] for e in ex))
MINS = {"translate": 4, "cloze": 3, "multiple_choice": 3, "match": 2, "dictation": 2}
per = collections.defaultdict(collections.Counter)
for e in ex: per[e["lesson"]][e["type"]] += 1
for l in L:
    for t, m in MINS.items():
        if per[l["id"]][t] < m: probs.append(("-", l["id"], "meno di %d %s (%d)" % (m, t, per[l["id"]][t])))
print("per lezione (min/max):", min(sum(c.values()) for c in per.values()), max(sum(c.values()) for c in per.values()), "lezioni coperte", len(per))
# parole coperte
cw = set(w for e in ex for w in e["words"])
nw = set(w for l in L for w in l["new_words"]) - UNS
print("parole nuove coperte da almeno un esercizio:", len(cw & nw), "/", len(nw), "mancanti:", sorted(nw - cw)[:20])
# doppioni di contenuto
sig = collections.Counter((e["type"], json.dumps(e["payload"], sort_keys=True, ensure_ascii=False)) for e in ex)
for (t, s), n in sig.items():
    if n > 1: probs.append(("-", "-", "payload duplicato x%d: %s" % (n, s[:80])))
print("PROBLEMI:", len(probs))
for p_ in probs[:80]: print(" ", p_)
sys.exit(1 if probs else 0)

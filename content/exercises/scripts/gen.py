#!/usr/bin/env python3
# Generatore deterministico del banco esercizi di Russian Coach.
# Uso: python3 content/exercises/scripts/gen.py
# Legge data/words, data/sentences, content/curriculum. Scrive content/exercises/<lezione>.json.
# Gli id (e_000001...) sono stabili: id_registry.tsv associa ogni chiave a un id gia' assegnato.
import json, os, re, sys, math, random, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glossary import *
from gen_lib import *
import gen_data as D

SEED = "russian-coach-ex-v1"
OUT = os.path.join(ROOT, "content", "exercises")
REG = os.path.join(OUT, "scripts", "id_registry.tsv")

W = load_words()
S = load_sentences()
L = load_lessons()
TOPIC_NAMES = json.load(open(os.path.join(ROOT, "content/curriculum/topics.json")))
WTOP = json.load(open(os.path.join(ROOT, "content/curriculum/word_topics.json")))
UNS = {x["id"] for x in json.load(open(os.path.join(ROOT, "data/reports/unsuitable_words.json")))["parole"]}
# per prudenza si escludono anche le parole che le versioni precedenti del report segnalavano come inadatte
UNS |= set("w_zovut w_politsiya w_chyom w_chlen w_cherta w_getero w_sidushka w_zh w_bezoblachno w_krichat".split())
# verbi/aggettivi per cui la coniugazione/accordo meccanico darebbe frasi innaturali
NO_CONJ = {"w_est", "w_byt", "w_nravitsya", "w_khotetsya", "w_stoit", "w_znachit", "w_roditsya", "w_pora", "w_nado", "w_nelzya"}
NO_ADJ = {"w_dolzhnyy", "w_nuzhnyy", "w_mnogie", "w_neskolkie", "w_malyy"}
G, GSRC = build_glossary(W, L)
G["w_kafe"] = ["caffetteria", "bar"]
G["w_ono"] = ["esso"]
for u in UNS:
    G.pop(u, None)

LESSON_BY_ID = {l["id"]: l for l in L}
LESSON_ORDER = {l["id"]: i for i, l in enumerate(L)}
def _est_ok(s):
    # omografo: e'sti "c'e'" vs "mangiare": si tengono solo le frasi con la forma "есть" (c'e')
    if "w_est" in s["words"]:
        return any(norm(split_core(t)[1]) == "есть" for t in s["stress"].split(" ") if split_core(t))
    return True

SENT_OK = {sid: s for sid, s in S.items() if all(w in W and w not in UNS for w in s["words"]) and _est_ok(s)}

# ---------------------------------------------------------------- forme
def surf_set(wid):
    w = W[wid]
    out = {norm(w["stress"])}
    out.add(norm(w["ru"]))
    for v in (w.get("forms") or {}).values():
        for p in str(v).split(","):
            p = p.strip()
            if p and ONLY_CYR.match(p):
                out.add(norm(p))
    return out

SURF = {wid: surf_set(wid) for wid in W}

def form(wid, key):
    v = (W[wid].get("forms") or {}).get(key)
    if not v or "," in v or not ONLY_CYR.match(v):
        return None
    return v

# ---------------------------------------------------------------- frasi
def sent_tokens(s):
    toks = []
    for i, t in enumerate(s["stress"].split(" ")):
        sc = split_core(t)
        toks.append((t, sc))
    return toks

def map_tokens(s):
    """per ogni token: id parola (se univoco) oppure None"""
    res = []
    for t, sc in sent_tokens(s):
        if not sc:
            res.append(None)
            continue
        pre, core, suf = sc
        n = norm(core)
        c = [w for w in s["words"] if n in SURF.get(w, ())]
        res.append(c[0] if len(c) == 1 else None)
    return res

def ntok(s):
    return len(s["stress"].split(" "))

def lesson_frasi(l):
    return list(dict.fromkeys(re.findall(r"s_\d+", l["explanation_md"])))

# ---------------------------------------------------------------- id
registry = {}
if os.path.exists(REG):
    for line in open(REG, encoding="utf-8"):
        k, _, v = line.rstrip("\n").partition("\t")
        if k:
            registry[k] = v
next_id = max([int(v[2:]) for v in registry.values()] + [0]) + 1

# ---------------------------------------------------------------- struttura esercizio
def mkex(ctx, typ, sub, ident, pts, prompt, payload, words, est, tags=None):
    return {"_sub": sub, "_ident": ident, "_pts": pts, "_est": est, "type": typ, "prompt_it": prompt, "payload": payload,
            "words": [w for w in dict.fromkeys(words)], "_tags": tags or [], "lesson": ctx["id"]}

def diff_for(ctx, pts):
    lo, hi = ctx["drange"]
    if ctx["bump"]:
        pts += 1
    s = 0 if pts <= 1 else (1 if pts == 2 else 2)
    return clip(lo + round(s * (hi - lo) / 2), 1, 5)

def drange(l):
    lv, o = l["level"], l["order"]
    if lv == "zero":
        return (1, 2) if o <= 6 else (1, 3)
    if lv == "a1":
        return (2, 3) if o <= 12 else (2, 4)
    return (3, 4) if o <= 6 else (3, 5)

# ---------------------------------------------------------------- contesto per lezione
known_acc = set()
CTX = {}
for l in L:
    nw_all = [w for w in l["new_words"] if w in W]
    nw = [w for w in nw_all if w not in UNS]
    known_acc |= set(nw_all)
    fr = [sid for sid in lesson_frasi(l) if sid in SENT_OK]
    pool_ids = set(fr)
    for sid, s in SENT_OK.items():
        if set(s["words"]) <= known_acc and set(s["words"]) & set(nw):
            pool_ids.add(sid)
    pool = sorted((SENT_OK[i] for i in pool_ids), key=lambda s: (ntok(s), s["id"]))
    CTX[l["id"]] = {"id": l["id"], "lesson": l, "level": l["level"], "order": l["order"], "nw": nw, "K": set(known_acc) - UNS,
                    "pool": pool, "drange": drange(l), "tags": l["grammar_tags"],
                    "bump": 1 if (l["level"] == "a1" and l["order"] >= 13) or (l["level"] == "a2" and l["order"] >= 5) or (l["level"] == "zero" and l["order"] >= 9) else 0}

def topics_for(ctx, wids):
    cnt = collections.Counter()
    for w in wids:
        for t in WTOP.get(w, []):
            if t in TOPIC_NAMES:
                cnt[t] += 1
    if not cnt:
        for w in ctx["nw"]:
            for t in WTOP.get(w, []):
                if t in TOPIC_NAMES:
                    cnt[t] += 1
    tops = [t for t, _ in cnt.most_common(3)]
    return tops or ["grammatica"]

# ---------------------------------------------------------------- glossario helpers
def prim(wid):
    return G[wid][0]

def gl_set(wid):
    return {g.lower() for g in G.get(wid, [])}

GL2W = collections.defaultdict(set)
for wid, gs in G.items():
    for g in gs:
        GL2W[g.lower()].add(wid)

def translate_answer_words(src_gloss):
    return sorted(GL2W.get(src_gloss.lower(), []))

def fun_pos(wid):
    return W[wid]["pos"] in ("prep", "conj", "part", "intj")

# ================================================================ costruttori
def b_word_translate(ctx):
    out = []
    for wid in ctx["nw"]:
        if wid not in G:
            continue
        w = W[wid]
        g = G[wid]
        acc = gloss_variants(g, w["pos"])
        out.append(mkex(ctx, "translate", "w_ru_it", wid, 0, "Traduci in italiano la parola russa.",
                        {"type": "translate", "direction": "ru_it", "source": w["stress"], "answer": g[0], "accepted": acc},
                        [wid], 10))
        if not fun_pos(wid) and w["pos"] != "pron":
            ans_words = translate_answer_words(g[0])
            if 1 <= len(ans_words) <= 2 and wid in ans_words and not any(a in UNS for a in ans_words):
                acc_ru = []
                for a in ans_words:
                    for v in ru_variants(W[a]["stress"]):
                        if v not in acc_ru:
                            acc_ru.append(v)
                ans = W[wid]["stress"]
                acc_ru = [ans] + [x for x in acc_ru if x != ans]
                out.append(mkex(ctx, "translate", "w_it_ru", wid, 1, "Traduci in russo la parola italiana (scrivi con l'accento, se puoi).",
                                {"type": "translate", "direction": "it_ru", "source": g[0], "answer": ans, "accepted": acc_ru},
                                [wid], 14))
    return out

SUBJ = {"я": "Io", "ты": "Tu", "мы": "Noi", "вы": "Voi", "он": "Lui", "она": "Lei", "они": "Loro"}

def it_sentence_variants(s):
    v = it_variants(s["it"])
    first = norm(split_core(s["stress"].split(" ")[0])[1]) if split_core(s["stress"].split(" ")[0]) else ""
    if first in SUBJ and not s["it"].lower().startswith(SUBJ[first].lower() + " "):
        pro = SUBJ[first]
        if first in ("он", "она", "они") and False:
            pass
        alt = pro + " " + s["it"][0].lower() + s["it"][1:]
        for x in it_variants(alt):
            if x not in v:
                v.append(x)
    return v

def b_sent_translate(ctx):
    out = []
    for s in ctx["pool"]:
        n = ntok(s)
        tp = 0 if n <= 2 else (1 if n <= 4 else 2)
        # evita traduzioni italiane identiche con piu' frasi russe: l'accepted le include tutte
        out.append(mkex(ctx, "translate", "s_ru_it", s["id"], tp, "Traduci in italiano la frase russa.",
                        {"type": "translate", "direction": "ru_it", "source": s["stress"], "answer": s["it"], "accepted": it_sentence_variants(s)},
                        s["words"], 8 + 3 * n))
        same = [x for x in SENT_OK.values() if x["it"].strip().lower() == s["it"].strip().lower()]
        acc = []
        for x in sorted(same, key=lambda x: (x["id"] != s["id"], x["id"])):
            for v in ru_variants(x["stress"]):
                if v not in acc:
                    acc.append(v)
        out.append(mkex(ctx, "translate", "s_it_ru", s["id"], tp + 1, "Traduci in russo la frase italiana (scrivi con l'accento, se puoi).",
                        {"type": "translate", "direction": "it_ru", "source": s["it"], "answer": s["stress"], "accepted": acc},
                        s["words"], 12 + 4 * n))
    return out

MASKED = collections.Counter()
for _s in SENT_OK.values():
    _t = _s["stress"].split(" ")
    for _i in range(len(_t)):
        MASKED[(" ".join("___" if j == _i else _t[j] for j in range(len(_t))), _s["it"])] += 1

def b_sent_cloze(ctx):
    out = []
    nwset = set(ctx["nw"])
    for s in ctx["pool"]:
        toks = sent_tokens(s)
        mp = map_tokens(s)
        cands = []
        for i, (t, sc) in enumerate(toks):
            if not sc or mp[i] is None:
                continue
            pre, core, suf = sc
            if len(plain(core)) < 2:
                continue
            pr = 0 if mp[i] in nwset else 1
            if W[mp[i]]["pos"] in ("prep", "conj", "part"):
                pr += 1
            cands.append((pr, i, mp[i]))
        cands.sort()
        for pr, i, wid in cands[:2]:
            t, (pre, core, suf) = toks[i]
            text = " ".join(("%s___%s" % (pre, suf)) if j == i else toks[j][0] for j in range(len(toks)))
            n = len(toks)
            morph = 1 if W[wid]["pos"] in ("verb", "adj", "noun") and norm(core) != norm(W[wid]["ru"]) else 0
            tp = (0 if n <= 3 else (1 if n <= 5 else 2)) + morph
            if MASKED[(text, s["it"])] > 1:
                continue
            accepted = ru_variants(core)
            if core[0].isupper():
                accepted += [x.lower() for x in accepted if x.lower() not in accepted]
            out.append(mkex(ctx, "cloze", "s_cloze", "%s#%d" % (s["id"], i), tp, "Completa la frase con la parola mancante.",
                            {"type": "cloze", "text": text, "answer": core, "accepted": list(dict.fromkeys(accepted)), "hint_it": s["it"]},
                            [wid], 10 + 2 * n))
    return out

def distract_sentences(ctx, s, k, mode):
    rnd = rng_for(SEED, ctx["id"], s["id"], mode)
    base = [x for x in SENT_OK.values() if x["id"] != s["id"] and x["it"].strip().lower() != s["it"].strip().lower()
            and x["stress"] != s["stress"] and LESSON_LV(x["level"]) <= LESSON_LV(ctx["level"])]
    kk = ctx["K"]
    def score(x):
        sc = 0
        if set(x["words"]) <= kk:
            sc += 4
        sh = len(set(x["words"]) & set(s["words"]))
        if 0 < sh < len(s["words"]):
            sc += 3
        sc -= abs(ntok(x) - ntok(s)) * 0.7
        sc += rnd.random() * 2
        return -sc
    base.sort(key=score)
    out, seen = [], set()
    for x in base:
        key = x["it"].strip().lower() if mode == "ru_it" else norm(x["stress"])
        if key in seen:
            continue
        # niente parole in comune identiche: stessa lista di parole = quasi sinonimo
        if set(x["words"]) == set(s["words"]):
            continue
        seen.add(key)
        out.append(x)
        if len(out) == k:
            break
    return out

def LESSON_LV(lv):
    return {"zero": 0, "a1": 1, "a2": 2, "b1": 3, "b2": 4}[lv]

def b_sent_mc(ctx):
    out = []
    for s in ctx["pool"]:
        n = ntok(s)
        tp = 0 if n <= 2 else (1 if n <= 4 else 2)
        d = distract_sentences(ctx, s, 3, "ru_it")
        if len(d) == 3:
            rnd = rng_for(SEED, ctx["id"], s["id"], "mc1")
            opts, ci = shuffle_options([s["it"]] + [x["it"] for x in d], s["it"], rnd)
            if len(set(opts)) == 4:
                out.append(mkex(ctx, "multiple_choice", "s_ru_it", s["id"], tp, "Scegli la traduzione italiana corretta.",
                                {"type": "multiple_choice", "question": s["stress"], "options": opts, "correct": ci},
                                s["words"], 10 + 2 * n))
        d = distract_sentences(ctx, s, 3, "it_ru")
        if len(d) == 3:
            rnd = rng_for(SEED, ctx["id"], s["id"], "mc2")
            opts, ci = shuffle_options([s["stress"]] + [x["stress"] for x in d], s["stress"], rnd)
            if len(set(opts)) == 4:
                out.append(mkex(ctx, "multiple_choice", "s_it_ru", s["id"], tp + 1, "Scegli la traduzione russa corretta.",
                                {"type": "multiple_choice", "question": s["it"], "options": opts, "correct": ci},
                                s["words"], 12 + 2 * n))
    return out

def word_distractors(ctx, wid, k, rnd, what):
    w = W[wid]
    mine = gl_set(wid)
    cand = [x for x in ctx["K"] if x in G and x != wid and not (gl_set(x) & mine) and x not in UNS]
    same = [x for x in cand if W[x]["pos"] == w["pos"]]
    pool = same if len(same) >= k else cand
    pool = sorted(pool)
    rnd.shuffle(pool)
    out, seen = [], set()
    for x in pool:
        key = prim(x).lower() if what == "it" else norm(W[x]["stress"])
        if key in seen:
            continue
        # per it->ru: nessun distrattore che sia anche traduzione del termine
        if what == "ru" and (gl_set(x) & mine):
            continue
        seen.add(key)
        out.append(x)
        if len(out) == k:
            break
    return out

def b_word_mc(ctx):
    out = []
    for wid in ctx["nw"]:
        if wid not in G:
            continue
        w = W[wid]
        rnd = rng_for(SEED, ctx["id"], wid, "wmc")
        d = word_distractors(ctx, wid, 3, rnd, "it")
        if len(d) == 3:
            opts, ci = shuffle_options([prim(wid)] + [prim(x) for x in d], prim(wid), rnd)
            if len(set(o.lower() for o in opts)) == 4:
                out.append(mkex(ctx, "multiple_choice", "w_ru_it", wid, 0, "Scegli il significato giusto.",
                                {"type": "multiple_choice", "question": "Che cosa significa «%s»?" % w["stress"], "options": opts, "correct": ci},
                                [wid], 10))
        if not fun_pos(wid) and w["pos"] != "pron" and len(translate_answer_words(prim(wid))) == 1:
            rnd = rng_for(SEED, ctx["id"], wid, "wmc2")
            d = word_distractors(ctx, wid, 3, rnd, "ru")
            if len(d) == 3:
                opts, ci = shuffle_options([w["stress"]] + [W[x]["stress"] for x in d], w["stress"], rnd)
                if len(set(opts)) == 4:
                    out.append(mkex(ctx, "multiple_choice", "w_it_ru", wid, 1, "Scegli la parola russa giusta.",
                                    {"type": "multiple_choice", "question": "Come si dice «%s» in russo?" % prim(wid), "options": opts, "correct": ci},
                                    [wid], 11))
    return out

GENDER_IT = {"m": "maschile", "f": "femminile", "n": "neutro"}

def b_gender_mc(ctx):
    out = []
    for wid in ctx["nw"]:
        w = W[wid]
        if w["pos"] != "noun" or w.get("gender") not in GENDER_IT:
            continue
        if "plural_only" in (w.get("grammar_tags") or []):
            continue
        opts = ["maschile", "femminile", "neutro"]
        out.append(mkex(ctx, "multiple_choice", "gender", wid, 1, "Scegli il genere del nome russo.",
                        {"type": "multiple_choice", "question": "Di che genere è il nome «%s»?" % w["stress"], "options": opts,
                         "correct": opts.index(GENDER_IT[w["gender"]])}, [wid], 11, ["gender"]))
    return out

# ---------------- esercizi grammaticali (cornici con ___) -> MC oppure cloze
def split_frame(frame):
    if " (" in frame and frame.endswith(")"):
        a, b = frame.split(" (", 1)
        return a.strip(), b[:-1].strip()
    return frame, None

def gram_item(ctx, ident, frame, answer, distractors, hint, prompt, words, tags, pts=2):
    return {"ctx": ctx, "ident": ident, "frame": frame, "answer": answer, "distractors": distractors, "hint": hint,
            "prompt": prompt, "words": words, "tags": tags, "pts": pts}

PRON_LOW = {"Я́": "я́", "Ты́": "ты́", "Он": "он", "Она́": "она́", "Они́": "они́", "Мы́": "мы́", "Вы́": "вы́"}
PRON = {"1sg": ("Я́", "io"), "2sg": ("Ты́", "tu"), "3sg": ("Он", "lui"), "1pl": ("Мы́", "noi"), "2pl": ("Вы́", "voi"), "3pl": ("Они́", "loro")}

def g_templates(ctx):
    items = []
    lid = ctx["id"]
    for (lesson, frame, wid, key, dkeys, hint, prompt) in D.CASE_TEMPLATES:
        if lesson != lid:
            continue
        ans = form(wid, key)
        ds = []
        for dk in dkeys:
            f = form(wid, dk)
            if f and f != ans and plain(f) != plain(ans or "") and f not in ds:
                ds.append(f)
        if ans and len(ds) >= 2:
            tag = {"prep_sg": "prepositional-case", "acc_sg": "accusative", "gen_sg": "genitive", "dat_sg": "dative-case", "ins_sg": "instrumental-case"}[key]
            items.append(gram_item(ctx, "case:%s:%s" % (wid, frame), frame, ans, ds[:3], hint, prompt, [wid], [tag]))
    for (lesson, num, nid, key, hint) in D.NUM_TEMPLATES:
        if lesson != lid:
            continue
        ans = form(nid, key)
        if not ans:
            continue
        ds = []
        for dk in ("nom_sg", "gen_sg", "gen_pl", "nom_pl"):
            f = form(nid, dk)
            if f and plain(f) != plain(ans) and f not in ds:
                ds.append(f)
        if len(ds) >= 2:
            items.append(gram_item(ctx, "num:%s:%s" % (num, nid), "%s ___." % num, ans, ds[:3], hint.capitalize() + ".",
                                   "Scegli la forma giusta del nome dopo il numero.", [nid], ["genitive-after-numbers"]))
    if lid == "l_a1_02":
        for (frame, ans, hint, nid) in D.DUE_TEMPLATES:
            opts = ["два́", "две́", "двух"]
            items.append(gram_item(ctx, "due:%s" % frame, frame, ans, [o for o in opts if o != ans], hint.capitalize() + ".",
                                   "Scegli «два» o «две» (genere del nome).", [nid, "w_dva"], ["numbers-gender"]))
    if lid == "l_a1_19":
        for (frame, ans, ds, hint, wds) in D.NEG_TEMPLATES:
            items.append(gram_item(ctx, "neg:%s" % frame, frame, ans, ds, hint, "Scegli la parola giusta (negazione doppia).", wds, ["negation"]))
    if lid == "l_a2_03":
        for (frame, ans, ds, hint, wds) in D.ASPECT_TEMPLATES:
            main, extra = split_frame(frame)
            items.append(gram_item(ctx, "asp:%s" % frame, main, ans, ds, hint + (" - %s" % extra.rstrip(".") + "." if extra else ""),
                                   "Scegli la forma verbale giusta (aspetto).", wds, ["aspect"], 3))
    return items

def g_verbs(ctx):
    items = []
    for wid in ctx["nw"]:
        w = W[wid]
        if w["pos"] != "verb" or wid not in G:
            continue
        fs = w.get("forms") or {}
        noconj = wid in NO_CONJ
        keys = ["presfut_1sg", "presfut_2sg", "presfut_3sg", "presfut_1pl", "presfut_2pl", "presfut_3pl"]
        forms_ = [form(wid, k) for k in keys]
        if all(forms_) and not noconj:
            rnd = rng_for(SEED, ctx["id"], wid, "conj")
            idxs = list(range(6))
            rnd.shuffle(idxs)
            for j, i in enumerate(idxs[:2]):
                pk = ["1sg", "2sg", "3sg", "1pl", "2pl", "3pl"][i]
                pr, pit = PRON[pk]
                ds = [forms_[k] for k in range(6) if k != i and forms_[k] != forms_[i]]
                rnd.shuffle(ds)
                perf = fs.get("aspect") == "perfective"
                frame = ("За́втра %s ___ (%s)." % (PRON_LOW[pr], w["stress"])) if perf else ("%s ___ (%s)." % (pr, w["stress"]))
                hint = "%s: %s%s" % (G[wid][0], pit, " (domani)" if perf else "")
                items.append(gram_item(ctx, "conj:%s:%s" % (wid, pk), frame, forms_[i], ds[:3], hint,
                                       "Coniuga il verbo: scegli la forma giusta.", [wid],
                                       ["verbs-present"] if not perf else ["future-perfective"], 2))
        past = [form(wid, k) for k in ("past_m", "past_f", "past_pl")]
        if all(past) and ctx["lesson"]["grammar_tags"] and any(t in ("past-tense", "past-of-byt", "aspect") for t in ctx["tags"]):
            for pi, (pr, pit) in enumerate([("Он", "lui"), ("Она́", "lei"), ("Они́", "loro")]):
                ds = [past[k] for k in range(3) if k != pi and past[k] != past[pi]]
                items.append(gram_item(ctx, "past:%s:%d" % (wid, pi), "Вчера́ %s ___ (%s)." % (PRON_LOW[pr], w["stress"]), past[pi], ds,
                                       "%s (ieri): %s" % (G[wid][0], pit), "Scegli la forma del passato giusta.", [wid], ["past-tense"], 2))
    return items

def g_plurals(ctx):
    items = []
    if not any(t in ("plural-nominative", "plural-irregular", "quantifiers") for t in ctx["tags"]):
        return items
    for wid in ctx["nw"]:
        w = W[wid]
        if w["pos"] != "noun" or wid not in G:
            continue
        ans = form(wid, "nom_pl")
        if not ans or ans == form(wid, "nom_sg"):
            continue
        ds = []
        for k in ("nom_sg", "gen_pl", "gen_sg", "dat_pl"):
            f = form(wid, k)
            if f and plain(f) != plain(ans) and f not in ds:
                ds.append(f)
        if len(ds) >= 2:
            items.append(gram_item(ctx, "pl:%s" % wid, "%s → plurale (nominativo): ___" % w["stress"], ans, ds[:3], "Plurale di «%s» (%s)." % (w["stress"], prim(wid)),
                                   "Scegli il nominativo plurale.", [wid], ["plural-nominative"], 2))
    return items

def g_adj(ctx):
    items = []
    nouns = {"m": ("до́м", "casa", "Э́то ___ до́м."), "f": ("вода́", "acqua", "Э́то ___ вода́."), "n": ("вино́", "vino", "Э́то ___ вино́."), "pl": ("дома́", "case", "Э́то ___ дома́.")}
    for wid in ctx["nw"]:
        w = W[wid]
        if w["pos"] != "adj" or wid not in G or wid in NO_ADJ:
            continue
        fm = {k: form(wid, k + "_nom") for k in ("m", "f", "n", "pl")}
        if not all(fm.values()) or len(set(fm.values())) < 4:
            continue
        rnd = rng_for(SEED, ctx["id"], wid, "adj")
        ks = ["m", "f", "n", "pl"]
        rnd.shuffle(ks)
        for k in ks[:2]:
            _, nit, frame = nouns[k]
            gname = {"m": "maschile", "f": "femminile", "n": "neutro", "pl": "plurale"}[k]
            ds = [fm[x] for x in ("m", "f", "n", "pl") if x != k]
            items.append(gram_item(ctx, "adj:%s:%s" % (wid, k), frame, fm[k], ds, "%s: concorda con «%s» (%s)." % (G[wid][0], nit, gname),
                                   "Accorda l'aggettivo «%s» con il nome." % w["stress"], [wid], ["adjectives-agreement"], 2))
    return items

def g_comp(ctx):
    items = []
    if not any(t in ("comparative",) for t in ctx["tags"]):
        return items
    comps = {wid: form(wid, "comp") for wid in W if wid in G and form(wid, "comp")}
    for wid in ctx["nw"]:
        if wid not in comps:
            continue
        others = sorted(x for x in comps if x != wid and plain(comps[x]) != plain(comps[wid]))
        rnd = rng_for(SEED, ctx["id"], wid, "comp")
        rnd.shuffle(others)
        ds = []
        for x in others:
            if comps[x] not in ds:
                ds.append(comps[x])
            if len(ds) == 3:
                break
        items.append(gram_item(ctx, "comp:%s" % wid, "%s → comparativo: ___" % W[wid]["stress"], comps[wid], ds, "Comparativo di «%s» (%s)." % (W[wid]["stress"], G[wid][0]),
                               "Scegli il comparativo giusto.", [wid], ["comparative"], 2))
    return items

def gram_items(ctx):
    items = g_templates(ctx) + g_verbs(ctx) + g_plurals(ctx) + g_adj(ctx) + g_comp(ctx)
    cz, mc = [], []
    for k, it in enumerate(items):
        rnd = rng_for(SEED, ctx["id"], it["ident"], "gram")
        d, seen_p = [], {plain(it["answer"]).lower()}
        for x in it["distractors"]:
            if plain(x).lower() not in seen_p:
                seen_p.add(plain(x).lower())
                d.append(x)
        if len(d) < 2:
            continue
        use_mc = (stable_int(it["ident"]) % 2 == 0)
        est = 14
        if use_mc:
            opts, ci = shuffle_options([it["answer"]] + d[:3], it["answer"], rnd)
            if len(set(opts)) != len(opts):
                continue
            q = "%s — %s" % (it["frame"], it["hint"]) if it["hint"] else it["frame"]
            mc.append(mkex(ctx, "multiple_choice", "gram", it["ident"], it["pts"], it["prompt"],
                           {"type": "multiple_choice", "question": q, "options": opts, "correct": ci}, it["words"], est, it["tags"]))
        else:
            if "___" not in it["frame"]:
                continue
            frame = it["frame"]
            acc = ru_variants(it["answer"])
            if it["answer"][0].isupper():
                acc += [x.lower() for x in acc]
            cz.append(mkex(ctx, "cloze", "gram", it["ident"], it["pts"] + 1, "Completa con la forma corretta.",
                           {"type": "cloze", "text": frame, "answer": it["answer"], "accepted": list(dict.fromkeys(acc)), "hint_it": it["hint"] or it["prompt"]},
                           it["words"], 16, it["tags"]))
    return cz, mc

def stable_int(s):
    return int(stable_hash(s, 6), 16)

# ---------------- abbinamenti
def b_match(ctx):
    out = []
    nw = [w for w in ctx["nw"] if w in G]
    rnd = rng_for(SEED, ctx["id"], "match")
    def mk_pairs(wids, tag):
        pairs, seenit = [], set()
        for w in wids:
            it_ = prim(w)
            if it_.lower() in seenit:
                continue
            seenit.add(it_.lower())
            pairs.append({"ru": W[w]["stress"], "it": it_})
        return pairs
    # gruppi di parole nuove
    sh = list(nw)
    rnd.shuffle(sh)
    groups = [sh[i:i + 4] for i in range(0, len(sh), 4)]
    if len(groups) > 1 and len(groups[-1]) < 3:
        groups[-2] += groups[-1]
        groups.pop()
    for gi, g in enumerate(groups):
        pairs = mk_pairs(g, "w")
        if 3 <= len(pairs) <= 6:
            out.append(mkex(ctx, "match", "w_new", "g%d:%s" % (gi, ",".join(sorted(g))), 0 if len(pairs) <= 4 else 1,
                            "Abbina ogni parola russa al suo significato.", {"type": "match", "pairs": pairs}, g, 12 + 5 * len(pairs)))
    sh2 = list(nw)
    rng_for(SEED, ctx["id"], "match2").shuffle(sh2)
    for gi, g in enumerate([sh2[i:i + 5] for i in range(0, len(sh2), 5)]):
        pairs = mk_pairs(g, "w")
        if 3 <= len(pairs) <= 6:
            out.append(mkex(ctx, "match", "w_new", "h%d:%s" % (gi, ",".join(sorted(g))), 1,
                            "Abbina ogni parola russa al suo significato.", {"type": "match", "pairs": pairs}, g, 12 + 5 * len(pairs)))
    # ripasso: 2-3 parole nuove + 2-3 parole precedenti
    prev = sorted(w for w in ctx["K"] if w in G and w not in nw)
    for ri in range(3):
        if len(nw) >= 2 and len(prev) >= 2:
            r2 = rng_for(SEED, ctx["id"], "rev", ri)
            a = r2.sample(nw, min(3, len(nw)))
            b = r2.sample(prev, min(3, len(prev)))
            g = a + b
            pairs = mk_pairs(g, "r")
            if 3 <= len(pairs) <= 6:
                out.append(mkex(ctx, "match", "w_rev", "r%d:%s" % (ri, ",".join(sorted(g))), 1 if len(pairs) < 6 else 2,
                                "Abbina le parole russe al significato (ripasso).", {"type": "match", "pairs": pairs}, g, 12 + 5 * len(pairs)))
    # frasi
    pool = [s for s in ctx["pool"] if ntok(s) <= 4]
    r3 = rng_for(SEED, ctx["id"], "smatch")
    ps = list(pool)
    r3.shuffle(ps)
    for gi in range(0, len(ps), 4):
        g = ps[gi:gi + 4]
        if len(g) >= 3:
            its = {s["it"].lower() for s in g}
            if len(its) == len(g):
                ws = [w for s in g for w in s["words"]]
                out.append(mkex(ctx, "match", "s_pairs", "sg%d:%s" % (gi, ",".join(sorted(s["id"] for s in g))), 2 if len(g) < 4 else 3,
                                "Abbina ogni frase russa alla sua traduzione.",
                                {"type": "match", "pairs": [{"ru": s["stress"], "it": s["it"]} for s in g]}, ws[:6], 16 + 8 * len(g)))
    return out

# ---------------- dettati
def b_dictation(ctx):
    out = []
    for s in ctx["pool"]:
        n = ntok(s)
        if n > 7:
            continue
        out.append(mkex(ctx, "dictation", "s_dict", s["id"], 1 if n <= 2 else (2 if n <= 4 else 3),
                        "Ascolta e scrivi la frase in russo.",
                        {"type": "dictation", "text": s["stress"], "translation_it": s["it"], "accepted": ru_variants(s["stress"])},
                        s["words"], int(round(12 + 3.5 * n))))
    for wid in ctx["nw"]:
        w = W[wid]
        if wid in G and len(plain(w["ru"])) >= 3:
            out.append(mkex(ctx, "dictation", "w_dict", wid, 0, "Ascolta e scrivi la parola in russo.",
                            {"type": "dictation", "text": w["stress"], "translation_it": prim(wid), "accepted": ru_variants(w["stress"])},
                            [wid], 12))
    return out

# ---------------- alfabeto (lezioni zero 01-06)
def all_letters_upto(lid):
    out = []
    for k in sorted(D.LETTERS):
        out += D.LETTERS[k]
        if k == lid:
            break
    return out

def b_alpha(ctx):
    lid = ctx["id"]
    res = {"translate": [], "cloze": [], "multiple_choice": [], "match": [], "dictation": []}
    nw = [w for w in ctx["nw"]]
    letters = D.LETTERS.get(lid)
    kn = sorted(w for w in ctx["K"] if w not in UNS)
    if letters:
        upto = all_letters_upto(lid)
        sounds_all = sorted({x[2] for x in upto})
        def words_with(letter):
            ls = [w for w in kn if letter.lower() in plain(W[w]["ru"]).lower()]
            ln = [w for w in nw if letter.lower() in plain(W[w]["ru"]).lower()]
            r = (ln + ls)[:2]
            return r or nw[:1]
        for (U, l_, snd, ex) in letters:
            rnd = rng_for(SEED, lid, U, "ls")
            ds = [x for x in sounds_all if x != snd]
            if U in D.LOOKALIKE and D.LOOKALIKE[U] != snd:
                look = [D.LOOKALIKE[U]]
            else:
                look = []
            rnd.shuffle(ds)
            ds = (look + ds)[:3]
            if len(ds) == 3:
                opts, ci = shuffle_options([snd] + ds, snd, rnd)
                q = "Come si legge la lettera «%s %s»?" % (U, l_)
                res["multiple_choice"].append(mkex(ctx, "multiple_choice", "letter_sound", U, 0, "Scegli il suono della lettera.",
                                                   {"type": "multiple_choice", "question": q, "options": opts, "correct": ci}, words_with(U), 10, []))
            # suono -> lettera (solo suoni univoci e con suono reale)
            if "segno" not in snd:
                others = [x for x in upto if x[2] != snd]
                rnd2 = rng_for(SEED, lid, U, "sl")
                rnd2.shuffle(others)
                optsl = ["%s %s" % (U, l_)] + ["%s %s" % (x[0], x[1]) for x in others[:3]]
                opts2, ci2 = shuffle_options(optsl, optsl[0], rnd2)
                res["multiple_choice"].append(mkex(ctx, "multiple_choice", "sound_letter", U, 1, "Scegli la lettera russa che corrisponde al suono.",
                                                   {"type": "multiple_choice", "question": "Quale lettera russa si legge «%s»?" % snd, "options": opts2, "correct": ci2}, words_with(U), 10, []))
        # abbinamento lettere-suono
        lett = [x for x in letters if "segno" not in x[2]]
        rnd = rng_for(SEED, lid, "lm")
        ls_ = list(lett)
        rnd.shuffle(ls_)
        chunks = [ls_[i:i + 4] for i in range(0, len(ls_), 4)]
        if len(chunks) > 1 and len(chunks[-1]) < 3:
            chunks[-2] += chunks[-1]
            chunks.pop()
        for ci_, ch in enumerate(chunks):
            if 3 <= len(ch) <= 6 and len({x[2] for x in ch}) == len(ch):
                res["match"].append(mkex(ctx, "match", "letters", "lm%d:%s" % (ci_, "".join(x[0] for x in ch)), 0,
                                         "Abbina ogni lettera russa al suo suono.",
                                         {"type": "match", "pairs": [{"ru": "%s %s" % (x[0], x[1]), "it": x[2]} for x in ch]},
                                         words_with(ch[0][0]), 12 + 4 * len(ch)))
        # ripasso lettere (cumulativo) se ci sono lettere precedenti
        prev_l = [x for x in upto if x not in letters and "segno" not in x[2]]
        if len(prev_l) >= 2:
            r2 = rng_for(SEED, lid, "lrev")
            g = r2.sample(lett, min(2, len(lett))) + r2.sample(prev_l, min(2, len(prev_l)))
            if len({x[2] for x in g}) == len(g) and len(g) >= 3:
                res["match"].append(mkex(ctx, "match", "letters_rev", "lr:" + "".join(x[0] for x in g), 1,
                                         "Abbina le lettere ai suoni (ripasso).",
                                         {"type": "match", "pairs": [{"ru": "%s %s" % (x[0], x[1]), "it": x[2]} for x in g]},
                                         words_with(g[0][0]), 12 + 4 * len(g)))
        # sillabe (lezioni 1-3)
        if lid in D.SYL_CONS:
            cons, vows = D.SYL_CONS[lid], D.SYL_VOW[lid]
            new = {x[0] for x in letters}
            rnd = rng_for(SEED, lid, "syl")
            allc = "".join(D.SYL_CONS[k] for k in sorted(D.SYL_CONS) if k <= lid)
            allv = "".join(D.SYL_VOW[k] for k in sorted(D.SYL_VOW) if k <= lid)
            syl = []
            for c in allc:
                for v in allv:
                    if c in new or v in new:
                        if c == "Г" and v in "ЕИ":
                            continue
                        syl.append((c, v))
            rnd.shuffle(syl)
            for (c, v) in syl[:6]:
                text = (c + v).lower()
                latin = D.LAT_C[c] + D.LAT_V[v]
                wl = words_with(c if c in new else v)
                res["dictation"].append(mkex(ctx, "dictation", "syllable", c + v, 0, "Ascolta e scrivi la sillaba in russo.",
                                             {"type": "dictation", "text": text[:-1] + text[-1] + "́", "translation_it": "sillaba «%s»" % latin,
                                              "accepted": [text, text[:-1] + text[-1] + "́", text.upper(), (c + v).capitalize()]},
                                             wl, 10))
                opts_s = [text]
                alt = [(c2 + v2).lower() for c2 in allc for v2 in allv if (c2, v2) != (c, v) and (c2 == c or v2 == v)]
                rnd.shuffle(alt)
                alt = alt[:3]
                if len(alt) == 3:
                    o2, ci3 = shuffle_options([text] + alt, text, rnd)
                    res["multiple_choice"].append(mkex(ctx, "multiple_choice", "syllable", c + v, 0, "Scegli la sillaba giusta.",
                                                       {"type": "multiple_choice", "question": "Quale sillaba si legge «%s»?" % latin, "options": o2, "correct": ci3},
                                                       wl, 10))
    # lettura di parole (tutte le lezioni zero 1-6)
    cand = [w for w in kn if W[w].get("translit") and W[w]["pos"] != "phrase"]
    for wid in nw:
        if wid in UNS:
            continue
        w = W[wid]
        tr = w["translit"]
        acc = [tr, plain(tr), tr.lower(), plain(tr).lower()]
        # accento acuto/grave alternativo
        acc.append(tr.replace("̀", "́"))
        res["translate"].append(mkex(ctx, "translate", "read", wid, 1, "Leggi la parola russa e scrivila con lettere italiane (come si pronuncia).",
                                     {"type": "translate", "direction": "ru_it", "source": w["stress"], "answer": tr, "accepted": list(dict.fromkeys(acc))},
                                     [wid], 12))
        rnd = rng_for(SEED, ctx["id"], wid, "read")
        others = [x for x in cand if x != wid and W[x]["translit"] != tr and abs(len(plain(W[x]["ru"])) - len(plain(w["ru"]))) <= 2]
        others = sorted(set(others))
        rnd.shuffle(others)
        dd, seen = [], {tr}
        for x in others:
            t = W[x]["translit"]
            if t not in seen:
                seen.add(t)
                dd.append(t)
            if len(dd) == 3:
                break
        if len(dd) == 3:
            opts, ci = shuffle_options([tr] + dd, tr, rnd)
            res["multiple_choice"].append(mkex(ctx, "multiple_choice", "read", wid, 1, "Scegli la lettura giusta della parola.",
                                               {"type": "multiple_choice", "question": "Come si legge «%s»?" % plain(w["ru"]), "options": opts, "correct": ci},
                                               [wid], 12))
        # cloze: lettera mancante
        ru_ = plain(w["ru"])
        if len(ru_) >= 3 and " " not in ru_ and "-" not in ru_:
            lettersset = {x[1] for x in all_letters_upto(lid)} if lid in D.LETTERS else set()
            idxs = [i for i, ch in enumerate(ru_) if ch.lower() in lettersset and ch.lower() in "".join(x[1] for x in D.LETTERS.get(lid, []))] or \
                   [i for i, ch in enumerate(ru_) if ch.lower() in lettersset]
            if idxs and ru_.lower().count(ru_[idxs[0]].lower()) >= 1:
                i = idxs[stable_int(wid) % len(idxs)]
                ch = ru_[i]
                # la lettera deve comparire una sola volta per essere univoca
                if ru_.lower().count(ch.lower()) == 1:
                    text = ru_[:i] + "___" + ru_[i + 1:]
                    hint = "%s, si legge «%s»" % (prim(wid), tr) if wid in G else "si legge «%s»" % tr
                    res["cloze"].append(mkex(ctx, "cloze", "letter", wid, 1, "Completa la parola con la lettera mancante.",
                                             {"type": "cloze", "text": text, "answer": ch, "accepted": list(dict.fromkeys([ch, ch.lower(), ch.upper()])), "hint_it": hint},
                                             [wid], 12))
    # abbinamento parola - lettura
    pw = [w for w in nw if W[w].get("translit")]
    rnd = rng_for(SEED, lid, "wread")
    rnd.shuffle(pw)
    for gi in range(0, len(pw), 4):
        g = pw[gi:gi + 4]
        if len(g) >= 3 and len({W[x]["translit"] for x in g}) == len(g):
            res["match"].append(mkex(ctx, "match", "w_read", "wr%d:%s" % (gi, ",".join(sorted(g))), 1, "Abbina ogni parola russa alla sua lettura.",
                                     {"type": "match", "pairs": [{"ru": W[x]["stress"], "it": W[x]["translit"]} for x in g]}, g, 12 + 5 * len(g)))
    # accento: su quale vocale cade l'accento
    for wid in nw + [x for x in kn if x not in nw][:0]:
        w = W[wid]
        ru_ = plain(w["ru"])
        vs = [i for i, ch in enumerate(ru_.lower()) if ch in "аеёиоуыэюя"]
        if len(vs) >= 3 and " " not in ru_:
            st = w["stress"]
            # posizione vocale accentata
            pos = None
            for j, ch in enumerate(st):
                if ch == "́":
                    prev = st[:j].replace("́", "")
                    pos = len(prev) - 1
            if pos is None and "ё" in ru_:
                pos = ru_.index("ё")
            if pos is None or pos not in vs:
                continue
            k = vs.index(pos)
            names = ["1ª vocale", "2ª vocale", "3ª vocale", "4ª vocale"]
            opts = names[:min(4, len(vs))]
            if len(opts) >= 3:
                res["multiple_choice"].append(mkex(ctx, "multiple_choice", "stress", wid, 2, "Individua la vocale accentata.",
                                                   {"type": "multiple_choice", "question": "Nella parola «%s» su quale vocale cade l'accento?" % ru_, "options": opts, "correct": k},
                                                   [wid], 13, ["stress-mark"]))
    return res

def b_l6(ctx):
    res = {"multiple_choice": [], "match": []}
    for i, (q, ans, ds, wid) in enumerate(D.L6_MC):
        rnd = rng_for(SEED, ctx["id"], "l6", i)
        opts, ci = shuffle_options([ans] + ds, ans, rnd)
        res["multiple_choice"].append(mkex(ctx, "multiple_choice", "l6", "l6mc%d" % i, 2, "Scegli la risposta giusta su accento e pronuncia.",
                                           {"type": "multiple_choice", "question": q, "options": opts, "correct": ci}, [wid], 15, ["vowel-reduction"]))
    items = list(D.L6_MATCH)
    rnd = rng_for(SEED, ctx["id"], "l6m")
    rnd.shuffle(items)
    for gi, ch in enumerate([items[:3], items[3:6]]):
        res["match"].append(mkex(ctx, "match", "l6", "l6m%d" % gi, 2, "Abbina la parola russa alla sua pronuncia reale.",
                                 {"type": "match", "pairs": [{"ru": a, "it": b} for a, b, _ in ch]}, [c for _, _, c in ch], 30, ["vowel-reduction"]))
    return res

# ================================================================ selezione
SUB_ORDER = {
    "translate": ["read", "w_ru_it", "s_ru_it", "w_it_ru", "s_it_ru"],
    "cloze": ["gram", "s_cloze", "letter"],
    "multiple_choice": ["gram", "letter_sound", "sound_letter", "l6", "read", "syllable", "s_ru_it", "w_ru_it", "gender", "s_it_ru", "w_it_ru", "stress"],
    "match": ["letters", "letters_rev", "w_read", "l6", "w_new", "s_pairs", "w_rev"],
    "dictation": ["syllable", "s_dict", "w_dict"],
}
MINS = {"translate": 4, "cloze": 3, "multiple_choice": 3, "match": 2, "dictation": 2}

def caps(ctx):
    n = len(ctx["nw"])
    alpha = ctx["level"] == "zero" and ctx["order"] <= 6
    return {"translate": 6 + n // 3, "cloze": 5 + n // 3, "multiple_choice": 5 + n // 3,
            "match": 5 + n // 4 if not alpha else 5 + n // 5, "dictation": 5 + n // 3}

SEEN_SIG = set()

def sig_of(c):
    return (c["type"], json.dumps(c["payload"], sort_keys=True, ensure_ascii=False))

def select(ctx, typ, cands):
    cap = max(caps(ctx)[typ], MINS[typ])
    groups = collections.OrderedDict()
    for sub in SUB_ORDER[typ]:
        groups[sub] = []
    for c in cands:
        groups.setdefault(c["_sub"], []).append(c)
    for sub, lst in groups.items():
        r = rng_for(SEED, ctx["id"], typ, sub, "sel")
        lst.sort(key=lambda c: c["_ident"])
        r.shuffle(lst)
    chosen, used = [], set()
    while len(chosen) < cap:
        progress = False
        for sub, lst in groups.items():
            while lst and len(chosen) < cap:
                c = lst.pop(0)
                k = (c["_sub"], c["_ident"])
                if k in used or sig_of(c) in SEEN_SIG:
                    continue
                used.add(k)
                SEEN_SIG.add(sig_of(c))
                chosen.append(c)
                progress = True
                break
        if not progress:
            break
    return chosen

def finalize(ctx, c):
    global next_id
    p = c["payload"]
    w = [x for x in c["words"] if x in W]
    topics = topics_for(ctx, w)
    tags = list(dict.fromkeys(list(ctx["tags"]) + c["_tags"]))
    key = "%s|%s|%s|%s" % (ctx["id"], c["type"], c["_sub"], c["_ident"])
    if key not in registry:
        registry[key] = "e_%06d" % next_id
        next_id += 1
    est = clip(int(round(c["_est"])), 10, 45)
    return {
        "id": registry[key], "type": c["type"], "level": ctx["level"], "difficulty": diff_for(ctx, c["_pts"]),
        "topics": topics, "grammar_tags": tags, "words": w, "lesson": ctx["id"], "est_seconds": est,
        "prompt_it": c["prompt_it"], "payload": p, "qa_status": "pending",
    }

def main():
    allx = []
    for l in L:
        ctx = CTX[l["id"]]
        alpha = ctx["level"] == "zero" and ctx["order"] <= 6
        cand = {t: [] for t in MINS}
        cand["translate"] += b_word_translate(ctx) + b_sent_translate(ctx)
        cand["cloze"] += b_sent_cloze(ctx)
        cand["multiple_choice"] += b_sent_mc(ctx) + b_word_mc(ctx) + b_gender_mc(ctx)
        cand["match"] += b_match(ctx)
        cand["dictation"] += b_dictation(ctx)
        cz, mc = gram_items(ctx)
        cand["cloze"] += cz
        cand["multiple_choice"] += mc
        if alpha:
            a = b_alpha(ctx)
            for t, lst in a.items():
                cand[t] += lst
        if ctx["id"] == "l_zero_06":
            a = b_l6(ctx)
            for t, lst in a.items():
                cand[t] += lst
        chosen = []
        for t in ["translate", "cloze", "multiple_choice", "match", "dictation"]:
            chosen += select(ctx, t, cand[t])
        covered = {w for c in chosen for w in c["words"]}
        for wid in ctx["nw"]:
            if wid not in covered and wid in G:
                for c in cand["translate"] + cand["multiple_choice"]:
                    if c["words"] == [wid] and c["_sub"] in ("w_ru_it", "w_it_ru") and sig_of(c) not in SEEN_SIG:
                        SEEN_SIG.add(sig_of(c))
                        chosen.append(c)
                        covered.add(wid)
                        break
        out = [finalize(ctx, c) for c in chosen]
        json.dump(out, open(os.path.join(OUT, l["id"] + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        allx += out
    with open(REG, "w", encoding="utf-8") as f:
        for k in sorted(registry, key=lambda k: registry[k]):
            f.write("%s\t%s\n" % (k, registry[k]))
    print("scritti", len(allx), "esercizi")

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    main()
